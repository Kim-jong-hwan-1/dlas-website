"use client";

import { useEffect, useMemo, useState } from "react";
import type React from "react";
import Image from "next/image";
import Script from "next/script";
import { useLang } from "@/components/LanguageWrapper";
import PageLayout from "@/components/PageLayout";
import MouseLight from "@/components/MouseLight";

// ---------------------------------------------
// Local types to avoid global Window conflicts
// ---------------------------------------------
type TossPaymentsFn = (clientKey: string) => {
  requestPayment: (
    paymentMethod: "카드" | "CARD" | string,
    options: {
      amount: number;
      orderId: string;
      orderName: string;
      customerEmail: string;
      successUrl: string;
      failUrl: string;
      customerName?: string;
      [key: string]: unknown;
    }
  ) => Promise<void>;
};

type PaddleSDK = {
  Environment?: { set: (env: string) => void };
  Initialize: (config: {
    token: string;
    checkout?: { settings?: { displayMode?: string; locale?: string } };
  }) => void;
  Checkout: {
    open: (
      options:
        | {
            priceId: string;
            quantity?: number;
            customer: { email: string };
            customData?: Record<string, any>;
            discountCode?: string;
            closeCallback?: () => void;
          }
        | {
            items: { priceId: string; quantity?: number }[];
            customer: { email: string };
            customData?: Record<string, any>;
            discountCode?: string;
            closeCallback?: () => void;
          }
    ) => void;
  };
};

interface MyWindow extends Window {
  TossPayments?: TossPaymentsFn;
  Paddle?: PaddleSDK;
}

/* ─────────────────────────────────────────────
   공통 닫기 버튼
───────────────────────────────────────────────*/
function CloseButton({
  onClick,
  className = "",
  label = "Close",
}: {
  onClick: () => void;
  className?: string;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`fixed right-3 sm:right-4 z-[9999] h-11 w-11 rounded-full
                  bg-black/90 text-white shadow-lg border border-black/10
                  flex items-center justify-center
                  hover:bg-black active:scale-95
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2
                  transition pointer-events-auto ${className}`}
      style={{
        top: "max(0.5rem, env(safe-area-inset-top))",
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
      }}
    >
      <span aria-hidden className="text-2xl leading-none">×</span>
    </button>
  );
}

