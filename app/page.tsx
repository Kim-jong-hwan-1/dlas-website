"use client";

import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import type React from "react";
import Image from "next/image";
import { useLang } from "@/components/LanguageWrapper";
import LanguageSelector from "@/components/LanguageSelector";
import Script from "next/script";

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
      customerEmail: string; // required to match upstream expectations
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
   ✅ 공통 닫기 버튼 (모바일 가시성/접근성 대폭 개선)
   - viewport 기준 'fixed'로 변경 (상위 레이어 위에 항상 노출)
   - 44×44 터치 타깃, safe-area 대응
   - 초고 z-index, pointer-events 보장
   - ESC 지원은 전역 useEffect에서 처리
───────────────────────────────────────────────*/
function CloseButton({
  onClick,
  className = "",
  label = "닫기",
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
  만료일 포매터 – 9999‑12‑31 ➜ Unlimited, 
  날짜/시간 포함 여부 확인
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
/** ✅ 1) Paddle 환경/토큰/priceId 상수 정의 */
// --------------------------------
const isSandbox = process.env.NEXT_PUBLIC_PADDLE_ENV === "sandbox";

// Sandbox / Live 구분하여 환경 변수 세팅
const PADDLE_TOKEN = isSandbox
  ? process.env.NEXT_PUBLIC_PADDLE_TOKEN_SB!
  : process.env.NEXT_PUBLIC_PADDLE_TOKEN!;

const PADDLE_PRICE_ID = isSandbox
  ? process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_SB!
  : process.env.NEXT_PUBLIC_PADDLE_PRICE_ID!;

// ─────────────────────────────────────────────
// Temporary: Disable KRW (Toss) payments UI flow
// ─────────────────────────────────────────────
const KOREA_PAYMENT_MESSAGE =
  "결제준비중 빠른 결제를 원하시면, 010-9756-1992로 문의주세요";

// ─────────────────────────────────────────────
// 가격/표시 관련
// ─────────────────────────────────────────────
const LIFETIME_PRICE_KRW = 770_000; // 평생이용
const USD_TO_KRW = 1000;
const MODULE_PRICES_USD: Record<string, number> = {
  // 1DAY 제거
  "1WEEK": 19,
  "1MONTH": 49,
  "1YEAR": 290,
};
/** 미국 달러를 원화로 환산 */
const usdToKrw = (usd: number) => usd * USD_TO_KRW;
/** 🇰🇷 사용자인지 판별 */
const isKoreanUser = (country?: string) =>
  country &&
  ["korea", "south korea", "republic of korea", "대한민국", "한국"].some((kw) =>
    country.toLowerCase().includes(kw)
  );
/** KRW 표시 여부: 로그인 전(국가 미확인)에도 KRW를 기본 표시로 간주 */
const isKrwDisplay = (country?: string) => !country || isKoreanUser(country);
/** 버튼·라벨에 표시할 금액 문자열 (기존 기본가 표시용) */
const priceLabel = (period: string, country?: string) => {
  if (period === "LIFETIME") return `₩${LIFETIME_PRICE_KRW.toLocaleString()}`;
  const usd = MODULE_PRICES_USD[period];
  const krwStr = `₩${usdToKrw(usd).toLocaleString()}`;
  if (isKrwDisplay(country)) return krwStr;
  return `$${usd}`;
};
/** 일반 USD 금액 → 표시 문자열 (🇰🇷 기본 KRW, 🇺🇸 비한국 로그인 시 USD) */
const asDisplayPrice = (usdNumber: number, country?: string) => {
  const krwStr = `₩${Math.round(usdToKrw(usdNumber)).toLocaleString()}`;
  if (isKrwDisplay(country)) return krwStr;
  return `$${usdNumber.toLocaleString()}`;
};

/* ─────────────────────────────────────────────
   🔻 (표시는 없애되 할인 로직은 유지)
───────────────────────────────────────────────*/
const DISCOUNT_FACTOR = 0.7; // ≈30% 할인
/** 각 모듈의 할인 레벨: 0=없음, 1=1차, 2=2차 */
const MODULE_DISCOUNT_LEVELS: Record<string, 0 | 1 | 2> = {
  "Transfer Jig Maker": 1,
  "STL Classifier": 1,
  "HTML Viewer Converter": 1,
  "Image Converter": 2,
  "Abutment Editor": 0,
  "Wing Exo Jig": 0,
  "Fuser": 2,};
/** 만원 단위 반올림 */
const roundToManWon = (krw: number) => Math.round(krw / 10_000) * 10_000;
/** KRW 기준 1차/2차 할인 금액 계산 (만원 단위 반올림 적용) */
const discountedKrwByLevel = (baseKrw: number, level: 0 | 1 | 2) => {
  let v = baseKrw;
  for (let i = 0; i < level; i++) {
    v = roundToManWon(v * DISCOUNT_FACTOR);
  }
  return v;
};
/** 모듈+기간별 표시 가격 라벨 (할인 반영) */
const priceLabelForModule = (
  mod: string,
  period: "1WEEK" | "1MONTH" | "1YEAR" | "LIFETIME",
  country?: string
) => {
  const level = MODULE_DISCOUNT_LEVELS[mod] ?? 0;

  // LIFETIME은 항상 KRW로 표기(기존 정책 유지)
  if (period === "LIFETIME") {
    const base = LIFETIME_PRICE_KRW;
    const finalKrw = level > 0 ? discountedKrwByLevel(base, level) : base;
    return `₩${finalKrw.toLocaleString()}`;
  }

  const baseUsd = MODULE_PRICES_USD[period];
  const baseKrw = usdToKrw(baseUsd);

  if (isKrwDisplay(country)) {
    const finalKrw = level > 0 ? discountedKrwByLevel(baseKrw, level) : baseKrw;
    return `₩${finalKrw.toLocaleString()}`;
  } else {
    // 비한국 지역: USD 정수 달러로 1·2차 할인 적용
    let usd = baseUsd;
    if (level >= 1) usd = Math.round(usd * DISCOUNT_FACTOR);
    if (level >= 2) usd = Math.round(usd * DISCOUNT_FACTOR);
    return `$${usd.toLocaleString()}`;
  }
};

export default function Page() {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    const stored = localStorage.getItem("DLAS_TOKEN");
    if (stored) setToken(stored);
  }, []);

  // ------------ [추가] Toss 성공/실패 콜백 처리용 상태 ------------
  type TossIntentType = "module" | "family";
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
    userEmail?: string;
    code?: string;
    message?: string;
  } | null>(null);

  // 성공/실패로 돌아왔을 때 URL 파라미터 파싱
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);

    const provider = p.get("provider");
    const paymentKey = p.get("paymentKey"); // 성공 시 존재
    const orderId = p.get("orderId") ?? "";
    const amountStr = p.get("amount") ?? "";
    const type = (p.get("type") as TossIntentType) || "module";
    const mod = p.get("mod") ?? undefined;
    const period = p.get("period") ?? undefined;
    const orderName = p.get("orderName") ?? undefined;

    // 실패 시 Toss가 code/message 부여
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
          orderName,
          code: failCode || undefined,
          message: failMsg || undefined,
          userEmail: localStorage.getItem("userID") || undefined,
        });
      }
      setTossModalOpen(true);
    }
  }, []);

  // 승인 끝난 후 URL 정리
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

  // 승인요청(서버 confirm 호출)
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

  // buy 탭 위쪽에 선언!
  const MODULE_PRICE_IDS: Record<string, Record<string, string>> = {
    // ⭐ 1DAY 제거, LIFETIME 추가(PriceId는 추후 운영 값으로 교체하세요)
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
    },  };

  const handleDownloadUnavailable = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    alert("Temporary error, download is currently unavailable.");
  };

  const { t } = useLang();

  // --- 로그인 상태 관리 ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const storedIsLoggedIn = localStorage.getItem("isLoggedIn");
    const storedExpireTime = localStorage.getItem("loginExpireTime");

    if (storedIsLoggedIn === "true" && storedExpireTime) {
      const expireTime = parseInt(storedExpireTime, 10);
      if (Date.now() < expireTime) {
        setIsLoggedIn(true);
      } else {
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("loginExpireTime");
        localStorage.removeItem("userID");
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("DLAS_TOKEN");
    setToken(null);
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("loginExpireTime");
    localStorage.removeItem("userID");
    setIsLoggedIn(false);
    setUserInfo({});
  };

  // ▼▼▼ MY 모달 관련 상태들 ▼▼▼
  const [showMyModal, setShowMyModal] = useState(false);
  const [userID, setUserID] = useState("");

  const [userInfo, setUserInfo] = useState<{
    name?: string;
    id?: string;
    country?: string;
    phone?: string;
    email?: string;
    licenseStatus?: string; // "normal" or "family"
    module_licenses?: { [key: string]: string };
  }>({});
  // Seed country early from localStorage
  useEffect(() => {
    try {
      const lc = localStorage.getItem("DLAS_USER_COUNTRY");
      if (lc) setUserInfo((prev) => ({ ...prev, country: lc }));
    } catch {}
  }, []);

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

  const [isUserInfoLoading, setIsUserInfoLoading] = useState(false);

  // admin 엔드포인트 사용, email 매개변수로 유저정보 받기
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

  // --- 회원가입 로직 관련 상태 ---
  const [idForSignup, setIdForSignup] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [workplaceName, setWorkplaceName] = useState("");
  const [workplaceAddress, setWorkplaceAddress] = useState("");
  const [marketingAgree, setMarketingAgree] = useState(false);
  const [termsAgree, setTermsAgree] = useState(false);

  // 패밀리 라이선스 모달
  const [showFamilyModal, setShowFamilyModal] = useState(false);
  // 무료 라이선스 안내
  const [showFreeLicenseGuide, setShowFreeLicenseGuide] = useState(false);
  // 결제 진행(모듈 상태 안내) 단계
  const [showPaymentProceed, setShowPaymentProceed] = useState(false);
  // 결제 문의 모달
  const [showPaymentSupportModal, setShowPaymentSupportModal] =
    useState(false);

  const [freeLicenseGuideOrigin, setFreeLicenseGuideOrigin] = useState<
    "home" | "familyInfo" | null
  >(null);

  // 회원가입 폼 제출 처리
  const handleSignupSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    if (!termsAgree) {
      setPasswordError("You must agree to the required terms.");
      return;
    }

    setPasswordError("");
    const requestData = {
      email: idForSignup,
      password,
      name,
      country,
      workplace_name: workplaceName,
      workplace_address: workplaceAddress,
      marketing_agree: marketingAgree,
    };

    try {
      const res = await fetch(
        "https://license-server-697p.onrender.com/auth/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        }
      );

      const text = await res.text();
      try {
        const data = JSON.parse(text);
        if (!res.ok) {
          const message =
            typeof data.detail === "object"
              ? JSON.stringify(data.detail)
              : data.detail || "Unknown error";
          alert(`Sign up failed: ${message}`);
          return;
        }

        alert(`Sign up completed: ${data.message}`);
        document.getElementById("signup-modal")?.classList.add("hidden");
      } catch (e) {
        console.error("JSON parse failed", text);
        alert("Received an invalid response from the server.");
      }
    } catch (err) {
      console.error("Error while signing up", err);
      alert("Network error.");
    }
  };

  // 로그인 로직
  const [idForLogin, setIdForLogin] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const requestData = {
      email: idForLogin,
      password: loginPassword,
    };

    try {
      const response = await fetch(
        "https://license-server-697p.onrender.com/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        const message =
          typeof errorData.detail === "object"
            ? JSON.stringify(errorData.detail)
            : errorData.detail || errorData.message || "Unknown error";
        alert(`Login error: ${message}`);
        return;
      }

      const data = await response.json();
      const access_token = data.access_token;
      if (access_token) {
        localStorage.setItem("DLAS_TOKEN", access_token);
        setToken(access_token);
      }

      alert("Login success!");
      setIsLoggedIn(true);

      const oneHourLater = Date.now() + 60 * 60 * 1000; // 1시간
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("loginExpireTime", oneHourLater.toString());
      localStorage.setItem("userID", idForLogin);
      setUserID(idForLogin);

      fetchUserInfo(idForLogin);

      document.getElementById("login-modal")!.classList.add("hidden");
    } catch (error) {
      console.error("Error during login:", error);
      if (error instanceof Error) {
        alert(`Error during login: ${error.message}`);
      } else {
        alert("An unknown error occurred while logging in.");
      }
    }
  };

  // 로그인 상태면 userInfo 불러오기
  useEffect(() => {
    if (isLoggedIn) {
      const storedID = localStorage.getItem("userID");
      if (storedID) {
        if (!userInfo.id) {
          fetchUserInfo(storedID);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  // MY 모달 열릴 때 Local Storage fallback
  useEffect(() => {
    if (showMyModal) {
      const storedID = userID || localStorage.getItem("userID");
      if (storedID) {
        setUserID(storedID as string);
        fetchUserInfo(storedID as string);
      }
    }
  }, [showMyModal]); // eslint-disable-line react-hooks/exhaustive-deps

  const countries = [
    "Afghanistan",
    "Albania",
    "Algeria",
    "Andorra",
    "Angola",
    "Antigua and Barbuda",
    "Argentina",
    "Armenia",
    "Australia",
    "Austria",
    "Azerbaijan",
    "Bahamas",
    "Bahrain",
    "Bangladesh",
    "Barbados",
    "Belarus",
    "Belgium",
    "Belize",
    "Benin",
    "Bhutan",
    "Bolivia",
    "Bosnia and Herzegovina",
    "Botswana",
    "Brazil",
    "Brunei",
    "Bulgaria",
    "Burkina Faso",
    "Burundi",
    "Cabo Verde",
    "Cambodia",
    "Cameroon",
    "Canada",
    "Central African Republic",
    "Chad",
    "Chile",
    "China",
    "Colombia",
    "Comoros",
    "Congo (Brazzaville)",
    "Congo (Kinshasa)",
    "Costa Rica",
    "Croatia",
    "Cuba",
    "Cyprus",
    "Czech Republic",
    "Denmark",
    "Djibouti",
    "Dominican Republic",
    "Ecuador",
    "Egypt",
    "El Salvador",
    "Equatorial Guinea",
    "Eritrea",
    "Estonia",
    "Eswatini",
    "Ethiopia",
    "Fiji",
    "Finland",
    "France",
    "Gabon",
    "Gambia",
    "Georgia",
    "Germany",
    "Ghana",
    "Greece",
    "Grenada",
    "Guatemala",
    "Guinea",
    "Guinea-Bissau",
    "Guyana",
    "Haiti",
    "Honduras",
    "Hungary",
    "Iceland",
    "India",
    "Indonesia",
    "Iran",
    "Iraq",
    "Ireland",
    "Israel",
    "Italy",
    "Jamaica",
    "Japan",
    "Jordan",
    "Kazakhstan",
    "Kenya",
    "Kiribati",
    "Kuwait",
    "Kyrgyzstan",
    "Laos",
    "Latvia",
    "Lebanon",
    "Lesotho",
    "Liberia",
    "Libya",
    "Liechtenstein",
    "Lithuania",
    "Luxembourg",
    "Madagascar",
    "Malawi",
    "Malaysia",
    "Maldives",
    "Mali",
    "Malta",
    "Marshall Islands",
    "Mauritania",
    "Mauritius",
    "Mexico",
    "Micronesia",
    "Moldova",
    "Monaco",
    "Mongolia",
    "Montenegro",
    "Morocco",
    "Mozambique",
    "Myanmar",
    "Namibia",
    "Nauru",
    "Nepal",
    "Netherlands",
    "New Zealand",
    "Nicaragua",
    "Niger",
    "Nigeria",
    "North Korea",
    "North Macedonia",
    "Norway",
    "Oman",
    "Pakistan",
    "Palau",
    "Palestine",
    "Panama",
    "Papua New Guinea",
    "Paraguay",
    "Peru",
    "Philippines",
    "Poland",
    "Portugal",
    "Qatar",
    "Romania",
    "Russia",
    "Rwanda",
    "Saint Kitts and Nevis",
    "Saint Lucia",
    "Saint Vincent and the Grenadines",
    "Samoa",
    "San Marino",
    "Sao Tome and Principe",
    "Saudi Arabia",
    "Senegal",
    "Serbia",
    "Seychelles",
    "Sierra Leone",
    "Singapore",
    "Slovakia",
    "Slovenia",
    "Solomon Islands",
    "Somalia",
    "South Africa",
    "South Korea",
    "South Sudan",
    "Spain",
    "Sri Lanka",
    "Sudan",
    "Suriname",
    "Sweden",
    "Switzerland",
    "Syria",
    "Taiwan",
    "Tajikistan",
    "Tanzania",
    "Thailand",
    "Timor-Leste",
    "Togo",
    "Tonga",
    "Trinidad and Tobago",
    "Tunisia",
    "Turkey",
    "Turkmenistan",
    "Tuvalu",
    "Uganda",
    "Ukraine",
    "United Arab Emirates",
    "United Kingdom",
    "United States",
    "Uruguay",
    "Uzbekistan",
    "Vanuatu",
    "Vatican City",
    "Venezuela",
    "Vietnam",
    "Yemen",
    "Zambia",
    "Zimbabwe",
  ];

  // 탭 이동(스크롤) 로직
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get("tab");
    if (tab) {
      const target = document.getElementById(tab);
      if (target) {
        setTimeout(() => {
          window.scrollTo({
            top: tab === "home" ? 0 : target.offsetTop - 160,
            behavior: "smooth",
          });
        }, 100);
      }
    }
  }, []);

  const scrollToSection = (id: string) => {
    if (id === "home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      window.history.replaceState(null, "", `/?tab=${id}`);
      return;
    }
    const el = document.getElementById(id);
    if (el) {
      window.scrollTo({
        top: el.offsetTop - 160,
        behavior: "smooth",
      });
      window.history.replaceState(null, "", `/?tab=${id}`);
    }
  };

  const modules = [
    "Transfer Jig Maker",
    "STL Classifier",
    "HTML Viewer Converter",
    "Image Converter",
    "Abutment Editor",
    "Wing Exo Jig",
    "Fuser",  ];

  const currentOrigin = useMemo(() => {
    if (typeof window === "undefined") return "https://www.dlas.io";
    return window.location.origin;
  }, []);

  // 🇰🇷 Korea → TossPayments / 🌎 Others → Paddle
  const handleModulePayment = (mod: string, period: string) => {
    const storedId = localStorage.getItem("userID") || userID;
    if (!storedId) {
      alert("Please log in first.");
      setTimeout(() => {
        document.getElementById("login-modal")?.classList.remove("hidden");
      }, 100);
      return;
    }

    if (!userInfo.country || userInfo.country.trim() === "") {
      alert("국가 정보를 불러오는 중입니다. 상단 'MY'에서 확인한 뒤 다시 시도해 주세요.");
      return;
    }

    if (isKrwDisplay(userInfo.country)) {
      alert(KOREA_PAYMENT_MESSAGE);
      return;
    }

    if (!paddleReady || !(window as MyWindow).Paddle) {
      alert("Paddle is not ready yet. Please refresh the page or try again.");
      return;
    }

    const priceId =
      MODULE_PRICE_IDS[mod] && MODULE_PRICE_IDS[mod][period]
        ? MODULE_PRICE_IDS[mod][period]
        : "";
    if (!priceId) {
      alert("Price is not configured yet. Please contact us.");
      return;
    }

    const orderName = `${mod} (${period})`;

    (window as MyWindow).Paddle!.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customer: { email: storedId },
      customData: { userID: storedId, module: mod, period, orderName },
      closeCallback: () => console.log("Checkout closed"),
    });
  };

  // ✅ 패밀리 라이선스 테이블 데이터
  const familyTableData = [
    [
      "Transfer Jig Maker",
      asDisplayPrice(790, userInfo.country),
      "Free",
      "Automated jig generation software",
    ],
    ["Image Converter", priceLabel("1MONTH", userInfo.country), "Free", "Convert STL to image quickly"],
    ["Abutment Editor", asDisplayPrice(770, userInfo.country), "Free", "Professional abutment editing tool"],
    ["Wing Exo Jig", "통합예정", "Free", "Wing exo jig maker"],
    ["HTML Viewer Converter", priceLabel("1MONTH", userInfo.country), "Free", "Convert STL to HTML viewer"],
    [
      "Printing Model Maker (Expected July 2025)",
      asDisplayPrice(590, userInfo.country),
      "Free",
      "Lightweight model creator",
    ],
    [
      "Bite Finder (Expected July 2025)",
      asDisplayPrice(1090, userInfo.country),
      "Free",
      "Revolutionary bite locator for model-less workflows",
    ],
    [
      "STL Classifier (Expected July 2025)",
      asDisplayPrice(590, userInfo.country),
      "Free",
      "Classify STL by color and height",
    ],
    [
      "Denture CAD (Expected 2025)",
      asDisplayPrice(790, userInfo.country),
      "Free",
      "Arrangement library, labial facing, custom tray",
    ],
    [
      "Crown CAD (Expected 2025)",
      asDisplayPrice(790, userInfo.country),
      "Free",
      "Integrated crown CAD with the best features",
    ],
    ["...new module 1 (Coming Soon)", asDisplayPrice(790, userInfo.country), "Free", ""],
    ["...new module 2 (Coming Soon)", asDisplayPrice(790, userInfo.country), "Free", ""],
    ["...new module 3 (Coming Soon)", asDisplayPrice(790, userInfo.country), "Free", ""],
    [
      "AI DLAS CAD (Expected 2026)",
      `${asDisplayPrice(59, userInfo.country)}/month`,
      `${asDisplayPrice(5.9, userInfo.country)}/month`,
      "",
    ],
  ];

  const handleCopyEmail = () => {
    navigator.clipboard.writeText("support@dlas.io");
  };

  // 다운로드 모달
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  // 🆕 Webina modal (Poster images + 9월 세미나 설문결과)
  const [showWebinaModal, setShowWebinaModal] = useState(false);
  const [webinaTab, setWebinaTab] = useState<"poster" | "survey">("poster");
  const [analysisPreview, setAnalysisPreview] = useState<string | null>(null);
  const WEBINA_ANALYSIS_FILES = ["분석1.png", "분석2.png", "분석3.png", "분석4.png"];
  const WEBINA_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSc_fzZTLxCqNlCYlbZs3RvogqSxbzq9BMFQnAiTBSNyw8z52A/viewform?usp=sharing&ouid=100677474144073110334";


  // 🔔 공지 PDF 모달 — /public/notice/DLAS_공고문.pdf
  const [showPdfModal, setShowPdfModal] = useState(false);
  // 🔔 공지 이미지 모달 — /public/notice/1.jpg
  const [showNoticeModal, setShowNoticeModal] = useState(false);

  useEffect(() => {
    // 홈페이지 진입 시 PDF 모달 먼저 표시
    setShowPdfModal(true);
  }, []);

  // ✅ 공통: 모달 열릴 때 스크롤 잠금 + ESC 닫기
  const anyModalOpen =
    tossModalOpen ||
    showFamilyModal ||
    showPaymentSupportModal ||
    showDownloadModal ||
    showWebinaModal ||
    showPdfModal ||
    showNoticeModal ||
    showMyModal;

  useEffect(() => {
    if (!anyModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (analysisPreview) {
          setAnalysisPreview(null);
          return;
        }
        if (tossModalOpen) {
          setTossModalOpen(false);
          clearTossQuery();
          return;
        }
        if (showWebinaModal) {
          setShowWebinaModal(false);
          return;
        }
        if (showPdfModal) {
          setShowPdfModal(false);
          setShowNoticeModal(true);
          return;
        }
        if (showNoticeModal) {
          setShowNoticeModal(false);
          return;
        }
        if (showDownloadModal) {
          setShowDownloadModal(false);
          return;
        }
        if (showPaymentSupportModal) {
          setShowPaymentSupportModal(false);
          return;
        }
        if (showFamilyModal) {
          setShowFamilyModal(false);
          setShowFreeLicenseGuide(false);
          setShowPaymentProceed(false);
          return;
        }
        if (showMyModal) {
          setShowMyModal(false);
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
  }, [
    anyModalOpen,
    analysisPreview,
    tossModalOpen,
    showWebinaModal,
    showPdfModal,
    showNoticeModal,
    showDownloadModal,
    showPaymentSupportModal,
    showFamilyModal,
    showMyModal,
  ]);

  // 다운로드 불가 안내만 표시 (실제 다운로드는 실행하지 않음)
  const handleDownloadConfirm = () => {
    setShowDownloadModal(false);
  };

  // ------------------
  // ✅ 2) Paddle 결제 로직
  // ------------------

  const [paddleReady, setPaddleReady] = useState(false);

  // ** 1) 할인코드 State **
  const [couponCode, setCouponCode] = useState("");
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const coupon = urlParams.get("coupon");
    if (coupon) {
      setCouponCode(coupon);
    }
  }, []);

  const handlePaddleCheckout = () => {
    if (!paddleReady) {
      alert("Paddle is not ready yet. Please wait or refresh the page.");
      return;
    }
    if (!(window as MyWindow).Paddle) {
      alert("Paddle object is missing. (Check ad-blocker or domain settings)");
      return;
    }

    const storedId = localStorage.getItem("userID") || userID;
    if (!storedId) {
      alert("Please log in first.");
      return;
    }

    (window as MyWindow).Paddle!.Checkout.open({
      items: [
        {
          priceId: PADDLE_PRICE_ID,
          quantity: 1,
        },
      ],
      customer: { email: storedId },
      customData: { userID: storedId },
      discountCode: couponCode.trim(),
      closeCallback: () => console.log("Checkout closed"),
    });
  };

  // 🇰🇷 Family 라이선스 → Toss 결제 유도
  const handleTossRequest = () => {
    if (userInfo.licenseStatus === "family") {
      alert("You are already a Family user. Payment is not possible.");
      return;
    }

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
    const amount = 550000;
    const userID = localStorage.getItem("userID") || "";
    const orderName = "DLAS Family License";

    const successUrl =
      `${currentOrigin}/?provider=toss&type=family&orderName=${encodeURIComponent(
        orderName
      )}` +
      `&orderId=${encodeURIComponent(orderId)}&amount=${encodeURIComponent(
        String(amount)
      )}`;
    const failUrl = `${currentOrigin}/?provider=toss&type=family`;

    tossPayments.requestPayment("CARD", {
      amount,
      orderId,
      orderName,
      customerEmail: userID,
      customerName: userInfo && userInfo.name ? userInfo.name : userID,
      successUrl,
      failUrl,
    });
  };

  const handleFamilyLicensePayment = () => {
    if (isUserInfoLoading) {
      alert("Loading your information... Please try again shortly.");
      return;
    }
    if (userInfo.licenseStatus === "family") {
      alert("You are already a Family user. Payment is not possible.");
      return;
    }
    if (!userInfo.country || userInfo.country.trim() === "") {
      alert("국가 정보를 불러오는 중입니다. 상단 'MY'에서 확인한 뒤 다시 시도해 주세요.");
      return;
    }
    if (isKrwDisplay(userInfo.country)) {
      alert(KOREA_PAYMENT_MESSAGE);
      return;
    }
    handlePaddleCheckout();
  };

  return (
    <>
      <Head>
        <title>DLAS - Dental Lab Automation Solution</title>
        <meta
          name="description"
          content="DLAS is an advanced dental CAD automation software. It supports automatic crown design, screw hole insertion, and gingiva bar separation."
        />
        <meta
          name="keywords"
          content="DLAS, Dental CAD, dental automation, digital dentistry, screw hole automation"
        />
        <link rel="canonical" href="https://www.dlas.io/" />
      </Head>

      {/* 기본 언어: ko */}
      <Script
        id="dlas-initial-lang-ko"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
          (function () {
            try {
              if (typeof location === 'undefined' || location.pathname === '/') {
                localStorage.setItem('DLAS_LANG', 'ko');
                localStorage.setItem('lang', 'ko');
                localStorage.setItem('i18nLang', 'ko');
                document.cookie = 'DLAS_LANG=ko; Path=/; Max-Age=31536000; SameSite=Lax';
              }
            } catch (e) {}
          })();`,
        }}
      />

      {/* Paddle Billing v2 SDK */}
      <Script
        src="https://cdn.paddle.com/paddle/v2/paddle.js"
        strategy="afterInteractive"
        onLoad={() => {
          try {
            if (!(window as MyWindow).Paddle) {
              console.error("❌ window.Paddle undefined ― 스크립트 차단 여부 확인");
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
            console.error("🔥 Paddle init 실패:", err);
          }
        }}
      />

      {/* TossPayments SDK */}
      <Script src="https://js.tosspayments.com/v1" strategy="afterInteractive" />

      <div className="min-h-screen bg-white text-black relative">
        {/* 좌측 상단 로고 + 언어 */}
        <div
          className="
            fixed top-4 left-4 z-50
            flex items-center space-x-3
            hidden sm:flex
          "
        >
          <Image
            src="/left-up.png"
            alt="DLAS Mini Logo"
            width={120}
            height={120}
            className="object-contain"
            priority
          />
          {/* 보이는 LanguageSelector (왼쪽) */}
          <LanguageSelector />
        </div>

        {/* ▼ 모바일 전용 LanguageSelector ― 데스크탑에서는 숨김 */}
        <div className="fixed top-4 right-4 z-50 flex items-center sm:hidden">
          <LanguageSelector />
        </div>

        {/* 상단 네비게이션 */}
        <nav className="fixed top-0 left-0 w-full bg-white py-4 px-8 shadow-lg z-40">
          <div className="flex justify-center items-center relative">
            <Image
              src="/logo.png"
              alt="DLAS Logo"
              width={600}
              height={400}
              className="object-contain max-w-full sm:max-w-[600px] mx-auto mt-[80px] sm:mt-0 mb-0 sm:mb-0"
              priority
            />
            {/* ▼ 네비게이션 버튼 그룹 (오른쪽) */}
            <div className="absolute bottom-2 right-4 sm:right-8 hidden sm:flex flex-wrap items-center gap-x-4 gap-y-2">
              {["home", "download", "buy"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => scrollToSection(tab)}
                  className="relative pb-2 transition-colors duration-200 cursor-pointer
                             border-b-2 border-transparent hover:border-black
                             text-gray-700 hover:text-black"
                >
                  {t(`nav.${tab}`)}
                </button>
              ))}

              <button
                onClick={() => scrollToSection("terms-privacy")}
                className="relative pb-2 transition-colors duration-200 cursor-pointer
                           border-b-2 border-transparent hover:border-black
                           text-gray-700 hover:text-black"
              >
                {t("nav.terms")}
              </button>
            </div>
          </div>
        </nav>

        {/* 로그인 & 사인업 버튼 */}
        <div
          className="
            fixed
            top-6 left-6
            sm:top-6 sm:right-6 sm:left-auto
            flex gap-2 z-50
          "
        >
          {!isLoggedIn ? (
            <>
              <button
                onClick={() =>
                  document
                    .getElementById("login-modal")!
                    .classList.remove("hidden")
                }
                className="text-sm font-medium border border-gray-300 px-4 py-2 rounded hover:bg-gray-100 transition"
              >
                {t("nav.login")}
              </button>
              <button
                onClick={() =>
                  document
                    .getElementById("signup-modal")!
                    .classList.remove("hidden")
                }
                className="text-sm font-medium border border-gray-300 px-4 py-2 rounded hover:bg-gray-100 transition"
              >
                {t("nav.signup")}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowMyModal(true)}
                className="text-sm font-medium border border-gray-300 px-4 py-2 rounded hover:bg-gray-100 transition"
              >
                MY
              </button>
              <button
                onClick={handleLogout}
                className="text-sm font-medium border border-gray-300 px-4 py-2 rounded hover:bg-gray-100 transition"
              >
                Logout
              </button>
            </>
          )}
        </div>

        <main className="pt-[180px]">
          {/* ✅ 세미나 섹션 완전 제거됨 */}

          {/* 홈 섹션 */}
          <section id="home" className="scroll-mt-[180px] text-center py-20">
            <p className="text-xl text-gray-300 mb-2">
              <span className="text-5xl font-bold block">{t("home.subtitle")}</span>
            </p>
            <h1 className="text-6xl font-bold mb-8">{t("home.title")}</h1>

            <div className="flex flex-col items-center justify-center">
              <button
                onClick={() => {
                  setShowFamilyModal(true);
                  setShowFreeLicenseGuide(true);
                  setShowPaymentProceed(false);
                  setFreeLicenseGuideOrigin("home");
                }}
                className="
                  bg-black text-white
                  font-bold
                  rounded-md
                  text-lg md:text-xl
                  px-6 md:px-12
                  py-3 md:py-4
                  mb-10
                  cursor-pointer
                  transition
                  hover:bg-gray-800
                "
              >
                무료라이센스 발급 받으세요!
              </button>
            </div>

            <div className="mt-10 px-6 max-w-4xl mx-auto text-center">
              <h2 className="text-3xl font-semibold mb-4 text-gray-900">
                {t("home.gameChangerTitle")}
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed mb-4">
                {t("home.gameChangerDesc")}
              </p>
              <p className="italic text-2xl text-gray-800 font-medium">
                {t("home.gameChangerQuote")}
              </p>
            </div>
          </section>

          {/* 다운로드 섹션 */}
          <section id="download" className="scroll-mt-[180px] text-center py-20 bg-gray-100">
            <h2 className="text-4xl font-bold mb-4">{t("download.title")}</h2>
            <p className="text-lg text-gray-500 max-w-3xl mx-auto mt-2">
              <br />
              {t("download.desc.line3")}
              <br />
              {t("download.desc.line4")}
            </p>

            <div className="mt-8 flex flex-col items-center space-y-4 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-4 w-full max-w-2xl">
                <button
                  className="bg-black text-white px-8 py-3 rounded hover:bg-gray-800 transition text-center whitespace-nowrap"
                  style={{ minWidth: '200px' }}
                  onClick={(e) => {
                    e.preventDefault();
                    setShowDownloadModal(true);
                  }}
                >
                  v2.0.0&nbsp;Installer
                </button>
                <div className="flex flex-col items-start sm:items-center">
                  <a
                    href="https://github.com/MarcoAttene/MeshFix-V2.1/archive/refs/heads/master.zip"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 transition w-full sm:w-auto text-center"
                  >
                    MeshFix&nbsp;2.1.0&nbsp;(Source)
                  </a>
                  <span className="text-[10px] text-gray-600 mt-1 text-center sm:text-center leading-tight">
                    MeshFix (GPL v3 – commercial use requires a separate license from IMATI-CNR)
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* 구매 섹션 */}
          <section id="buy" className="scroll-mt-[180px] text-center py-20 bg-white">
            <h2 className="text-4xl font-bold mb-12">{t("nav.buy")}</h2>

            {(() => {
              const MODULE_NAME_TO_ID: Record<string, string> = {
                "Transfer Jig Maker": "9",
                "STL Classifier": "2",
                "HTML Viewer Converter": "5",
                "Image Converter": "6",
                "Abutment Editor": "3",
                "Wing Exo Jig": "8",
                "Fuser": "7",
              };

              const info: Record<
                string,
                { gif: string | null; youtube: string | null; image: string | null }
              > = {
                "Transfer Jig Maker": {
                  gif: "/gifs/transfer_jig_maker.gif",
                  youtube: "7-YeT3Y0KcQ",
                  image: "/modules/transfer_jig_maker.png",
                },
                "Image Converter": {
                  gif: "/gifs/fast_image_converter.gif",
                  youtube: "agm47qKzw1Q",
                  image: "/modules/fast_image_converter.png",
                },
                "Abutment Editor": {
                  gif: null,
                  youtube: null,
                  image: "/modules/exo_abutment_editor.png",
                },
                "Wing Exo Jig": {
                  gif: null,
                  youtube: null,
                  image: "/modules/wing_exo.png",
                },
                "HTML Viewer Converter": {
                  gif: "/gifs/html_viewer_converter.gif",
                  youtube: "IGOFiLchblo",
                  image: "/modules/fast_html_viewer_converter.png",
                },
                "STL Classifier": {
                  gif: "/gifs/classifier.gif",
                  youtube: null,
                  image: "/modules/fast_stl_classifier.png",
                },
                Fuser: {
                  gif: "/gifs/fuser.gif",
                  youtube: null,
                  image: "/modules/fast_stl_fuser.png",
                },
              };

              const moduleCards = modules.map((mod) => {
                const { gif, youtube, image } =
                  info[mod] ?? { gif: null, youtube: null, image: null };
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
                const { display: expireDisplay, debug: expireDebug } = formatExpiration(
                  expireUtc ?? undefined
                );

                return (
                  <div
                    key={mod}
                    className="
                        relative
                        bg-gray-50 rounded-2xl border shadow-md px-2 py-8
                        flex flex-col sm:flex-row items-center
                        h-auto sm:h-80 sm:min-h-[320px] sm:max-h-[320px] gap-6
                      "
                  >
                    {/* 모바일 */}
                    <div className="flex flex-col w-full sm:hidden items-center">
                      <div className="w-full flex items-center justify-center mb-4">
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
                          <span className="text-2xl font-extrabold px-4 break-words">
                            {mod}
                          </span>
                        )}
                      </div>
                      <div className="w-full h-56 aspect-video border rounded-2xl bg-white overflow-hidden flex items-center justify-center mb-4">
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
                          <span className="text-gray-400 text-2xl font-bold flex items-center justify-center w-full h-full">
                            Coming&nbsp;Soon
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col w-full items-center gap-2">
                        {/* 할인 배지 제거 */}

                        <div className="flex flex-row w-full justify-center items-center gap-2">
                          <button
                            className="bg-black text-white rounded-lg w-1/3 h-12 text-base font-extrabold flex flex-col items-center justify-center transition hover:bg-gray-800"
                            onClick={() => handleModulePayment(mod, "1WEEK")}
                          >
                            <span className="text-lg leading-5">1주</span>
                            <span className="text-xs leading-5">
                              {priceLabelForModule(mod, "1WEEK", userInfo.country)}
                            </span>
                          </button>
                          <button
                            className="bg-black text-white rounded-lg w-1/3 h-12 text-base font-extrabold flex flex-col items-center justify-center transition hover:bg-gray-800"
                            onClick={() => handleModulePayment(mod, "1MONTH")}
                          >
                            <span className="text-lg leading-5">1달</span>
                            <span className="text-xs leading-5">
                              {priceLabelForModule(mod, "1MONTH", userInfo.country)}
                            </span>
                          </button>
                          <button
                            className="bg-black text-white rounded-lg w-1/3 h-12 text-base font-extrabold flex flex-col items-center justify-center transition hover:bg-gray-800"
                            onClick={() => handleModulePayment(mod, "1YEAR")}
                          >
                            <span className="text-lg leading-5">1년</span>
                            <span className="text-xs leading-5">
                              {priceLabelForModule(mod, "1YEAR", userInfo.country)}
                            </span>
                          </button>
                        </div>
                        <button
                          className="bg-black text-white rounded-lg w-full h-12 text-base font-extrabold flex flex-col items-center justify-center transition hover:bg-gray-800"
                          onClick={() => handleModulePayment(mod, "LIFETIME")}
                        >
                          <span className="text-lg leading-5">평생이용</span>
                          <span className="text-xs leading-5">
                            {priceLabelForModule(mod, "LIFETIME", userInfo.country)}
                          </span>
                        </button>
                        <div className="w-full text-center mt-3">
                          {isLoggedIn ? (
                            <span className="text-xs text-gray-600 font-mono">
                              License expires:&nbsp;
                              {expireDisplay ? (
                                <>
                                  <span className="text-black">{expireDisplay}</span>
                                  <span className="text-xs text-gray-500">
                                    &nbsp;(UTC)
                                  </span>
                                </>
                              ) : (
                                <span className="text-red-500">
                                  Not activated
                                  {expireDebug ? ` (reason: ${expireDebug})` : ""}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">
                              * Log in to check your license
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* 데스크탑 */}
                    <div className="hidden sm:flex flex-row items-center w-full h-full gap-6">
                      <div className="w-64 h-full flex-shrink-0 flex items-center justify-center">
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
                          <span className="text-2xl sm:text-3xl font-extrabold px-4 break-words">
                            {mod}
                          </span>
                        )}
                      </div>
                      <div className="w-72 h-72 flex items-center justify-center flex-shrink-0">
                        <div className="w-72 h-72 flex items-center justify-center border rounded-2xl bg-white overflow-hidden">
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
                            <span className="text-gray-400 text-2xl font-bold flex items-center justify-center w-full h-full">
                              Coming&nbsp;Soon
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 h-72 flex items-center justify-center min-w-0">
                        <div className="w-full h-72 aspect-video border rounded-2xl bg-white overflow-hidden flex items-center justify-center">
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
                            <span className="text-gray-400 text-2xl font-bold flex items-center justify-center w/full h-full">
                              Coming&nbsp;Soon
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-3 w-40 flex-shrink-0 h-full justify-center items-center">
                        {/* 할인 배지 제거 */}

                        <button
                          className="bg-black text-white rounded-lg w-32 h-16 text-lg font-extrabold flex flex-col items-center justify-center transition hover:bg-gray-800"
                          onClick={() => handleModulePayment(mod, "1WEEK")}
                        >
                          <span className="text-xl leading-5">1주</span>
                          <span className="text-base leading-5">
                            {priceLabelForModule(mod, "1WEEK", userInfo.country)}
                          </span>
                        </button>
                        <button
                          className="bg-black text-white rounded-lg w-32 h-16 text-lg font-extrabold flex flex-col items-center justify-center transition hover:bg-gray-800"
                          onClick={() => handleModulePayment(mod, "1MONTH")}
                        >
                          <span className="text-xl leading-5">1달</span>
                          <span className="text-base leading-5">
                            {priceLabelForModule(mod, "1MONTH", userInfo.country)}
                          </span>
                        </button>
                        <button
                          className="bg-black text-white rounded-lg w-32 h-16 text-lg font-extrabold flex flex-col items-center justify-center transition hover:bg-gray-800"
                          onClick={() => handleModulePayment(mod, "1YEAR")}
                        >
                          <span className="text-xl leading-5">1년</span>
                          <span className="text-base leading-5">
                            {priceLabelForModule(mod, "1YEAR", userInfo.country)}
                          </span>
                        </button>
                        <button
                          className="bg-black text-white rounded-lg w-32 h-16 text-lg font-extrabold flex flex-col items-center justify-center transition hover:bg-gray-800"
                          onClick={() => handleModulePayment(mod, "LIFETIME")}
                        >
                          <span className="text-xl leading-5">평생이용</span>
                          <span className="text-base leading-5">
                            {priceLabelForModule(mod, "LIFETIME", userInfo.country)}
                          </span>
                        </button>
                        <div className="w-full text-center mt-4">
                          {isLoggedIn ? (
                            <span className="text-xs text-gray-600 font-mono">
                              License expires:&nbsp;
                              {expireDisplay ? (
                                <>
                                  <span className="text-black">{expireDisplay}</span>
                                  <span className="text-xs text-gray-500">
                                    &nbsp;(UTC)
                                  </span>
                                </>
                              ) : (
                                <span className="text-red-500">
                                  Not activated
                                  {expireDebug ? ` (reason: ${expireDebug})` : ""}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">
                              * Log in to check your license
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              });

              const licenseCards = (
                <div className="flex flex-col gap-10">
                  {/* D.P.L */}
                  <div className="relative bg-gradient-to-br from-gray-50 to-white rounded-2xl border shadow-md p-6 sm:p-10 text-left">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="inline-flex items-center px-3 py-1 rounded-full border text-xs font-semibold">
                            D.P.L.
                          </span>
                          <h3 className="text-2xl sm:text-3xl font-bold leading-tight">
                            DLAS Permanent License
                          </h3>
                        </div>
                        <p className="text-gray-600">단발성 결제 · 부가세 포함</p>
                        <div className="mt-4 text-3xl sm:text-4xl font-extrabold">
                          ₩2,200,000{" "}
                          <span className="text-sm font-medium text-gray-500 align-middle"></span>
                        </div>
                        <ul className="mt-6 space-y-2 text-gray-800">
                          <li>• 모든 모듈 <b>평생 무료 라이선스</b></li>
                          <li>• <b>업데이트</b> 및 <b>버전</b>과 상관없이 평생 무료</li>
                        </ul>
                      </div>
                      <div className="w-full sm:w-56 flex sm:flex-col gap-2">
                        <button
                          onClick={() => alert("010-9756-1992로 문자나 전화주세요")}
                          className="flex-1 bg-black text-white rounded-lg px-6 py-3 font-bold hover:bg-gray-800 transition"
                        >
                          가입 문의
                        </button>
                        <a
                          href="010-9756-1992로 연락주세요"
                          className="flex-1 border rounded-lg px-6 py-3 text-center hover:bg-gray-50 transition"
                        >
                          이메일 문의
                        </a>
                        <div className="hidden sm:block text-xs text-gray-500 mt-2"></div>
                      </div>
                    </div>
                  </div>

                  {/* D.F.L */}
                  <div className="relative bg-gradient-to-br from-amber-50 to-white rounded-2xl border shadow-md p-6 sm:p-10 text-left">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="inline-flex items-center px-3 py-1 rounded-full border border-amber-300 bg-amber-100 text-amber-800 text-xs font-semibold">
                            D.F.L.
                          </span>
                          <h3 className="text-2xl sm:text-3xl font-bold leading-tight">
                            DLAS Family License
                          </h3>
                        </div>
                        <p className="text-gray-600">단발성 결제 · 부가세 포함</p>
                        <div className="mt-4 text-3xl sm:text-4xl font-extrabold">
                          ₩3,850,000{" "}
                          <span className="text-sm font-medium text-gray-500 align-middle"></span>
                        </div>

                        <div className="mt-6 text-gray-800">
                          <p className="font-semibold mb-2">설명</p>
                          <ul className="space-y-1">
                            <li>1) 모든 모듈 <b>평생 무료</b></li>
                            <li>2) <b>라이센스 계약자 의견</b>을 반영하여 개발 및 업데이트</li>
                            <li>3) 모든 <b>연구자료·세미나자료 공유</b></li>
                            <li>4) 디지털 기공 과정 문제 발생 시 <b>해결책 제시 및 어시스트</b></li>
                            <li>5) <b>치과 연계</b> (2025년 10월 31일 내 가입자 한정)</li>
                          </ul>
                          <ul className="mt-2 ml-4 list-disc space-y-1">
                            <li>DLAS Family의 디지털 전문성을 강조하여 영업</li>
                            <li>단순 연결(수익 보장 아님)</li>
                            <li>원장님의 피드백을 점수화하여 다음 연결 시 가산</li>
                          </ul>
                        </div>
                      </div>

                      <div className="w-full sm:w-56 flex sm:flex-col gap-2">
                        <button
                          onClick={() => alert("010-9756-1992로 문자나 전화주세요")}
                          className="flex-1 bg-black text-white rounded-lg px-6 py-3 font-bold hover:bg-gray-800 transition"
                        >
                          가입 문의
                        </button>
                        <a
                          href="010-9756-1992로 연락주세요"
                          className="flex-1 border rounded-lg px-6 py-3 text-center hover:bg-gray-50 transition"
                        >
                          이메일 문의
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              );

              return (
                <div className="flex flex-col gap-y-16 w-full max-w-6xl mx-auto">
                  {moduleCards}
                  {licenseCards}
                </div>
              );
            })()}
          </section>

          {/* --- Terms & Privacy 섹션 --- */}
          <section id="terms-privacy" className="scroll-mt-[180px] py-20 px-6 bg-white">
            <div className="max-w-4xl mx-auto text-left leading-7 text-gray-700">
              <h2 className="text-4xl font-bold mb-8 text-center">{t("terms.title")}</h2>

              <h3 className="text-2xl font-bold mb-4">{t("terms.headingTerms")}</h3>
              {[
                "article1",
                "article2",
                "article3",
                "article4",
                "article5",
                "article6",
                "article7",
                "article8",
              ].map((a) => (
                <div key={a}>
                  <h4 className="font-semibold mb-1">{t(`terms.${a}.title`)}</h4>
                  <p
                    className="mb-4"
                    dangerouslySetInnerHTML={{
                      __html: t(`terms.${a}.desc`),
                    }}
                  />
                </div>
              ))}
              <p className="mb-12">
                <strong>{t("terms.effectiveDate")}</strong>
              </p>

              <h3 className="text-2xl font-bold mb-4">{t("privacy.headingPrivacy")}</h3>
              <p className="mb-4">{t("privacy.intro")}</p>
              {["article1", "article2", "article3", "article4", "article5", "article6", "article7"].map(
                (a) => (
                  <div key={a}>
                    <h4 className="font-semibold mb-1">{t(`privacy.${a}.title`)}</h4>
                    <p
                      className="mb-4"
                      dangerouslySetInnerHTML={{
                        __html: t(`privacy.${a}.desc`),
                      }}
                    />
                  </div>
                )
              )}
              <p className="mb-4">
                <strong>{t("privacy.effectiveDate")}</strong>
              </p>
            </div>
          </section>
        </main>

        {/* ─────────────────────────────────────────────────────────── */}
        {/* Toss 결제 결과 & 승인요청 모달                                  */}
        {/* ─────────────────────────────────────────────────────────── */}
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
                        <div>
                          <b>Status</b>
                        </div>
                        <div>success (승인 전)</div>
                        {tossPayload.module && (
                          <>
                            <div>
                              <b>Module</b>
                            </div>
                            <div>{tossPayload.module}</div>
                          </>
                        )}
                        {tossPayload.period && (
                          <>
                            <div>
                              <b>Period</b>
                            </div>
                            <div>{tossPayload.period}</div>
                          </>
                        )}
                        {tossPayload.orderName && (
                          <>
                            <div>
                              <b>OrderName</b>
                            </div>
                            <div>{tossPayload.orderName}</div>
                          </>
                        )}
                        <div>
                          <b>OrderId</b>
                        </div>
                        <div className="break-all">{tossPayload.orderId}</div>
                        <div>
                          <b>PaymentKey</b>
                        </div>
                        <div className="break-all">{tossPayload.paymentKey}</div>
                        <div>
                          <b>Amount</b>
                        </div>
                        <div>{tossPayload.amount.toLocaleString()}원</div>
                        {tossPayload.userEmail && (
                          <>
                            <div>
                              <b>User</b>
                            </div>
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
                        <div>
                          <b>Status</b>
                        </div>
                        <div>fail</div>
                        {tossPayload.code && (
                          <>
                            <div>
                              <b>Code</b>
                            </div>
                            <div>{tossPayload.code}</div>
                          </>
                        )}
                        {tossPayload.message && (
                          <>
                            <div>
                              <b>Message</b>
                            </div>
                            <div className="break-all">{tossPayload.message}</div>
                          </>
                        )}
                        <div>
                          <b>OrderId</b>
                        </div>
                        <div className="break-all">{tossPayload.orderId || "-"}</div>
                        <div>
                          <b>Amount</b>
                        </div>
                        <div>{(tossPayload.amount || 0).toLocaleString()}원</div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">원인 확인 후 다시 시도해 주세요.</p>
                  </>
                )}

                {/* 하단 닫기 버튼 (모바일 표시) */}
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

        {/* 패밀리 라이선스 모달 */}
        {showFamilyModal && (
          <div
            className="fixed inset-0 z-[200] bg-black/50 overflow-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowFamilyModal(false);
                setShowFreeLicenseGuide(false);
                setShowPaymentProceed(false);
              }
            }}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex min-h-full items-start justify-center px-6 py-10">
              <div
                className="bg-white p-8 rounded-xl shadow-xl w-full max-w-[1100px] relative overflow-x-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <CloseButton
                  onClick={() => {
                    setShowFamilyModal(false);
                    setShowFreeLicenseGuide(false);
                    setShowPaymentProceed(false);
                  }}
                  label="패밀리 라이선스 모달 닫기"
                />

                {showPaymentProceed ? (
                  <div>
                    <h2 className="text-xl font-bold mb-4 text-center">
                      {t("payment.title")}
                    </h2>
                    <div className="text-sm text-gray-700 leading-relaxed space-y-3">
                      <p className="font-bold text-red-600">{t("payment.warning")}</p>
                      <div className="border rounded p-4 bg-gray-50">
                        <p className="font-semibold mb-2">
                          {t("payment.statusHeader")}
                        </p>
                        <ul className="list-disc list-inside space-y-1">
                          {Array.from({ length: 7 }, (_, i) => (
                            <li
                              key={i}
                              className={
                                i === 6
                                  ? "bg-red-100 border-l-4 border-red-500 text-red-700 font-bold p-3 rounded shadow flex items-center"
                                  : ""
                              }
                            >
                              {i === 6 && "⚠️ "}
                              {t(`payment.items.${i}`)}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <p>{t("payment.footer")}</p>
                    </div>
                    <div className="text-center mt-6">
                      <button
                        className="bg-black text-white px-8 py-3 rounded hover:bg-gray-800 transition"
                        onClick={handleFamilyLicensePayment}
                      >
                        {t("payment.agree")}
                      </button>
                    </div>
                  </div>
                ) : showFreeLicenseGuide ? (
                  <div className="mt-6">
                    <button
                      onClick={() => {
                        if (freeLicenseGuideOrigin === "home") {
                          setShowFreeLicenseGuide(false);
                          setShowFamilyModal(false);
                        } else {
                          setShowFreeLicenseGuide(false);
                        }
                      }}
                      className="underline text-blue-600 mb-4"
                    >
                      ← Back
                    </button>
                    <h3 className="text-2xl font-bold mb-4 text-center">
                      {t("freeLicense.title")}
                    </h3>

                    <div className="flex flex-row items-start justify-center space-x-4">
                      {[1, 2, 3].map((n) => (
                        <img
                          key={n}
                          src={`/free_liecense/${n}.png`}
                          alt={`Step ${n}`}
                          className="w-60 h-auto"
                        />
                      ))}
                    </div>

                    <div className="text-sm text-gray-700 mt-4 leading-6 space-y-2">
                      <p
                        dangerouslySetInnerHTML={{
                          __html: t("freeLicense.step1"),
                        }}
                      />
                      <p
                        dangerouslySetInnerHTML={{
                          __html: t("freeLicense.step2"),
                        }}
                      />
                      <p>{t("freeLicense.step3")}</p>
                      <p
                        dangerouslySetInnerHTML={{
                          __html: t("freeLicense.send"),
                        }}
                      />
                      <p>{t("freeLicense.aiReview")}</p>
                      <hr className="my-3" />
                      <div className="font-bold text-gray-900 space-y-1">
                        {[1, 2, 3].map((n) => (
                          <p key={n}>{t(`freeLicense.note${n}`)}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mt-6">
                      <button
                        onClick={() => setShowFamilyModal(false)}
                        className="underline text-blue-600 mb-4"
                      >
                        ← Back
                      </button>
                    </div>

                    <h2 className="text-3xl font-bold mb-4 text-center">
                      {t("family.modalTitle")}
                    </h2>

                    <div className="text-gray-700 text-sm leading-relaxed space-y-2 mb-6">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <p key={n}>{t(`family.desc${n}`)}</p>
                      ))}
                    </div>

                    <div className="my-4 text-center">
                      <p className="font-bold text-red-600 mb-2">
                        {t("family.recommendFree")}
                      </p>
                      <button
                        onClick={() => {
                          setShowFreeLicenseGuide(true);
                          setFreeLicenseGuideOrigin("familyInfo");
                        }}
                        className="underline text-blue-600 cursor-pointer"
                      >
                        {t("family.howToGetFree")}
                      </button>
                    </div>

                    <table className="w-full text-sm border border-gray-300 mb-4 whitespace-nowrap">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="p-2 border text-left">Module</th>
                          <th className="p-2 border text-center">
                            General User
                            <br />
                            <span className="text-xs text-gray-600">
                              After v2.0.0 Release
                            </span>
                          </th>
                          <th className="p-2 border text-center">
                            Family
                            <br />
                            <span className="text-xs text-orange-600 font-bold">
                              ONLY before v2.0.0
                            </span>
                          </th>
                          <th className="p-2 border text-left">Description</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs">
                        {familyTableData.map(([title, price1, price2, desc], idx) => (
                          <tr key={idx}>
                            <td className="p-2 border">{title}</td>
                            <td className="p-2 border text-center">{price1}</td>
                            <td className="p-2 border text-center">{price2}</td>
                            <td className="p-2 border">{desc}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="text-xs text-gray-500 text-right mt-2">
                      {t("family.tableNote")}
                    </p>

                    <div className="text-center mt-6">
                      <button
                        className="bg-black text-white px-8 py-3 rounded hover:bg-gray-800 transition"
                        onClick={() => {
                          if (!isLoggedIn) {
                            document
                              .getElementById("login-modal")!
                              .classList.remove("hidden");
                          } else {
                            if (userInfo.licenseStatus === "family") {
                              alert("You are already a Family user. Payment is not possible.");
                              return;
                            }
                            setShowPaymentProceed(true);
                          }
                        }}
                      >
                        Proceed to payment
                      </button>
                    </div>
                  </>
                )}

                {/* 모바일 하단 닫기 버튼 */}
                <div className="mt-6 sm:hidden">
                  <button
                    onClick={() => {
                      setShowFamilyModal(false);
                      setShowFreeLicenseGuide(false);
                      setShowPaymentProceed(false);
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

        {/* 결제 문의 (이메일 안내) 모달 */}
        {showPaymentSupportModal && (
          <div
            className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center px-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowPaymentSupportModal(false);
            }}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="bg-white w-full max-w-md p-8 rounded-lg shadow-xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <CloseButton
                onClick={() => setShowPaymentSupportModal(false)}
                label="결제 문의 모달 닫기"
              />
              <h2 className="text-2xl font-bold mb-4 text-center">
                {t("purchase.title")}
              </h2>
              <p className="text-sm text-gray-700 leading-relaxed mb-4">
                {t("purchase.desc")}
              </p>
              <div className="flex items-center justify-between gap-2 bg-gray-100 rounded p-2 mb-4">
                <span className="text-black text-sm font-bold">support@dlas.io</span>
                <button
                  onClick={handleCopyEmail}
                  className="bg-gray-300 text-black px-3 py-1 rounded hover:bg-gray-400 transition text-sm"
                >
                  {t("purchase.copy")}
                </button>
              </div>
              <div className="text-center">
                <button
                  className="bg-black text-white px-8 py-3 rounded hover:bg-gray-800 transition"
                  onClick={() => setShowPaymentSupportModal(false)}
                >
                  {t("purchase.close")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 다운로드 안내 모달 */}
        {showDownloadModal && (
          <div
            className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center px-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowDownloadModal(false);
            }}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="bg-white w-full max-w-lg p-6 rounded-lg shadow-xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <CloseButton
                onClick={() => setShowDownloadModal(false)}
                label="다운로드 안내 닫기"
              />

              <h2 className="text-xl font-bold mb-3 text-red-600">※ 다운로드 불가 안내</h2>
              <div className="text-sm text-gray-700 mb-6 space-y-2">
                <p className="font-semibold">예상치 못한 오류로 인해 다운로드가 불가합니다.</p>
                <p>원격 설치는 가능하니, <strong>에니데스크(AnyDesk)</strong> 설치 후 연락 주세요:</p>
                <p className="mt-2">
                  <strong>이메일:</strong> techsupport@dlas.io<br />
                  <strong>전화:</strong> 010-2314-1169<br />
                  <strong>지원 가능 시간:</strong> 월~금(공휴일 휴무) 10:00~12:00, 13:00~17:00
                </p>
              </div>

              <div className="text-center mt-4">
                <button
                  onClick={() => setShowDownloadModal(false)}
                  className="bg-black text-white px-6 py-2 rounded hover:bg-gray-800 transition"
                >
                  확인
                </button>
              </div>

              {/* 모바일 하단 닫기 버튼 */}
              <div className="text-center mt-2 sm:hidden">
                <button
                  onClick={() => setShowDownloadModal(false)}
                  className="w-full border px-6 py-2 rounded hover:bg-gray-50 transition"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 🆕 Webina 모달: 홈페이지 진입 시 자동 표시 (닫으면 공지 모달 이어서 열림) */}
        {showWebinaModal && (
          <div
            className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center px-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowWebinaModal(false);
                setShowNoticeModal(true);
              }
            }}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="relative bg-white rounded-xl shadow-2xl w-full max-w-5xl p-4 sm:p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <CloseButton
                onClick={() => { setShowWebinaModal(false); setShowNoticeModal(true); }}
                label="Webina 모달 닫기"
              />

              <h2 className="text-2xl font-bold mb-4 text-center">웨비나 안내</h2>

              {/* 탭 */}
              <div className="flex items-center justify-center gap-2 mb-4">
                <button
                  className={"px-4 py-2 rounded border " + (webinaTab === "poster" ? "bg-black text-white" : "bg-white")}
                  onClick={() => setWebinaTab("poster")}
                >
                  포스터
                </button>
                <button
                  className={"px-4 py-2 rounded border " + (webinaTab === "survey" ? "bg-black text-white" : "bg-white")}
                  onClick={() => setWebinaTab("survey")}
                >
                  9월 세미나 설문결과
                </button>
              </div>

              {/* 안내문 (설문결과 별개 행사) */}
              {webinaTab === "survey" && (
                <div className="mb-3 text-center text-xs text-gray-600">
                  이 자료는 <b>9월 세미나 설문결과</b>이며, <b>현재 진행될 EXO 웨비나와는 별개의 행사</b>입니다.
                </div>
              )}

              {/* 콘텐츠 */}
              {webinaTab === "poster" ? (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                  {/* 좌측: 포스터 이미지 — ✅ 1번만 표시 */}
                  <div className="lg:col-span-3 rounded-lg border bg-white overflow-auto max-h:[75vh] lg:max-h-[75vh] p-2">
                    <div className="space-y-3">
                      <img
                        src="/webina/1.png"
                        alt="웨비나 포스터 1"
                        className="w-full h-auto object-contain"
                      />
                      {/* 2.png 제거됨 */}
                    </div>
                  </div>

                  {/* 우측: 참가신청 */}
                  <aside className="lg:col-span-2 rounded-lg border bg-white p-4 flex flex-col gap-3">
                    <div className="text-center">
                      <h3 className="text-xl font-bold mb-1">EXO CAD 실무 팁 세미나</h3>
                      <p className="text-sm text-gray-600">좌측 포스터 이미지를 확인하세요.</p>
                    </div>
                    <a
                      href={WEBINA_FORM_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-black text-white py-3 rounded text-center font-bold hover:bg-gray-800 transition"
                    >
                      참가신청하기
                    </a>
                    <div className="text-xs text-gray-500">
                      • 참가신청은 Google Forms로 진행됩니다.<br />
                      • 문의: 010-9756-1992 / support@dlas.io
                    </div>
                  </aside>
                </div>
              ) : (
                <div className="max-h-[75vh] overflow-auto p-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {WEBINA_ANALYSIS_FILES.map((name, idx) => (
                      <button
                        key={idx}
                        onClick={() => setAnalysisPreview(name)}
                        className="block rounded-lg border bg-white overflow-hidden"
                      >
                        <img
                          src={`/webina/${encodeURIComponent(name)}`}
                          alt={name}
                          className="w-full h-80 object-contain bg-white"
                          loading="lazy"
                        />
                        <div className="p-2 text-center text-sm text-gray-700">
                          {name.replace(".png", "")} — 크게 보기
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 라이트박스: 이미지 클릭 → 다시 클릭하면 닫힘 */}
              {analysisPreview && (
                <div
                  className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4"
                  onClick={() => setAnalysisPreview(null)}
                  role="button"
                  aria-label="Close analysis preview"
                >
                  <img
                    src={`/webina/${encodeURIComponent(analysisPreview)}`}
                    alt="preview"
                    className="max-h-[90vh] max-w-full object-contain"
                  />
                </div>
              )}

              <div className="mt-4 text-center">
                <button
                  onClick={() => { setShowWebinaModal(false); setShowNoticeModal(true); }}
                  className="w-full bg-black text-white py-3 rounded hover:bg-gray-800 transition"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 🔔 PDF 모달 (공고문) — /notice/DLAS_공고문.pdf */}
        {showPdfModal && (
          <div
            className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center px-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowPdfModal(false);
                setShowNoticeModal(true);
              }
            }}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="relative bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <CloseButton
                onClick={() => { setShowPdfModal(false); setShowNoticeModal(true); }}
                label="공고문 모달 닫기"
              />

              {/* 스크롤 가능한 컨텐츠 영역 */}
              <div className="overflow-y-auto p-4 sm:p-6 flex-1">
                <iframe
                  src="/notice/DLAS_공고문.pdf"
                  className="w-full h-[80vh] rounded"
                  title="DLAS 공고문"
                />

                {/* 하단 닫기 버튼 (모바일 & 데스크탑 공통) */}
                <div className="mt-4 text-center">
                  <button
                    onClick={() => { setShowPdfModal(false); setShowNoticeModal(true); }}
                    className="w-full bg-black text-white py-3 rounded hover:bg-gray-800 transition"
                  >
                    닫기
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 🔔 Notice 모달 (이미지 공지) — /notice/1.jpg */}
        {showNoticeModal && (
          <div
            className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center px-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowNoticeModal(false);
            }}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <CloseButton
                onClick={() => setShowNoticeModal(false)}
                label="공지 모달 닫기"
              />

              {/* 스크롤 가능한 컨텐츠 영역 */}
              <div className="overflow-y-auto p-4 sm:p-6 flex-1">
                <div className="w-full flex flex-col gap-4 items-center">
                  <img
                    src="/notice/1.png"
                    alt="Notice 1"
                    className="w-full h-auto object-contain rounded"
                  />
                  <img
                    src="/notice/2.jpg"
                    alt="Notice 2"
                    className="w-full h-auto object-contain rounded"
                  />
                </div>

                {/* 하단 닫기 버튼 (모바일 & 데스크탑 공통) */}
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setShowNoticeModal(false)}
                    className="w-full bg-black text-white py-3 rounded hover:bg-gray-800 transition"
                  >
                    닫기
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 로그인 모달 */}
        <div
          id="login-modal"
          className="fixed inset-0 z-[200] hidden bg-black bg-opacity-50 flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              document.getElementById("login-modal")!.classList.add("hidden");
            }
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white w-full max-w-md p-8 rounded-lg shadow-xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <CloseButton
              onClick={() =>
                document.getElementById("login-modal")!.classList.add("hidden")
              }
              label="로그인 모달 닫기"
            />
            <h2 className="text-2xl font-bold mb-4 text-center">{t("login.title")}</h2>
            <form className="space-y-4" onSubmit={handleLoginSubmit}>
              <input
                type="text"
                placeholder="ID"
                value={idForLogin}
                onChange={(e) => setIdForLogin(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded"
                required
              />
              <input
                type="password"
                placeholder={t("login.form.password")}
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded"
                required
              />
              <button type="submit" className="w-full bg-black text-white py-3 rounded hover:bg-gray-800">
                {t("login.form.submit")}
              </button>
            </form>
            <p className="mt-4 text-center text-sm text-gray-500">
              {t("login.form.noAccount")}{" "}
              <a
                href="#"
                className="text-blue-600 hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById("login-modal")!.classList.add("hidden");
                  document.getElementById("signup-modal")!.classList.remove("hidden");
                }}
              >
                {t("login.form.signupNow")}
              </a>
            </p>

            <div className="mt-6 sm:hidden">
              <button
                className="w-full border px-6 py-3 rounded hover:bg-gray-50 transition"
                onClick={() => document.getElementById("login-modal")!.classList.add("hidden")}
              >
                닫기
              </button>
            </div>
          </div>
        </div>

        {/* 회원가입 모달 */}
        <div
          id="signup-modal"
          className="fixed inset-0 z-[200] hidden bg-black bg-opacity-50 flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              document.getElementById("signup-modal")!.classList.add("hidden");
            }
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white w-full max-w-md p-8 rounded-lg shadow-xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <CloseButton
              onClick={() => document.getElementById("signup-modal")!.classList.add("hidden")}
              label="회원가입 모달 닫기"
            />
            <h2 className="text-2xl font-bold mb-4 text-center">{t("signup.title")}</h2>
            <form className="space-y-4" onSubmit={handleSignupSubmit}>
              <input
                type="text"
                placeholder={t("signup.form.name")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded"
                required
              />
              <input
                type="text"
                placeholder={t("signup.form.id")}
                className="w-full p-3 border border-gray-300 rounded"
                value={idForSignup}
                onChange={(e) => setIdForSignup(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder={t("signup.form.password")}
                className="w-full p-3 border border-gray-300 rounded"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder={t("signup.form.confirmPassword")}
                className="w-full p-3 border border-gray-300 rounded"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded"
                required
              >
                <option value="">{t("signup.form.countryPlaceholder")}</option>
                {countries.map((country, index) => (
                  <option key={index} value={country}>
                    {country}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder={t("signup.form.workplaceName")}
                value={workplaceName}
                onChange={(e) => setWorkplaceName(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded"
              />

              <input
                type="text"
                placeholder={t("signup.form.workplaceAddress")}
                value={workplaceAddress}
                onChange={(e) => setWorkplaceAddress(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded"
              />

              <div className="text-sm text-gray-600 mt-4 space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={termsAgree}
                    onChange={(e) => setTermsAgree(e.target.checked)}
                    className="form-checkbox h-5 w-5 text-black"
                  />
                  <span className="ml-2">{t("signup.form.agreeRequired")}</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={marketingAgree}
                    onChange={(e) => setMarketingAgree(e.target.checked)}
                    className="form-checkbox h-5 w-5 text-black"
                  />
                  <span className="ml-2">{t("signup.form.agreeMarketing")}</span>
                </label>
              </div>

              {passwordError && <p className="text-red-500 text-sm">{passwordError}</p>}

              <button type="submit" className="w-full bg-black text-white py-3 rounded hover:bg-gray-800">
                {t("signup.form.submit")}
              </button>
            </form>

            <div className="mt-6 sm:hidden">
              <button
                className="w-full border px-6 py-3 rounded hover:bg-gray-50 transition"
                onClick={() => document.getElementById("signup-modal")!.classList.add("hidden")}
              >
                닫기
              </button>
            </div>
          </div>
        </div>

        {/* MY 모달 */}
        {showMyModal && (
          <div
            className="fixed inset-0 z-[200] bg-black bg-opacity-50 flex items-center justify-center"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowMyModal(false);
            }}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="bg-white w-full max-w-md p-8 rounded-lg shadow-xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <CloseButton
                onClick={() => setShowMyModal(false)}
                label="My Info 모달 닫기"
              />
              <h2 className="text-2xl font-bold mb-4 text-center">My Info</h2>
              <div className="space-y-2 text-center text-sm">
                <p>
                  <strong>이름:</strong> {userInfo.name ?? "-"}
                </p>
                <p>
                  <strong>아이디:</strong> {userInfo.id ?? "-"}
                </p>
                <p>
                  <strong>국가:</strong> {userInfo.country ?? "-"}
                </p>
                <p>
                  <strong>전화번호:</strong> {userInfo.phone ?? "-"}
                </p>
                <p>
                  <strong>이메일:</strong> {userInfo.email ?? "-"}
                </p>
                <p>
                  <strong>라이선스 상태:</strong>{" "}
                  {userInfo.licenseStatus === "family"
                    ? "family"
                    : userInfo.licenseStatus === "normal"
                    ? "normal"
                    : userInfo.licenseStatus ?? "Loading..."}
                </p>
              </div>

              <div className="mt-6 sm:hidden">
                <button
                  className="w-full bg-black text-white py-3 rounded hover:bg-gray-800 transition"
                  onClick={() => setShowMyModal(false)}
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="bg-black text-white py-10 px-6 mt-20">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-4">
              <div className="text-sm">© {new Date().getFullYear()} DLAS. {t("footer.rights")}</div>
              <div className="flex gap-4">
                <a
                  href="https://www.youtube.com/@Dlas-official-e6k"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-red-500"
                >
                  {t("footer.youtube")}
                </a>
                <a
                  href="https://www.instagram.com/dlas_official_"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-pink-400"
                >
                  {t("footer.instagram")}
                </a>
              </div>
            </div>

            <div className="mt-6 text-sm text-white leading-snug">
              <p>DLAS</p>
              <p>대표 : 김종환</p>
              <p>사업자 등록번호 : 753-06-03175</p>
              <p>통신판매업 신고번호 : 2025-대전서구-1033</p>
              <p>주소 : 인천시 서구 청라동 202-3번지 청라더리브티아모지식산업센터 지원동 543호, 대한민국</p>
              <p>전화 : +82-10-9756-1992 (대한민국)</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