/*───────────────────────────────────────────────────
  만료일 포매터 – 9999‑12‑31 ➜ Unlimited
────────────────────────────────────────────────────*/
const formatExpiration = (raw?: string) => {
  if (!raw) return { display: null, debug: "empty" } as const;
  if (raw.startsWith("9999-12-31"))
    return { display: "Unlimited", debug: null } as const;

  const m = raw.match(/^(\d{4}-\d{2}-\d{2})(?:[T\s](\d{2}):(\d{2}))/);
  if (!m) return { display: null, debug: "unrecognised format" } as const;

  const [, ymd, hh, mm] = m;
  if (!hh) return { display: ymd, debug: null } as const;

  const d = new Date(raw);
  if (isNaN(d.getTime())) return { display: null, debug: "invalid date" } as const;

  const p = (n: number) => `${n}`.padStart(2, "0");
  const utc = `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(
    d.getUTCDate()
  )} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
  return { display: utc, debug: null } as const;
};

// --------------------------------
// Paddle 환경/토큰/priceId 상수 정의
// --------------------------------
const isSandbox = process.env.NEXT_PUBLIC_PADDLE_ENV === "sandbox";

const PADDLE_TOKEN = isSandbox
  ? process.env.NEXT_PUBLIC_PADDLE_TOKEN_SB!
  : process.env.NEXT_PUBLIC_PADDLE_TOKEN!;

const PADDLE_PRICE_ID = isSandbox
  ? process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_SB!
  : process.env.NEXT_PUBLIC_PADDLE_PRICE_ID!;

// ─────────────────────────────────────────────
// 가격/표시 관련
// ─────────────────────────────────────────────
const LIFETIME_PRICE_KRW = 770_000;
const LIFETIME_PRICE_USD = 770; // $770
const USD_TO_KRW = 1000;
const MODULE_PRICES_USD: Record<string, number> = {
  "1WEEK": 19,
  "1MONTH": 49,
  "1YEAR": 290,
  "LIFETIME": 770,
};

const usdToKrw = (usd: number) => usd * USD_TO_KRW;

const isKoreanUser = (country?: string) =>
  country &&
  (country.toUpperCase() === "KR" ||
  ["korea", "south korea", "republic of korea", "대한민국", "한국"].some((kw) =>
    country.toLowerCase().includes(kw)
  ));

const isKrwDisplay = (country?: string) => !country || isKoreanUser(country);

const priceLabel = (period: string, country?: string) => {
  if (period === "LIFETIME") {
    if (isKrwDisplay(country)) return `₩${LIFETIME_PRICE_KRW.toLocaleString()}`;
    return `$${LIFETIME_PRICE_USD}`;
  }
  const usd = MODULE_PRICES_USD[period];
  const krwStr = `₩${usdToKrw(usd).toLocaleString()}`;
  if (isKrwDisplay(country)) return krwStr;
  return `$${usd}`;
};

const asDisplayPrice = (usdNumber: number, country?: string) => {
  const krwStr = `₩${Math.round(usdToKrw(usdNumber)).toLocaleString()}`;
  if (isKrwDisplay(country)) return krwStr;
  return `$${usdNumber.toLocaleString()}`;
};

/* ─────────────────────────────────────────────
   할인 로직
───────────────────────────────────────────────*/
const DISCOUNT_FACTOR = 0.7;
const MODULE_DISCOUNT_LEVELS: Record<string, 0 | 1 | 2> = {
  "3_transfer_jig_maker": 0,
  "e_transfer_jig_maker": 0,
  "exo_abutment_editor": 0,
  "stl_classifier": 0,
  "stl_to_html": 1,
  "stl_to_image": 2,
};

const roundToManWon = (krw: number) => Math.round(krw / 10_000) * 10_000;

const discountedKrwByLevel = (baseKrw: number, level: 0 | 1 | 2) => {
  let v = baseKrw;
  for (let i = 0; i < level; i++) {
    v = roundToManWon(v * DISCOUNT_FACTOR);
  }
  return v;
};

const priceLabelForModule = (
  mod: string,
  period: "1WEEK" | "1MONTH" | "1YEAR" | "LIFETIME",
  country?: string
) => {
  const level = MODULE_DISCOUNT_LEVELS[mod] ?? 0;

  if (period === "LIFETIME") {
    if (isKrwDisplay(country)) {
      const base = LIFETIME_PRICE_KRW;
      const finalKrw = level > 0 ? discountedKrwByLevel(base, level) : base;
      return `₩${finalKrw.toLocaleString()}`;
    } else {
      let usd = LIFETIME_PRICE_USD;
      if (level >= 1) usd = Math.round(usd * DISCOUNT_FACTOR);
      if (level >= 2) usd = Math.round(usd * DISCOUNT_FACTOR);
      return `$${usd.toLocaleString()}`;
    }
  }

  const baseUsd = MODULE_PRICES_USD[period];
  const baseKrw = usdToKrw(baseUsd);

  if (isKrwDisplay(country)) {
    const finalKrw = level > 0 ? discountedKrwByLevel(baseKrw, level) : baseKrw;
    return `₩${finalKrw.toLocaleString()}`;
  } else {
    let usd = baseUsd;
    if (level >= 1) usd = Math.round(usd * DISCOUNT_FACTOR);
    if (level >= 2) usd = Math.round(usd * DISCOUNT_FACTOR);
    return `$${usd.toLocaleString()}`;
  }
};

// 세미나 가격
const SEMINAR_PRICES: Record<number, number> = {
  1: 220000,
  2: 374000,
  3: 495000,
  4: 660000,
  5: 825000,
  6: 990000,
};

// 모듈 목록
const modules = [
  "3_transfer_jig_maker",
  "e_transfer_jig_maker",
  "exo_abutment_editor",
  "stl_classifier",
  "stl_to_html",
  "stl_to_image",
];

// 모듈 가격 ID (Paddle)
const MODULE_PRICE_IDS: Record<string, Record<string, string>> = {
  "Transfer Jig Maker": {
    "1WEEK": "pri_01k1jcsv5cg66tjnv05qhtwknh",
    "1MONTH": "pri_01k1jcs60js4d1khk87qsczcgh",
    "1YEAR": "pri_01k1jcptq639s6r3npgyphtk4p",
    "LIFETIME": "",
  },
  "STL Classifier": {
    "1WEEK": "pri_01k1dhdhev3zdv3dme6veyd9ab",
    "1MONTH": "pri_01k1dhetmhg867gkdkj75mv4pn",
    "1YEAR": "pri_01k1dhh3b4dfm1r191y6zk1xmh",
    "LIFETIME": "",
  },
  "HTML Viewer Converter": {
    "1WEEK": "pri_01k1dhm7x23g8nn3tpcmswjq14",
    "1MONTH": "pri_01k1dhn95p99rbc3y5n4yg3ke1",
    "1YEAR": "pri_01k1dhnxpaj49197qw7chmpe60",
    "LIFETIME": "",
  },
  "Image Converter": {
    "1WEEK": "pri_01k1dhsg4gwyzycar6cggsm93j",
    "1MONTH": "pri_01k1dhtxxwyaqt63bx9wfgttfa",
    "1YEAR": "pri_01k1dhwbb0yvngp04ggzna166w",
    "LIFETIME": "",
  },
  "Abutment Editor": {
    "1WEEK": "",
    "1MONTH": "",
    "1YEAR": "",
    "LIFETIME": "",
  },
  "Wing Exo Jig": {
    "1WEEK": "",
    "1MONTH": "",
    "1YEAR": "",
    "LIFETIME": "",
  },
  "Fuser": {
    "1WEEK": "pri_01k1dj6060dp3nba0x7kqxj5aj",
    "1MONTH": "pri_01k1dj6qjawp143jjbwbac779c",
    "1YEAR": "pri_01k1dj77nyhzgpg2terfwwd9pd",
    "LIFETIME": "",
  },
};

export default function BuyPage() {
  const { t, lang } = useLang();

  // 한국어인지 확인
  const isKorean = lang === 'kr';

  // 한국 구매 페이지 선택 상태 (null: 초기 버튼 표시, automation/fastEditor: 해당 결제 표시)
  const [activeTab, setActiveTab] = useState<'automation' | 'fastEditor' | null>(null);

  // 로딩 애니메이션 상태
  const [showWhiteScreen, setShowWhiteScreen] = useState(true);
  const [bgPhase, setBgPhase] = useState<'clear' | 'blurring' | 'blurred'>('clear');

  useEffect(() => {
    const whiteTimer = setTimeout(() => setShowWhiteScreen(false), 100);
    const blurTimer = setTimeout(() => setBgPhase('blurring'), 200);
    const blurredTimer = setTimeout(() => setBgPhase('blurred'), 800);
    return () => {
      clearTimeout(whiteTimer);
      clearTimeout(blurTimer);
      clearTimeout(blurredTimer);
    };
  }, []);

  // 토큰 상태
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    const stored = localStorage.getItem("DLAS_TOKEN");
    if (stored) setToken(stored);
  }, []);

  // 로그인 상태 관리
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userID, setUserID] = useState("");

  useEffect(() => {
    const storedIsLoggedIn = localStorage.getItem("isLoggedIn");
    const storedExpireTime = localStorage.getItem("loginExpireTime");

    if (storedIsLoggedIn === "true" && storedExpireTime) {
      const expireTime = parseInt(storedExpireTime, 10);
      if (Date.now() < expireTime) {
        setIsLoggedIn(true);
        const storedID = localStorage.getItem("userID");
        if (storedID) setUserID(storedID);
      } else {
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("loginExpireTime");
        localStorage.removeItem("userID");
      }
    }
  }, []);

  // 사용자 정보
  const [userInfo, setUserInfo] = useState<{
    name?: string;
    id?: string;
    country?: string;
    phone?: string;
    email?: string;
    licenseStatus?: string;
    module_licenses?: { [key: string]: string };
  }>({});

  const [isUserInfoLoading, setIsUserInfoLoading] = useState(false);

  // IP 기반 국가 정보 (결제 시스템 결정용)
  const [ipCountry, setIpCountry] = useState<string>("");

  // IP 기반 국가 정보 로드 (DLAS_COUNTRY 쿠키에서)
  useEffect(() => {
    const getCookie = (name: string): string | null => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
      return null;
    };
    const country = getCookie('DLAS_COUNTRY');
    if (country) {
      setIpCountry(country);
    }
  }, []);

  // 결제용 국가 (한국어 페이지면 항상 KR, 아니면 IP 기반)
  const paymentCountry = isKorean ? "KR" : (ipCountry || "");

  // 국가 정보 로드 (레거시 - localStorage)
  useEffect(() => {
    try {
      const lc = localStorage.getItem("DLAS_USER_COUNTRY");
      if (lc) setUserInfo((prev) => ({ ...prev, country: lc }));
    } catch {}
  }, []);

  // 라이선스 정보 조회
  const fetchLicenseInfo = async (accessToken: string) => {
    try {
      const res = await fetch(
        "https://license-server-697p.onrender.com/admin/my-license",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (!res.ok) throw new Error("Failed to fetch license info");
      const data = await res.json();
      setUserInfo((prev) => ({
        ...prev,
        licenseStatus: data.licenseStatus ?? prev.licenseStatus,
        module_licenses:
          data.module_licenses &&
          typeof data.module_licenses === "object" &&
          !Array.isArray(data.module_licenses)
            ? data.module_licenses
            : prev.module_licenses,
      }));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchLicenseInfo(token);
    }
  }, [token]);

  // 사용자 정보 조회
  const fetchUserInfo = async (email: string) => {
    try {
      setIsUserInfoLoading(true);
      const res = await fetch(
        `https://license-server-697p.onrender.com/admin/userinfo?email=${email}`
      );
      if (!res.ok) throw new Error("Failed to fetch user info");
      const data = await res.json();
      setUserInfo({
        name: data.name,
        id: data.id,
        country: data.country,
        phone: data.phone,
        email: data.email,
        licenseStatus: data.licenseStatus,
      });
    } catch (error) {
      console.error(error);
      setUserInfo({
        name: "-",
        id: email,
        country: "-",
        phone: "-",
        email: "-",
        licenseStatus: "Error fetching license",
      });
    } finally {
      setIsUserInfoLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      const storedID = localStorage.getItem("userID");
      if (storedID && !userInfo.id) {
        fetchUserInfo(storedID);
      }
    }
  }, [isLoggedIn]);

  // Toss 콜백 처리
  type TossIntentType = "module" | "family" | "seminar" | "package";
  type TossStatus = "success" | "fail";

  const [tossModalOpen, setTossModalOpen] = useState(false);
  const [tossApproveState, setTossApproveState] =
    useState<"idle" | "requesting" | "ok" | "fail">("idle");
  const [tossErrText, setTossErrText] = useState<string>("");

  const [tossPayload, setTossPayload] = useState<{
    status: TossStatus;
    type: TossIntentType;
    paymentKey: string;
    orderId: string;
    amount: number;
    orderName?: string;
    module?: string;
    period?: string;
    packageType?: string;
    userEmail?: string;
    code?: string;
    message?: string;
  } | null>(null);

  // URL 파라미터 파싱
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);

    const provider = p.get("provider");
    const paymentKey = p.get("paymentKey");
    const orderId = p.get("orderId") ?? "";
    const amountStr = p.get("amount") ?? "";
    const type = (p.get("type") as TossIntentType) || "module";
    const mod = p.get("mod") ?? undefined;
    const period = p.get("period") ?? undefined;
    const orderName = p.get("orderName") ?? undefined;
    const packageType = p.get("package") ?? undefined;

    const failCode = p.get("code");
    const failMsg = p.get("message");

    if (provider === "toss" && (paymentKey || failCode)) {
      if (paymentKey) {
        setTossPayload({
          status: "success",
          type,
          paymentKey,
          orderId,
          amount: Number(amountStr || "0"),
          orderName,
          module: mod,
          period,
          packageType,
          userEmail: localStorage.getItem("userID") || undefined,
        });
      } else {
        setTossPayload({
          status: "fail",
          type,
          paymentKey: "",
          orderId,
          amount: Number(amountStr || "0"),
          module: mod,
          period,
          packageType,
          orderName,
          code: failCode || undefined,
          message: failMsg || undefined,
          userEmail: localStorage.getItem("userID") || undefined,
        });
      }
      setTossModalOpen(true);
    }
  }, []);

  const clearTossQuery = () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("provider");
      url.searchParams.delete("paymentKey");
      url.searchParams.delete("orderId");
      url.searchParams.delete("amount");
      url.searchParams.delete("type");
      url.searchParams.delete("mod");
      url.searchParams.delete("period");
      url.searchParams.delete("orderName");
      url.searchParams.delete("code");
      url.searchParams.delete("message");
      window.history.replaceState({}, "", url.toString());
    } catch {}
  };

  const requestServerApproval = async () => {
    if (!tossPayload || tossPayload.status !== "success") return;
    setTossApproveState("requesting");
    setTossErrText("");
    try {
      const body = {
        provider: "toss",
        paymentKey: tossPayload.paymentKey,
        orderId: tossPayload.orderId,
        amount: tossPayload.amount,
        type: tossPayload.type,
        module: tossPayload.module,
        period: tossPayload.period,
        packageType: tossPayload.packageType,
        orderName: tossPayload.orderName,
        userEmail: tossPayload.userEmail,
      };

      const res = await fetch(
        "https://license-server-697p.onrender.com/payments/toss/confirm",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Server approval failed");
      }

      setTossApproveState("ok");
      if (token) await fetchLicenseInfo(token);
    } catch (err: any) {
      setTossApproveState("fail");
      setTossErrText(err?.message || String(err));
    }
  };

  // Paddle 상태
  const [paddleReady, setPaddleReady] = useState(false);

  // 쿠폰 관련 상태
  const [moduleCoupons, setModuleCoupons] = useState<Record<string, string>>({});
  const [moduleCouponApplied, setModuleCouponApplied] = useState<Record<string, boolean>>({});
  const [permanentCoupon, setPermanentCoupon] = useState("");
  const [permanentCouponApplied, setPermanentCouponApplied] = useState(false);
  const [familyCoupon, setFamilyCoupon] = useState("");
  const [familyCouponApplied, setFamilyCouponApplied] = useState(false);

  // 쿠폰 검증
  const validateModuleCoupon = (couponCode: string): boolean => {
    return couponCode.trim() === "01035836042";
  };

  const applyModuleCoupon = (module: string) => {
    const code = moduleCoupons[module] || "";
    if (validateModuleCoupon(code)) {
      setModuleCouponApplied({ ...moduleCouponApplied, [module]: true });
      alert("쿠폰이 적용되었습니다! 50% 할인된 가격으로 결제됩니다.");
    } else {
      setModuleCouponApplied({ ...moduleCouponApplied, [module]: false });
      alert("유효하지 않은 쿠폰 코드입니다.");
    }
  };

  const applyPermanentCoupon = () => {
    if (validateModuleCoupon(permanentCoupon)) {
      setPermanentCouponApplied(true);
      alert("쿠폰이 적용되었습니다! 50% 할인된 가격으로 결제됩니다.");
    } else {
      setPermanentCouponApplied(false);
      alert("유효하지 않은 쿠폰 코드입니다.");
    }
  };

  const applyFamilyCoupon = () => {
    if (validateModuleCoupon(familyCoupon)) {
      setFamilyCouponApplied(true);
      alert("쿠폰이 적용되었습니다! 50% 할인된 가격으로 결제됩니다.");
    } else {
      setFamilyCouponApplied(false);
      alert("유효하지 않은 쿠폰 코드입니다.");
    }
  };

  // 약관 동의 모달
  const [showTermsConsentModal, setShowTermsConsentModal] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<{
    type: "module" | "permanent" | "family" | "family50" | "fastEditor";
    module?: string;
    period?: string;
    couponApplied?: boolean;
  } | null>(null);
  const [termsConsent1, setTermsConsent1] = useState(false);
  const [termsConsent2, setTermsConsent2] = useState(false);
  const [termsConsent3, setTermsConsent3] = useState(false);

  const currentOrigin = useMemo(() => {
    if (typeof window === "undefined") return "https://www.dlas.io";
    return window.location.origin;
  }, []);

  // 모듈 결제 핸들러
  const handleModulePayment = (mod: string, period: string) => {
    const storedId = localStorage.getItem("userID") || userID;
    if (!storedId) {
      alert("Please log in first.");
      return;
    }

    if (!paymentCountry || paymentCountry.trim() === "") {
      alert(t("buyPage.countryNotLoaded"));
      return;
    }

    const isCouponApplied = moduleCouponApplied[mod] || false;
    setPendingPayment({ type: "module", module: mod, period, couponApplied: isCouponApplied });
    setTermsConsent1(false);
    setTermsConsent2(false);
    setTermsConsent3(false);
    setShowTermsConsentModal(true);
  };

  // FAST EDITOR 결제 핸들러
  const handleFastEditorPayment = (period: string) => {
    const storedId = localStorage.getItem("userID") || userID;
    if (!storedId) {
      alert("Please log in first.");
      return;
    }

    setPendingPayment({ type: "fastEditor", period });
    setTermsConsent1(false);
    setTermsConsent2(false);
    setTermsConsent3(false);
    setShowTermsConsentModal(true);
  };

  // 약관 동의 후 결제 진행
  const proceedWithPayment = () => {
    if (!pendingPayment) return;

    // 비한국 사용자는 준비중 알림
    if (!isKrwDisplay(paymentCountry)) {
      alert(t("buyPage.comingSoon"));
      setShowTermsConsentModal(false);
      setPendingPayment(null);
      return;
    }

    const { type, module: mod, period, couponApplied } = pendingPayment;
    const storedId = localStorage.getItem("userID") || userID;

    setShowTermsConsentModal(false);
    setPendingPayment(null);

    // Permanent 라이센스 결제
    if (type === "permanent") {
      if (typeof window === "undefined" || !(window as MyWindow).TossPayments) {
        alert("결제 모듈이 아직 로드되지 않았습니다. 페이지를 새로고침해주세요.");
        return;
      }

      const tossClientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!;
      const tossInit = (window as MyWindow).TossPayments;
      if (!tossInit) {
        alert("결제 모듈이 아직 로드되지 않았습니다.");
        return;
      }
      const tossPayments = tossInit(tossClientKey);

      const orderId = `DLAS-PERMANENT-${Date.now()}`;
      let amount = 2200000;

      if (permanentCouponApplied) {
        amount = Math.floor(amount * 0.5);
      }

      const orderName = "DLAS Permanent License";

      const successUrl =
        `${currentOrigin}/buy?provider=toss&type=permanent&orderName=${encodeURIComponent(
          orderName
        )}` +
        `&orderId=${encodeURIComponent(orderId)}&amount=${encodeURIComponent(
          String(amount)
        )}`;
      const failUrl = `${currentOrigin}/buy?provider=toss&type=permanent&status=fail`;

      tossPayments.requestPayment("CARD", {
        amount,
        orderId,
        orderName,
        customerEmail: storedId,
        customerName: userInfo && userInfo.name ? userInfo.name : storedId,
        successUrl,
        failUrl,
      });
      return;
    }

    // Family 라이센스 결제
    if (type === "family") {
      if (typeof window === "undefined" || !(window as MyWindow).TossPayments) {
        alert("The payment module has not been loaded yet.");
        return;
      }

      const tossClientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!;
      const tossInit = (window as MyWindow).TossPayments;
      if (!tossInit) {
        alert("The payment module has not been loaded yet.");
        return;
      }
      const tossPayments = tossInit(tossClientKey);

      const orderId = `DLAS-FAMILY-${Date.now()}`;
      let amount = 3850000;

      if (familyCouponApplied) {
        amount = Math.floor(amount * 0.5);
      }

      const orderName = "DLAS Family License";

      const successUrl =
        `${currentOrigin}/buy?provider=toss&type=family&orderName=${encodeURIComponent(
          orderName
        )}` +
        `&orderId=${encodeURIComponent(orderId)}&amount=${encodeURIComponent(
          String(amount)
        )}`;
      const failUrl = `${currentOrigin}/buy?provider=toss&type=family`;

      tossPayments.requestPayment("CARD", {
        amount,
        orderId,
        orderName,
        customerEmail: storedId,
        customerName: userInfo && userInfo.name ? userInfo.name : storedId,
        successUrl,
        failUrl,
      });
      return;
    }

    // Family 50% 할인 결제
    if (type === "family50") {
      if (typeof window === "undefined" || !(window as MyWindow).TossPayments) {
        alert("The payment module has not been loaded yet.");
        return;
      }

      const tossClientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!;
      const tossInit = (window as MyWindow).TossPayments;
      if (!tossInit) {
        alert("The payment module has not been loaded yet.");
        return;
      }
      const tossPayments = tossInit(tossClientKey);

      const orderId = `DLAS-FAMILY50-${Date.now()}`;
      const amount = Math.floor(3850000 * 0.5);

      const orderName = "DLAS Family License (50% Discount)";

      const successUrl =
        `${currentOrigin}/buy?provider=toss&type=family&orderName=${encodeURIComponent(
          orderName
        )}` +
        `&orderId=${encodeURIComponent(orderId)}&amount=${encodeURIComponent(
          String(amount)
        )}`;
      const failUrl = `${currentOrigin}/buy?provider=toss&type=family`;

      tossPayments.requestPayment("CARD", {
        amount,
        orderId,
        orderName,
        customerEmail: storedId,
        customerName: userInfo && userInfo.name ? userInfo.name : storedId,
        successUrl,
        failUrl,
      });
      return;
    }

    // FAST EDITOR 결제 (라이센스 9번)
    if (type === "fastEditor") {
      if (typeof window === "undefined" || !(window as MyWindow).TossPayments) {
        alert("결제 모듈이 아직 로드되지 않았습니다. 페이지를 새로고침해주세요.");
        return;
      }

      const tossClientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!;
      const tossInit = (window as MyWindow).TossPayments;
      if (!tossInit) {
        alert("결제 모듈이 아직 로드되지 않았습니다.");
        return;
      }
      const tossPayments = tossInit(tossClientKey);

      if (!period) return;

      // FAST EDITOR 가격 (기존 모듈과 동일)
      let amount: number;
      if (period === "LIFETIME") {
        amount = LIFETIME_PRICE_KRW; // 770,000원
      } else {
        const baseUsd = MODULE_PRICES_USD[period as keyof typeof MODULE_PRICES_USD];
        amount = usdToKrw(baseUsd);
      }

      const orderId = `DLAS-FASTEDITOR-${Date.now()}`;
      const orderName = `FAST EDITOR (${period})`;

      const successUrl =
        `${currentOrigin}/buy?provider=toss&type=module&mod=fast_editor&period=${encodeURIComponent(period)}` +
        `&orderName=${encodeURIComponent(orderName)}&orderId=${encodeURIComponent(orderId)}&amount=${encodeURIComponent(String(amount))}`;
      const failUrl = `${currentOrigin}/buy?provider=toss&type=module&mod=fast_editor&period=${encodeURIComponent(period)}`;

      tossPayments.requestPayment("CARD", {
        amount,
        orderId,
        orderName,
        customerEmail: storedId,
        customerName: userInfo && userInfo.name ? userInfo.name : storedId,
        successUrl,
        failUrl,
      });
      return;
    }

    // 모듈 라이센스 결제 (한국 사용자)
    if (isKrwDisplay(paymentCountry)) {
      if (typeof window === "undefined" || !(window as MyWindow).TossPayments) {
        alert("결제 모듈이 아직 로드되지 않았습니다. 페이지를 새로고침해주세요.");
        return;
      }

      const tossClientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!;
      const tossInit = (window as MyWindow).TossPayments;
      if (!tossInit) {
        alert("결제 모듈이 아직 로드되지 않았습니다.");
        return;
      }
      const tossPayments = tossInit(tossClientKey);

      if (!mod || !period) return;
      const level = MODULE_DISCOUNT_LEVELS[mod] ?? 0;
      let amount: number;

      if (period === "LIFETIME") {
        const base = LIFETIME_PRICE_KRW;
        amount = level > 0 ? discountedKrwByLevel(base, level) : base;
      } else {
        const baseUsd = MODULE_PRICES_USD[period as keyof typeof MODULE_PRICES_USD];
        const baseKrw = usdToKrw(baseUsd);
        amount = level > 0 ? discountedKrwByLevel(baseKrw, level) : baseKrw;
      }

      if (couponApplied) {
        amount = Math.floor(amount * 0.5);
      }

      const orderId = `DLAS-MODULE-${mod}-${Date.now()}`;
      const orderName = `${mod} (${period})`;

      const successUrl =
        `${currentOrigin}/buy?provider=toss&type=module&mod=${encodeURIComponent(mod)}&period=${encodeURIComponent(period)}` +
        `&orderName=${encodeURIComponent(orderName)}&orderId=${encodeURIComponent(orderId)}&amount=${encodeURIComponent(String(amount))}`;
      const failUrl = `${currentOrigin}/buy?provider=toss&type=module&mod=${encodeURIComponent(mod)}&period=${encodeURIComponent(period)}`;

      tossPayments.requestPayment("CARD", {
        amount,
        orderId,
        orderName,
        customerEmail: storedId,
        customerName: userInfo && userInfo.name ? userInfo.name : storedId,
        successUrl,
        failUrl,
      });
      return;
    }

    // 비한국 사용자 -> 준비중 알림
    alert(t("buyPage.comingSoon"));
  };

  // Permanent 라이센스 결제
  const handlePermanentLicensePayment = () => {
    const storedIsLoggedIn = localStorage.getItem("isLoggedIn");
    if (!isLoggedIn && storedIsLoggedIn !== "true") {
      alert("로그인이 필요합니다. 먼저 로그인해주세요.");
      return;
    }

    if (isUserInfoLoading) {
      alert("Loading your information... Please try again shortly.");
      return;
    }
    if (userInfo.licenseStatus === "permanent") {
      alert("You already have a Permanent License.");
      return;
    }

    setPendingPayment({ type: "permanent" });
    setTermsConsent1(false);
    setTermsConsent2(false);
    setTermsConsent3(false);
    setShowTermsConsentModal(true);
  };

  // Family 라이센스 결제
  const handleFamilyLicensePayment = () => {
    const storedIsLoggedIn = localStorage.getItem("isLoggedIn");
    if (!isLoggedIn && storedIsLoggedIn !== "true") {
      alert("로그인이 필요합니다. 먼저 로그인해주세요.");
      return;
    }

    if (isUserInfoLoading) {
      alert("Loading your information... Please try again shortly.");
      return;
    }
    if (userInfo.licenseStatus === "family") {
      alert("You are already a Family user. Payment is not possible.");
      return;
    }

    setPendingPayment({ type: "family" });
    setTermsConsent1(false);
    setTermsConsent2(false);
    setTermsConsent3(false);
    setShowTermsConsentModal(true);
  };

  // Family 50% 할인 결제 (특정 사용자 전용)
  const handleFamilyLicensePayment50 = () => {
    const storedIsLoggedIn = localStorage.getItem("isLoggedIn");
    if (!isLoggedIn && storedIsLoggedIn !== "true") {
      alert("로그인이 필요합니다. 먼저 로그인해주세요.");
      return;
    }

    if (isUserInfoLoading) {
      alert("Loading your information... Please try again shortly.");
      return;
    }
    if (userInfo.licenseStatus === "family") {
      alert("You are already a Family user. Payment is not possible.");
      return;
    }

    setPendingPayment({ type: "family50" });
    setTermsConsent1(false);
    setTermsConsent2(false);
    setTermsConsent3(false);
    setShowTermsConsentModal(true);
  };

  // 세미나 결제
  const handleSeminarPayment = (persons: number) => {
    const storedId = localStorage.getItem("userID") || userID;
    if (!storedId) {
      alert("로그인이 필요합니다.");
      return;
    }

    if (typeof window === "undefined" || !(window as MyWindow).TossPayments) {
      alert("결제 모듈이 아직 로드되지 않았습니다. 페이지를 새로고침해주세요.");
      return;
    }

    const tossClientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!;
    const tossInit = (window as MyWindow).TossPayments;
    if (!tossInit) {
      alert("결제 모듈이 아직 로드되지 않았습니다.");
      return;
    }
    const tossPayments = tossInit(tossClientKey);

    const amount = SEMINAR_PRICES[persons] || 220000;
    const orderId = `DLAS-SEMINAR-${persons}P-${Date.now()}`;
    const orderName = `DLAS 세미나 (${persons}인)`;

    const successUrl =
      `${currentOrigin}/buy?provider=toss&type=seminar&orderName=${encodeURIComponent(orderName)}&orderId=${encodeURIComponent(orderId)}&amount=${encodeURIComponent(String(amount))}&period=2WEEK`;
    const failUrl = `${currentOrigin}/buy?provider=toss&type=seminar&status=fail`;

    tossPayments.requestPayment("CARD", {
      amount,
      orderId,
      orderName,
      customerEmail: storedId,
      customerName: userInfo && userInfo.name ? userInfo.name : storedId,
      successUrl,
      failUrl,
    });
  };

  // 패키지 결제
  const handlePackagePayment = (packageType: "3" | "E") => {
    const storedId = localStorage.getItem("userID") || userID;
    if (!storedId) {
      alert("로그인이 필요합니다.");
      return;
    }

    if (typeof window === "undefined" || !(window as MyWindow).TossPayments) {
      alert("결제 모듈이 아직 로드되지 않았습니다. 페이지를 새로고침해주세요.");
      return;
    }

    const tossClientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!;
    const tossInit = (window as MyWindow).TossPayments;
    if (!tossInit) {
      alert("결제 모듈이 아직 로드되지 않았습니다.");
      return;
    }
    const tossPayments = tossInit(tossClientKey);

    const amount = 1100000;
    const orderId = `DLAS-PKG-${packageType}-${Date.now()}`;
    const orderName = packageType === "3" ? "3 Package (3 Transfer Jig + STL Classifier)" : "E Package (E Transfer Jig + STL Classifier)";

    const successUrl =
      `${currentOrigin}/buy?provider=toss&type=package&package=${packageType}&orderName=${encodeURIComponent(orderName)}&orderId=${encodeURIComponent(orderId)}&amount=${encodeURIComponent(String(amount))}`;
    const failUrl = `${currentOrigin}/buy?provider=toss&type=package&status=fail`;

    tossPayments.requestPayment("CARD", {
      amount,
      orderId,
      orderName,
      customerEmail: storedId,
      customerName: userInfo && userInfo.name ? userInfo.name : storedId,
      successUrl,
      failUrl,
    });
  };

  // 모달 ESC 닫기
  const anyModalOpen = tossModalOpen || showTermsConsentModal;

  useEffect(() => {
    if (!anyModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (tossModalOpen) {
          setTossModalOpen(false);
          clearTossQuery();
          return;
        }
        if (showTermsConsentModal) {
          setShowTermsConsentModal(false);
          setPendingPayment(null);
          return;
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.documentElement.style.overflow = prevOverflow;
    };
  }, [anyModalOpen, tossModalOpen, showTermsConsentModal]);

  // 모듈 정보
  const MODULE_NAME_TO_ID: Record<string, string> = {
    "3_transfer_jig_maker": "1",
    "e_transfer_jig_maker": "4",
    "exo_abutment_editor": "3",
    "stl_classifier": "2",
    "stl_to_html": "5",
    "stl_to_image": "6",
  };

  const info: Record<
    string,
    { gif: string | null; youtube: string | null; image: string | null; descKey: string; pdfPage?: number; startTime?: number; comingSoon?: boolean }
  > = {
    "3_transfer_jig_maker": {
      gif: "/gifs/transferjig.gif",
      youtube: "5_kXuMsFdXY",
      image: "/modules/3_transfer_jig_maker.png",
      descKey: "buyPage.module1Desc",
      pdfPage: 10,
      startTime: 127,
    },
    "e_transfer_jig_maker": {
      gif: "/gifs/transferjig.gif",
      youtube: "4HxD16Tr2mg",
      image: "/modules/e_transfer_jig_maker.png",
      descKey: "buyPage.module2Desc",
      pdfPage: 10,
      startTime: 127,
    },
    "exo_abutment_editor": {
      gif: "/gifs/abutment_editor.gif",
      youtube: "0yr50UK9-Z0",
      image: "/modules/exo_abutment_editor.png",
      descKey: "buyPage.module3Desc",
      pdfPage: 14,
      startTime: 159,
    },
    "stl_classifier": {
      gif: "/gifs/stl_classifier.gif",
      youtube: "OCSzCMdLvyY",
      image: "/modules/stl_classifier.png",
      descKey: "buyPage.module4Desc",
      pdfPage: 18,
      startTime: 201,
    },
    "stl_to_html": {
      gif: "/gifs/stl_to_html.gif",
      youtube: "cMuSQO5zKt8",
      image: "/modules/stl_to_html.png",
      descKey: "buyPage.module5Desc",
      pdfPage: 6,
      startTime: 88,
    },
    "stl_to_image": {
      gif: "/gifs/stl_to_image.gif",
      youtube: "tnUM0i6RRG8",
      image: "/modules/stl_to_image.png",
      descKey: "buyPage.module6Desc",
      pdfPage: 1,
      startTime: 17,
    },
  };

  // 모듈 카드 렌더링
  const moduleCards = modules.map((mod) => {
    const { gif, youtube, image, descKey, pdfPage, startTime, comingSoon } =
      info[mod] ?? { gif: null, youtube: null, image: null, descKey: "", pdfPage: undefined, startTime: undefined, comingSoon: false };
    const description = descKey ? t(descKey) : "";
    const moduleId = MODULE_NAME_TO_ID[mod];
    let expireUtc: string | null = null;
    if (
      userInfo &&
      userInfo.module_licenses &&
      typeof userInfo.module_licenses === "object" &&
      !Array.isArray(userInfo.module_licenses) &&
      moduleId
    ) {
      const raw = userInfo.module_licenses[moduleId];
      if (typeof raw === "string" && raw.trim()) {
        expireUtc = raw;
      }
    }
    const { display: expireDisplay } = formatExpiration(expireUtc ?? undefined);

    return (
      <div
        key={mod}
        className="relative bg-black/10 backdrop-blur-xl rounded-2xl border border-white/10 px-2 py-8
                   flex flex-col sm:flex-row items-center h-auto sm:h-80 sm:min-h-[320px] sm:max-h-[320px] gap-6
                   hover:bg-black/15 hover:border-[#fde68a]/30 transition-all duration-500"
        style={{ boxShadow: '0 0 30px rgba(255, 255, 255, 0.08)' }}
        onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 40px rgba(253, 230, 138, 0.25), 0 0 80px rgba(253, 230, 138, 0.15)'}
        onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 0 30px rgba(255, 255, 255, 0.08)'}
      >
        {/* 모바일 */}
        <div className="flex flex-col w-full sm:hidden items-center">
          <div className="w-full flex items-center justify-center mb-2">
            {image ? (
              <Image
                src={image}
                alt={mod}
                width={288}
                height={72}
                className="object-contain max-h-[72px]"
                priority
              />
            ) : (
              <span className="text-2xl font-extrabold px-4 break-words text-white">
                {mod}
              </span>
            )}
          </div>
          {description && (
            <div className="w-full px-4 mb-4">
              <p className="text-sm text-white/70 text-center mb-2">
                {description}
              </p>
              {pdfPage && (
                <button
                  onClick={() => window.open(`/module-guide.pdf#page=${pdfPage}`, '_blank')}
                  className="text-xs text-white/50 hover:text-white/70 underline"
                >
                  {t("buyPage.viewDetail")}
                </button>
              )}
            </div>
          )}
          <div className="w-full h-56 aspect-video border border-white/20 rounded-2xl bg-black/30 overflow-hidden flex items-center justify-center mb-4">
            {youtube ? (
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${youtube}`}
                title={`${mod} demo`}
                frameBorder={0}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <span className="text-white/50 text-2xl font-bold flex items-center justify-center w-full h-full">
                Coming&nbsp;Soon
              </span>
            )}
          </div>
          <div className="flex flex-col w-full items-center gap-2">
            <div className="flex flex-row w-full justify-center items-center gap-2">
              <button
                className="bg-black/30 border border-white/10 text-white rounded-lg w-1/3 h-12 text-base font-semibold flex flex-col items-center justify-center transition-all duration-300 hover:bg-black/50 hover:border-white/20"
                onClick={() => comingSoon ? alert(t("buyPage.comingSoon")) : handleModulePayment(mod, "1WEEK")}
              >
                <span className="text-lg leading-5">{t("buyPage.week1")}</span>
                <span className="text-xs leading-5">
                  {comingSoon ? t("buyPage.comingSoon") : priceLabelForModule(mod, "1WEEK", paymentCountry)}
                </span>
              </button>
              <button
                className="bg-black/30 border border-white/10 text-white rounded-lg w-1/3 h-12 text-base font-semibold flex flex-col items-center justify-center transition-all duration-300 hover:bg-black/50 hover:border-white/20"
                onClick={() => comingSoon ? alert(t("buyPage.comingSoon")) : handleModulePayment(mod, "1MONTH")}
              >
                <span className="text-lg leading-5">{t("buyPage.month1")}</span>
                <span className="text-xs leading-5">
                  {comingSoon ? t("buyPage.comingSoon") : priceLabelForModule(mod, "1MONTH", paymentCountry)}
                </span>
              </button>
              <button
                className="bg-black/30 border border-white/10 text-white rounded-lg w-1/3 h-12 text-base font-semibold flex flex-col items-center justify-center transition-all duration-300 hover:bg-black/50 hover:border-white/20"
                onClick={() => comingSoon ? alert(t("buyPage.comingSoon")) : handleModulePayment(mod, "1YEAR")}
              >
                <span className="text-lg leading-5">{t("buyPage.year1")}</span>
                <span className="text-xs leading-5">
                  {comingSoon ? t("buyPage.comingSoon") : priceLabelForModule(mod, "1YEAR", paymentCountry)}
                </span>
              </button>
            </div>
            <button
              className="bg-black/30 border border-white/10 text-white rounded-lg w-full h-12 text-base font-semibold flex flex-col items-center justify-center transition-all duration-300 hover:bg-black/50 hover:border-white/20"
              onClick={() => comingSoon ? alert(t("buyPage.comingSoon")) : handleModulePayment(mod, "LIFETIME")}
            >
              <span className="text-lg leading-5">{t("buyPage.lifetime")}</span>
              <span className="text-xs leading-5">
                {comingSoon ? t("buyPage.comingSoon") : priceLabelForModule(mod, "LIFETIME", paymentCountry)}
              </span>
            </button>
          </div>
        </div>
        {/* 데스크탑 */}
        <div className="hidden sm:flex flex-row items-center w-full h-full gap-6">
          <div className="w-64 h-full flex-shrink-0 flex flex-col items-center justify-center">
            {image ? (
              <Image
                src={image}
                alt={mod}
                width={288}
                height={72}
                className="object-contain max-h-[72px] mb-3"
                priority
              />
            ) : (
              <span className="text-2xl sm:text-3xl font-extrabold px-4 break-words mb-3 text-white">
                {mod}
              </span>
            )}
            {description && (
              <div className="w-full px-2">
                <p className="text-sm text-white/70 text-center mb-2">
                  {description}
                </p>
                {pdfPage && (
                  <button
                    onClick={() => window.open(`/module-guide.pdf#page=${pdfPage}`, '_blank')}
                    className="text-xs text-white/50 hover:text-white/70 underline block mx-auto"
                  >
                    {t("buyPage.viewDetail")}
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="w-72 h-72 flex items-center justify-center flex-shrink-0">
            <div className="w-72 h-72 flex items-center justify-center border border-white/20 rounded-2xl bg-black/30 overflow-hidden">
              {gif ? (
                <Image
                  src={gif}
                  alt={`${mod} gif`}
                  width={288}
                  height={288}
                  className="object-contain w-full h-full"
                  priority
                />
              ) : (
                <span className="text-white/50 text-2xl font-bold flex items-center justify-center w-full h-full">
                  Coming&nbsp;Soon
                </span>
              )}
            </div>
          </div>
          <div className="flex-1 h-72 flex items-center justify-center min-w-0">
            <div className="w-full h-72 aspect-video border border-white/20 rounded-2xl bg-black/30 overflow-hidden flex items-center justify-center">
              {youtube ? (
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${youtube}`}
                  title={`${mod} demo`}
                  frameBorder={0}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <span className="text-white/50 text-2xl font-bold flex items-center justify-center w-full h-full">
                  Coming&nbsp;Soon
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-3 w-40 flex-shrink-0 h-full justify-center items-center">
            <button
              className="bg-black/30 border border-white/10 text-white rounded-lg w-32 h-16 text-lg font-semibold flex flex-col items-center justify-center transition-all duration-300 hover:bg-black/50 hover:border-white/20"
              onClick={() => comingSoon ? alert(t("buyPage.comingSoon")) : handleModulePayment(mod, "1WEEK")}
            >
              <span className="text-xl leading-5">{t("buyPage.week1")}</span>
              <span className="text-base leading-5">
                {comingSoon ? t("buyPage.comingSoon") : priceLabelForModule(mod, "1WEEK", paymentCountry)}
              </span>
            </button>
            <button
              className="bg-black/30 border border-white/10 text-white rounded-lg w-32 h-16 text-lg font-semibold flex flex-col items-center justify-center transition-all duration-300 hover:bg-black/50 hover:border-white/20"
              onClick={() => comingSoon ? alert(t("buyPage.comingSoon")) : handleModulePayment(mod, "1MONTH")}
            >
              <span className="text-xl leading-5">{t("buyPage.month1")}</span>
              <span className="text-base leading-5">
                {comingSoon ? t("buyPage.comingSoon") : priceLabelForModule(mod, "1MONTH", paymentCountry)}
              </span>
            </button>
            <button
              className="bg-black/30 border border-white/10 text-white rounded-lg w-32 h-16 text-lg font-semibold flex flex-col items-center justify-center transition-all duration-300 hover:bg-black/50 hover:border-white/20"
              onClick={() => comingSoon ? alert(t("buyPage.comingSoon")) : handleModulePayment(mod, "1YEAR")}
            >
              <span className="text-xl leading-5">{t("buyPage.year1")}</span>
              <span className="text-base leading-5">
                {comingSoon ? t("buyPage.comingSoon") : priceLabelForModule(mod, "1YEAR", paymentCountry)}
              </span>
            </button>
            <button
              className="bg-black/30 border border-white/10 text-white rounded-lg w-32 h-16 text-lg font-semibold flex flex-col items-center justify-center transition-all duration-300 hover:bg-black/50 hover:border-white/20"
              onClick={() => comingSoon ? alert(t("buyPage.comingSoon")) : handleModulePayment(mod, "LIFETIME")}
            >
              <span className="text-xl leading-5">{t("buyPage.lifetime")}</span>
              <span className="text-base leading-5">
                {comingSoon ? t("buyPage.comingSoon") : priceLabelForModule(mod, "LIFETIME", paymentCountry)}
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  });

  // 라이센스 카드
  const licenseCards = (
    <div className="flex flex-col gap-10">
      {/* D.P.L */}
      <div
        className="group relative bg-black/10 backdrop-blur-xl rounded-2xl border border-white/10 p-6 sm:p-10 text-left
                   hover:bg-black/15 hover:border-[#fde68a]/30 transition-all duration-500"
        style={{ boxShadow: '0 0 30px rgba(255, 255, 255, 0.08)' }}
        onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 40px rgba(253, 230, 138, 0.25), 0 0 80px rgba(253, 230, 138, 0.15)'}
        onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 0 30px rgba(255, 255, 255, 0.08)'}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full border border-white/20 bg-black/30 text-white text-xs font-semibold">
                {t("buyPage.dplBadge")}
              </span>
              <h3 className="text-2xl sm:text-3xl font-bold leading-tight text-white">
                {t("buyPage.dplTitle")}
              </h3>
            </div>
            <p className="text-white/60">{t("buyPage.singlePayment")}</p>
            <div className="mt-4 text-3xl sm:text-4xl font-extrabold text-white">
              {t("buyPage.dplPrice")}
            </div>
            <div className="mt-6 text-white/80">
              <p className="font-semibold mb-2">{t("buyPage.dplDesc")}</p>
              <ul className="space-y-1">
                <li>1) <b>{t("buyPage.dplDesc1")}</b></li>
                <li>2) <b>{t("buyPage.dplDesc2")}</b></li>
              </ul>
            </div>
          </div>
          <div className="w-full sm:w-56 flex flex-col gap-2">
            <button
              onClick={handlePermanentLicensePayment}
              className="w-full bg-black/30 border border-white/10 text-white rounded-lg px-6 py-3 font-bold hover:bg-black/50 hover:border-white/20 transition-all duration-300"
            >
              {t("buyPage.payNow")}
            </button>
            <button
              onClick={() => alert(t("buyPage.inquireAlert"))}
              className="flex-1 bg-black/30 border border-white/10 text-white rounded-lg px-6 py-3 font-bold hover:bg-black/50 hover:border-white/20 transition-all duration-300"
            >
              {t("buyPage.inquire")}
            </button>
          </div>
        </div>
      </div>

      {/* D.F.L */}
      <div
        className="group relative bg-black/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6 sm:p-10 text-left
                   hover:bg-black/15 hover:border-[#fde68a]/40 transition-all duration-500"
        style={{ boxShadow: '0 0 50px rgba(255, 255, 255, 0.15), 0 0 80px rgba(255, 255, 255, 0.08)' }}
        onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 60px rgba(253, 230, 138, 0.35), 0 0 100px rgba(253, 230, 138, 0.2)'}
        onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 0 50px rgba(255, 255, 255, 0.15), 0 0 80px rgba(255, 255, 255, 0.08)'}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full border border-white/30 bg-white/10 text-white text-xs font-semibold">
                {t("buyPage.dflBadge")}
              </span>
              <h3 className="text-2xl sm:text-3xl font-bold leading-tight text-white">
                {t("buyPage.dflTitle")}
              </h3>
            </div>
            <p className="text-white/60">{t("buyPage.singlePayment")}</p>
            <div className="mt-4 text-3xl sm:text-4xl font-extrabold text-white">
              {t("buyPage.dflPrice")}
            </div>

            <div className="mt-6 text-white/80">
              <p className="font-semibold mb-2">{t("buyPage.dflDesc")}</p>
              <div className="bg-white/5 border border-white/20 rounded-lg p-3 mb-4">
                <p className="text-white/90 text-sm leading-relaxed">
                  {t("buyPage.dflHighlight1")}<br />
                  {t("buyPage.dflHighlight2")}<br />
                  <b className="text-white">{t("buyPage.dflHighlight3")}</b>
                </p>
              </div>
              <ul className="space-y-1">
                <li>1) <b>{t("buyPage.dflDesc1")}</b></li>
                <li>2) <b>{t("buyPage.dflDesc2")}</b></li>
                <li>3) {t("buyPage.dflDesc3")}</li>
              </ul>
            </div>
          </div>

          <div className="w-full sm:w-56 flex flex-col gap-2">
            <button
              onClick={handleFamilyLicensePayment}
              className="w-full bg-black/30 border border-white/10 text-white rounded-lg px-6 py-3 font-bold hover:bg-black/50 hover:border-white/20 transition-all duration-300"
            >
              {t("buyPage.payNow")}
            </button>
            {(userID === "km5030" || userID === "113311") && (
              <button
                onClick={handleFamilyLicensePayment50}
                className="w-full bg-black/30 border border-white/10 text-white rounded-lg px-6 py-3 font-bold hover:bg-black/50 hover:border-white/20 transition-all duration-300"
              >
                50% Discount (₩1,925,000)
              </button>
            )}
            <button
              onClick={() => alert(t("buyPage.inquireAlert"))}
              className="flex-1 bg-black/30 border border-white/10 text-white rounded-lg px-6 py-3 font-bold hover:bg-black/50 hover:border-white/20 transition-all duration-300"
            >
              {t("buyPage.inquire")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Paddle Billing v2 SDK */}
      <Script
        src="https://cdn.paddle.com/paddle/v2/paddle.js"
        strategy="afterInteractive"
        onLoad={() => {
          try {
            if (!(window as MyWindow).Paddle) {
              console.error("window.Paddle undefined");
              return;
            }
            if (isSandbox && (window as MyWindow).Paddle && (window as MyWindow).Paddle!.Environment) {
              (window as MyWindow).Paddle!.Environment!.set("sandbox");
            }
            (window as MyWindow).Paddle!.Initialize({
              token: PADDLE_TOKEN,
              checkout: { settings: { displayMode: "overlay", locale: "ko" } },
            });
            setPaddleReady(true);
          } catch (err) {
            console.error("Paddle init failed:", err);
          }
        }}
      />

      {/* TossPayments SDK */}
      <Script src="https://js.tosspayments.com/v1" strategy="afterInteractive" />

      {/* 화이트 스크린 전환 효과 */}
      {showWhiteScreen && (
        <div
          className="fixed inset-0 z-[9998] bg-white pointer-events-none"
          style={{ animation: 'fadeOut 0.8s ease-out forwards' }}
        />
      )}

      <PageLayout showUI={bgPhase !== 'clear'} showBackground={false}>
        {/* Fixed Background Image */}
        <div className="fixed inset-0 z-[1]">
          <Image
            src="/background/3.png"
            alt="Background"
            fill
            className={`object-cover transition-all ${bgPhase === 'clear' ? 'blur-0' : 'blur-[3px]'}`}
            style={{ transitionDuration: '0.8s' }}
            priority
          />
          <div
            className={`absolute inset-0 bg-black transition-opacity ${bgPhase === 'clear' ? 'opacity-0' : 'opacity-40'}`}
            style={{ transitionDuration: '0.8s' }}
          />
        </div>

        {/* 마우스를 따라다니는 빛 효과 */}
        {bgPhase !== 'clear' && <MouseLight />}

        {/* 구매 섹션 */}
        <section className={`relative transition-all duration-500 ${
          isKorean && activeTab === null
            ? 'min-h-[80vh] flex flex-col items-center justify-center py-20'
            : 'py-20 min-h-screen'
        }`}>
          <div
            className={`relative z-10 transition-all duration-500 ease-out ${
              isKorean && activeTab === null
                ? 'text-center'
                : 'max-w-6xl mx-auto px-4'
            }`}
            style={{
              opacity: bgPhase !== 'clear' ? 1 : 0,
              transform: bgPhase !== 'clear' ? 'translateY(0)' : 'translateY(20px)',
            }}
          >
            <h2 className="text-4xl font-bold mb-12 text-center text-white">{t("nav.buy")}</h2>

            <div className="flex flex-col gap-y-16 w-full">
              {/* 한국어: 버튼 선택 UI / 해외: FAST EDITOR만 표시 */}
              {isKorean ? (
                activeTab === null ? (
                  /* 초기 화면: 다운로드 페이지처럼 두 버튼 표시 (중앙 정렬) */
                  <div className="flex flex-col sm:flex-row justify-center gap-6 sm:gap-12 w-full px-4">
                    <button
                      onClick={() => setActiveTab('automation')}
                      className="bg-black/10 backdrop-blur-xl border border-white/10 rounded-2xl px-14 py-8
                                 text-white text-xl font-semibold text-center
                                 hover:bg-black/15 hover:border-[#fde68a]/30 transition-all duration-500"
                      style={{ boxShadow: '0 0 30px rgba(255, 255, 255, 0.08)' }}
                      onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 40px rgba(253, 230, 138, 0.25), 0 0 80px rgba(253, 230, 138, 0.15)'}
                      onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 0 30px rgba(255, 255, 255, 0.08)'}
                    >
                      {t("buyPage.automationModules") || "자동화 모듈"}
                    </button>
                    <button
                      onClick={() => setActiveTab('fastEditor')}
                      className="bg-black/10 backdrop-blur-xl border border-white/10 rounded-2xl px-14 py-8
                                 text-white text-xl font-semibold text-center
                                 hover:bg-black/15 hover:border-[#fde68a]/30 transition-all duration-500"
                      style={{ boxShadow: '0 0 30px rgba(255, 255, 255, 0.08)' }}
                      onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 40px rgba(253, 230, 138, 0.25), 0 0 80px rgba(253, 230, 138, 0.15)'}
                      onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 0 30px rgba(255, 255, 255, 0.08)'}
                    >
                      FAST EDITOR
                    </button>
                  </div>
                ) : activeTab === 'automation' ? (
                  <>
                    {/* 뒤로가기 버튼 */}
                    <div className="flex justify-center mb-8">
                      <button
                        onClick={() => setActiveTab(null)}
                        className="bg-black/10 backdrop-blur-xl border border-white/10 rounded-2xl px-10 py-5
                                   text-white text-lg font-semibold
                                   hover:bg-black/15 hover:border-[#fde68a]/30 transition-all duration-500
                                   inline-flex items-center gap-3"
                        style={{ boxShadow: '0 0 30px rgba(255, 255, 255, 0.08)' }}
                        onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 40px rgba(253, 230, 138, 0.25), 0 0 80px rgba(253, 230, 138, 0.15)'}
                        onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 0 30px rgba(255, 255, 255, 0.08)'}
                      >
                        <span>←</span>
                        <span>{t("common.back") || "뒤로가기"}</span>
                      </button>
                    </div>
                    {moduleCards}
                    {licenseCards}
                  </>
                ) : (
                  <>
                    {/* 뒤로가기 버튼 */}
                    <div className="flex justify-center mb-8">
                      <button
                        onClick={() => setActiveTab(null)}
                        className="bg-black/10 backdrop-blur-xl border border-white/10 rounded-2xl px-10 py-5
                                   text-white text-lg font-semibold
                                   hover:bg-black/15 hover:border-[#fde68a]/30 transition-all duration-500
                                   inline-flex items-center gap-3"
                        style={{ boxShadow: '0 0 30px rgba(255, 255, 255, 0.08)' }}
                        onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 40px rgba(253, 230, 138, 0.25), 0 0 80px rgba(253, 230, 138, 0.15)'}
                        onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 0 30px rgba(255, 255, 255, 0.08)'}
                      >
                        <span>←</span>
                        <span>{t("common.back") || "뒤로가기"}</span>
                      </button>
                    </div>
                    {/* FAST EDITOR 카드 */}
                    <div
                      className="relative bg-black/10 backdrop-blur-xl rounded-2xl border border-white/10 p-6 sm:p-10
                                 hover:bg-black/15 hover:border-[#fde68a]/30 transition-all duration-500"
                      style={{ boxShadow: '0 0 30px rgba(255, 255, 255, 0.08)' }}
                      onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 40px rgba(253, 230, 138, 0.25), 0 0 80px rgba(253, 230, 138, 0.15)'}
                      onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 0 30px rgba(255, 255, 255, 0.08)'}
                    >
                      <div className="flex flex-col items-center text-center">
                        <div className="flex items-center gap-3 mb-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full border border-white/30 bg-white/10 text-white text-xs font-semibold">
                            NEW
                          </span>
                          <h3 className="text-3xl sm:text-4xl font-bold text-white">FAST EDITOR</h3>
                        </div>
                        <p className="text-white/70 mb-8 max-w-2xl">
                          {t("buyPage.fastEditorDesc") || "빠르고 효율적인 STL 편집 도구"}
                        </p>

                        {/* 가격 버튼들 */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-2xl">
                          <button
                            onClick={() => handleFastEditorPayment("1WEEK")}
                            className="bg-black/30 border border-white/10 text-white rounded-lg px-4 py-4 font-semibold flex flex-col items-center justify-center transition-all duration-300 hover:bg-black/50 hover:border-white/20"
                          >
                            <span className="text-lg">{t("buyPage.week1")}</span>
                            <span className="text-sm text-[#c4b5fd]">₩19,000</span>
                          </button>
                          <button
                            onClick={() => handleFastEditorPayment("1MONTH")}
                            className="bg-black/30 border border-white/10 text-white rounded-lg px-4 py-4 font-semibold flex flex-col items-center justify-center transition-all duration-300 hover:bg-black/50 hover:border-white/20"
                          >
                            <span className="text-lg">{t("buyPage.month1")}</span>
                            <span className="text-sm text-[#c4b5fd]">₩49,000</span>
                          </button>
                          <button
                            onClick={() => handleFastEditorPayment("1YEAR")}
                            className="bg-black/30 border border-white/10 text-white rounded-lg px-4 py-4 font-semibold flex flex-col items-center justify-center transition-all duration-300 hover:bg-black/50 hover:border-white/20"
                          >
                            <span className="text-lg">{t("buyPage.year1")}</span>
                            <span className="text-sm text-[#c4b5fd]">₩290,000</span>
                          </button>
                          <button
                            onClick={() => handleFastEditorPayment("LIFETIME")}
                            className="bg-black/30 border border-white/10 text-white rounded-lg px-4 py-4 font-semibold flex flex-col items-center justify-center transition-all duration-300 hover:bg-black/50 hover:border-white/20"
                          >
                            <span className="text-lg">{t("buyPage.lifetime")}</span>
                            <span className="text-sm text-[#c4b5fd]">₩770,000</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )
              ) : (
                /* 해외: FAST EDITOR만 표시 */
                <div
                  className="relative bg-black/10 backdrop-blur-xl rounded-2xl border border-white/10 p-6 sm:p-10
                             hover:bg-black/15 hover:border-[#fde68a]/30 transition-all duration-500"
                  style={{ boxShadow: '0 0 30px rgba(255, 255, 255, 0.08)' }}
                  onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 40px rgba(253, 230, 138, 0.25), 0 0 80px rgba(253, 230, 138, 0.15)'}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 0 30px rgba(255, 255, 255, 0.08)'}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full border border-white/30 bg-white/10 text-white text-xs font-semibold">
                        NEW
                      </span>
                      <h3 className="text-3xl sm:text-4xl font-bold text-white">FAST EDITOR</h3>
                    </div>
                    <p className="text-white/70 mb-8 max-w-2xl">
                      {t("buyPage.fastEditorDesc") || "Fast and efficient STL editing tool"}
                    </p>

                    {/* 가격 버튼들 (해외 - USD) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-2xl">
                      <button
                        onClick={() => handleFastEditorPayment("1WEEK")}
                        className="bg-black/30 border border-white/10 text-white rounded-lg px-4 py-4 font-semibold flex flex-col items-center justify-center transition-all duration-300 hover:bg-black/50 hover:border-white/20"
                      >
                        <span className="text-lg">{t("buyPage.week1")}</span>
                        <span className="text-sm text-[#c4b5fd]">$19</span>
                      </button>
                      <button
                        onClick={() => handleFastEditorPayment("1MONTH")}
                        className="bg-black/30 border border-white/10 text-white rounded-lg px-4 py-4 font-semibold flex flex-col items-center justify-center transition-all duration-300 hover:bg-black/50 hover:border-white/20"
                      >
                        <span className="text-lg">{t("buyPage.month1")}</span>
                        <span className="text-sm text-[#c4b5fd]">$49</span>
                      </button>
                      <button
                        onClick={() => handleFastEditorPayment("1YEAR")}
                        className="bg-black/30 border border-white/10 text-white rounded-lg px-4 py-4 font-semibold flex flex-col items-center justify-center transition-all duration-300 hover:bg-black/50 hover:border-white/20"
                      >
                        <span className="text-lg">{t("buyPage.year1")}</span>
                        <span className="text-sm text-[#c4b5fd]">$290</span>
                      </button>
                      <button
                        onClick={() => handleFastEditorPayment("LIFETIME")}
                        className="bg-black/30 border border-white/10 text-white rounded-lg px-4 py-4 font-semibold flex flex-col items-center justify-center transition-all duration-300 hover:bg-black/50 hover:border-white/20"
                      >
                        <span className="text-lg">{t("buyPage.lifetime")}</span>
                        <span className="text-sm text-[#c4b5fd]">$770</span>
                      </button>
                    </div>

                    <p className="mt-6 text-white/50 text-sm">
                      {t("buyPage.comingSoon") || "Payment coming soon"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </PageLayout>

      {/* Toss 결제 결과 모달 */}
      {tossModalOpen && tossPayload && (
        <div
          className="fixed inset-0 z-[200] bg-black/50 overflow-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setTossModalOpen(false);
              clearTossQuery();
            }
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex min-h-full items-start justify-center px-6 py-10">
            <div
              className="bg-white p-6 rounded-xl shadow-xl w-full max-w-[760px] relative"
              onClick={(e) => e.stopPropagation()}
            >
              <CloseButton
                onClick={() => {
                  setTossModalOpen(false);
                  clearTossQuery();
                }}
                label="Toss 결제 결과 닫기"
              />

              {tossPayload.status === "success" ? (
                <>
                  <h3 className="text-2xl font-bold mb-2">Toss 결제 성공 (승인 전)</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    결제 정보가 수신되었습니다. 아래 <b>승인요청</b>을 누르면 서버가 Toss에 결제 승인을 요청합니다.
                  </p>

                  <div className="bg-gray-50 border rounded p-4 text-sm mb-4">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <div><b>Status</b></div>
                      <div>success (승인 전)</div>
                      {tossPayload.module && (
                        <>
                          <div><b>Module</b></div>
                          <div>{tossPayload.module}</div>
                        </>
                      )}
                      {tossPayload.period && (
                        <>
                          <div><b>Period</b></div>
                          <div>{tossPayload.period}</div>
                        </>
                      )}
                      {tossPayload.orderName && (
                        <>
                          <div><b>OrderName</b></div>
                          <div>{tossPayload.orderName}</div>
                        </>
                      )}
                      <div><b>OrderId</b></div>
                      <div className="break-all">{tossPayload.orderId}</div>
                      <div><b>PaymentKey</b></div>
                      <div className="break-all">{tossPayload.paymentKey}</div>
                      <div><b>Amount</b></div>
                      <div>{tossPayload.amount.toLocaleString()}원</div>
                      {tossPayload.userEmail && (
                        <>
                          <div><b>User</b></div>
                          <div>{tossPayload.userEmail}</div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      className="bg-black text-white px-6 py-2 rounded hover:bg-gray-800 transition disabled:opacity-50"
                      disabled={tossApproveState === "requesting"}
                      onClick={requestServerApproval}
                    >
                      {tossApproveState === "requesting"
                        ? "승인 요청 중..."
                        : tossApproveState === "ok"
                        ? "승인 완료"
                        : tossApproveState === "fail"
                        ? "승인 실패. 재시도"
                        : "서버에 승인요청"}
                    </button>
                    <button
                      className="px-4 py-2 border rounded hover:bg-gray-50"
                      onClick={() => {
                        try {
                          const payload = JSON.stringify(tossPayload, null, 2);
                          navigator.clipboard.writeText(payload);
                          alert("결제 데이터가 복사되었습니다.");
                        } catch {}
                      }}
                    >
                      데이터 복사
                    </button>
                  </div>

                  {tossApproveState === "ok" && (
                    <p className="mt-3 text-green-700 text-sm">
                      서버 승인 성공. 잠시 후 MY 정보/라이선스가 갱신됩니다.
                    </p>
                  )}
                  {tossApproveState === "fail" && (
                    <p className="mt-3 text-red-600 text-sm break-words">
                      서버 승인 실패: {tossErrText}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <h3 className="text-2xl font-bold mb-2">Toss 결제 실패</h3>
                  <div className="bg-gray-50 border rounded p-4 text-sm mb-4">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <div><b>Status</b></div>
                      <div>fail</div>
                      {tossPayload.code && (
                        <>
                          <div><b>Code</b></div>
                          <div>{tossPayload.code}</div>
                        </>
                      )}
                      {tossPayload.message && (
                        <>
                          <div><b>Message</b></div>
                          <div className="break-all">{tossPayload.message}</div>
                        </>
                      )}
                      <div><b>OrderId</b></div>
                      <div className="break-all">{tossPayload.orderId || "-"}</div>
                      <div><b>Amount</b></div>
                      <div>{(tossPayload.amount || 0).toLocaleString()}원</div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">원인 확인 후 다시 시도해 주세요.</p>
                </>
              )}

              <div className="mt-6 sm:hidden">
                <button
                  onClick={() => {
                    setTossModalOpen(false);
                    clearTossQuery();
                  }}
                  className="w-full bg-black text-white py-3 rounded hover:bg-gray-800 transition"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 약관 동의 모달 */}
      {showTermsConsentModal && (
        <div
          className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowTermsConsentModal(false);
              setPendingPayment(null);
            }
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <CloseButton
              onClick={() => {
                setShowTermsConsentModal(false);
                setPendingPayment(null);
              }}
              label="약관 동의 모달 닫기"
            />

            <div className="overflow-y-auto p-4 sm:p-6 flex-1">
              <h2 className="text-2xl font-bold mb-4 text-center">결제 전 필수 약관 동의</h2>
              <p className="text-sm text-gray-600 mb-6 text-center">
                결제를 진행하시기 전에 아래 약관을 반드시 확인하시고 동의해주세요.
              </p>

              {/* 제5조 */}
              <div className="mb-6 p-4 border border-gray-300 rounded-lg bg-gray-50">
                <h3 className="text-lg font-semibold mb-2">제5조 (결제 및 환불)</h3>
                <div
                  className="text-sm text-gray-700 leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: `1. 회원은 회사가 지정한 결제수단을 통해 제품을 구매할 수 있습니다.<br/>
2. 디지털 제품의 특성상, 다운로드 또는 활성화 후에는 「전자상거래 등에서의 소비자보호에 관한 법률」에서 정한 경우를 제외하고 환불이 불가합니다.<br/>
3. 평생 무료 이용 상품(패밀리 라이센스 등)의 경우, 결제일로부터 7일이 경과한 후에는 「전자상거래 등에서의 소비자보호에 관한 법률」 제17조(청약철회 등)에서 정한 경우를 제외하고 환불이 불가합니다.`
                  }}
                />
                <label className="flex items-start mt-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsConsent1}
                    onChange={(e) => setTermsConsent1(e.target.checked)}
                    className="mt-1 mr-2 w-4 h-4 accent-black"
                  />
                  <span className="text-sm font-medium">위 약관을 확인했으며 이에 동의합니다.</span>
                </label>
              </div>

              {/* 제7조 */}
              <div className="mb-6 p-4 border border-gray-300 rounded-lg bg-gray-50">
                <h3 className="text-lg font-semibold mb-2">제7조 (책임의 한계)</h3>
                <div
                  className="text-sm text-gray-700 leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: `1. 회사는 천재지변, 전쟁, 테러, 정전, 통신장애, 해킹, 디도스(DDoS) 공격, 바이러스, 악성코드 등 외부 사이버 공격, 시스템 장애, 서버 오류, 제3자 서비스 중단 등 회사의 귀책사유 없이 발생한 불가항력적 사유로 인한 서비스 중단, 장애, 데이터 손실, 품질 저하 등에 대해 책임을 지지 않습니다.<br/>
2. 회사는 서비스의 유지·보수·점검·교체 및 고장, 통신두절 등의 사유가 발생한 경우, 서비스의 제공을 일시적으로 중단할 수 있으며, 이에 대해 회원에게 별도의 보상을 하지 않습니다. 단, 회사는 사전에 공지할 수 있도록 노력합니다.<br/>
3. 회원의 귀책사유(ID 및 비밀번호 관리 소홀, 부정 사용, 법령 위반 등)로 인한 서비스 이용 장애 및 손해에 대해서는 회사가 책임지지 않습니다.<br/>
4. 회사는 회원이 서비스를 통해 얻은 정보 또는 자료의 신뢰도, 정확성에 대해서는 보증하지 않으며, 이로 인한 손해에 대해 책임지지 않습니다.<br/>
5. 본 소프트웨어는 AI 기반 자동화 도구로서, 사용자의 시스템 환경, 하드웨어 사양, 운영체제, 기타 소프트웨어 등의 조건에 따라 정상적으로 작동하지 않거나 제한적으로 작동할 수 있으며, 회사는 모든 환경에서의 완벽한 호환성 및 동작을 보증하지 않습니다.`
                  }}
                />
                <label className="flex items-start mt-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsConsent2}
                    onChange={(e) => setTermsConsent2(e.target.checked)}
                    className="mt-1 mr-2 w-4 h-4 accent-black"
                  />
                  <span className="text-sm font-medium">위 약관을 확인했으며 이에 동의합니다.</span>
                </label>
              </div>

              {/* 제8조 */}
              <div className="mb-6 p-4 border border-gray-300 rounded-lg bg-gray-50">
                <h3 className="text-lg font-semibold mb-2">제8조 (계정 공유 금지 및 제재)</h3>
                <div
                  className="text-sm text-gray-700 leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: `1. 회원은 자신의 계정(ID 및 비밀번호)을 타인과 공유하거나 양도할 수 없습니다.<br/>
2. 회사는 계정 공유 방지 및 부정 이용 방지를 위해 회원의 접속 IP 주소, 접속 기록, 이용 패턴 등을 수집·분석할 수 있으며, 이는 개인정보처리방침에 따라 처리됩니다.<br/>
3. 비정상적인 접속 패턴(예: 짧은 시간 내 서로 다른 지역에서의 동시 접속, 과도한 기기 변경 등)이 감지될 경우, 회사는 해당 계정의 이용을 일시 정지하거나 영구적으로 제한할 수 있습니다.<br/>
4. 계정 공유가 확인된 경우, 회사는 사전 통보 없이 해당 계정을 정지하거나 서비스 이용 계약을 해지할 수 있으며, 이에 따른 환불은 제공되지 않습니다.`
                  }}
                />
                <label className="flex items-start mt-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsConsent3}
                    onChange={(e) => setTermsConsent3(e.target.checked)}
                    className="mt-1 mr-2 w-4 h-4 accent-black"
                  />
                  <span className="text-sm font-medium">위 약관을 확인했으며 이에 동의합니다.</span>
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowTermsConsentModal(false);
                    setPendingPayment(null);
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-3 rounded hover:bg-gray-400 transition"
                >
                  취소
                </button>
                <button
                  onClick={proceedWithPayment}
                  disabled={!termsConsent1 || !termsConsent2 || !termsConsent3}
                  className={`flex-1 py-3 rounded transition ${
                    termsConsent1 && termsConsent2 && termsConsent3
                      ? 'bg-black text-white hover:bg-gray-800'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  동의하고 결제하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
