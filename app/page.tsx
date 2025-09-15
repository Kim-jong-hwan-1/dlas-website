"use client";

// 타입 선언 파일에서는 필요 (중복 선언 방지)

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


/*───────────────────────────────────────────────────
  만료일 포매터 – 9999‑12‑31 ➜ Unlimited, 
  날짜/시간 포함 여부 확인
────────────────────────────────────────────────────*/
const formatExpiration = (raw?: string) => {
  if (!raw) return { display: null, debug: "empty" } as const;
  if (raw.startsWith("9999-12-31")) return { display: "Unlimited", debug: null } as const;

  const m = raw.match(/^(\d{4}-\d{2}-\d{2})(?:[T\s](\d{2}):(\d{2}))/);
  if (!m) return { display: null, debug: "unrecognised format" } as const;

  const [, ymd, hh, mm] = m;
  if (!hh) return { display: ymd, debug: null } as const;

  const d = new Date(raw);
  if (isNaN(d.getTime())) return { display: null, debug: "invalid date" } as const;

  const p = (n: number) => `${n}`.padStart(2, "0");
  const utc = `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
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
const KOREA_PAYMENT_MESSAGE = "결제준비중 빠른 결제를 원하시면, 010-9756-1992로 문의주세요";

// Poster assets (in /public/posters)
const POSTER_PATHS = [
  "/posters/1.jpg",
  "/posters/2.jpg",
  "/posters/3.jpg",
  "/posters/4.jpg",
  "/posters/5.jpg",
  "/posters/6.jpg",
  "/posters/7.png",
  "/posters/8.png",
  "/posters/9.png",
  "/posters/10.png", // ✅ 추가
];

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
  const [tossApproveState, setTossApproveState] = useState<"idle" | "requesting" | "ok" | "fail">("idle");
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

  // 승인이 끝난 후 URL 정리
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

  // 승인요청(서버 confirm 호출) – 실제 비밀키는 서버에 있으므로 여기서는 요청만
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

      // ⚠️ 예시 엔드포인트 (서버에서 Toss 승인 API 호출)
      const res = await fetch("https://license-server-697p.onrender.com/payments/toss/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Server approval failed");
      }

      setTossApproveState("ok");
      // 라이선스 정보 갱신
      if (token) await fetchLicenseInfo(token);
    } catch (err: any) {
      setTossApproveState("fail");
      setTossErrText(err?.message || String(err));
    }
  };

  // buy 탭 위쪽에 선언!
  const MODULE_PRICE_IDS: Record<string, Record<string, string>> = {
    "Transfer Jig Maker": {
      "1DAY": "pri_01k1jctwckah8wy2e30bmnbh19",
      "1WEEK": "pri_01k1jcsv5cg66tjnv05qhtwknh",
      "1MONTH": "pri_01k1jcs60js4d1khk87qsczcgh",
      "1YEAR": "pri_01k1jcptq639s6r3npgyphtk4p",
    },
    "STL Classifier": {
      "1DAY": "pri_01k1dhbc5qnnqeqx0xvy9ra8zq",
      "1WEEK": "pri_01k1dhdhev3zdv3dme6veyd9ab",
      "1MONTH": "pri_01k1dhetmhg867gkdkj75mv4pn",
      "1YEAR": "pri_01k1dhh3b4dfm1r191y6zk1xmh",
    },
    "HTML Viewer Converter": {
      "1DAY": "pri_01k1dhj3aq89kgdtxyapj10hqq",
      "1WEEK": "pri_01k1dhm7x23g8nn3tpcmswjq14",
      "1MONTH": "pri_01k1dhn95p99rbc3y5n4yg3ke1",
      "1YEAR": "pri_01k1dhnxpaj49197qw7chmpe60",
    },
    "Image Converter": {
      "1DAY": "pri_01k1dhrezj288s5xdmt7ck760q",
      "1WEEK": "pri_01k1dhsg4gwyzycar6cggsm93j",
      "1MONTH": "pri_01k1dhtxxwyaqt63bx9wfgttfa",
      "1YEAR": "pri_01k1dhwbb0yvngp04ggzna166w",
    },
    "Booleaner": {
      "1DAY": "pri_01k1dhz0scvpdgj7g010d3q8ek",
      "1WEEK": "pri_01k1dj1fwdb7gqd7m6zcvgcqmw",
      "1MONTH": "pri_01k1dj2gbhq3r3g26kg9sb1c4j",
      "1YEAR": "pri_01k1dj4hm0933fgr6zn7a7yvx0",
    },
    "Fuser": {
      "1DAY": "pri_01k1dj5bcrq7c3bbpknw8ysm3y",
      "1WEEK": "pri_01k1dj6060dp3nba0x7kqxj5aj",
      "1MONTH": "pri_01k1dj6qjawp143jjbwbac779c",
      "1YEAR": "pri_01k1dj77nyhzgpg2terfwwd9pd",
    },
  };

/** ─────────────────────────────────────────────────
 *  ▒  가격·통화 설정
 *─────────────────────────────────────────────────*/
const USD_TO_KRW = 1000;
const MODULE_PRICES_USD: Record<string, number> = {
  "1DAY": 3,
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

/** 버튼·라벨에 표시할 금액 문자열 (🇰🇷 기본 원화, 🇺🇸 비한국 로그인 시 달러) */
const priceLabel = (period: string, country?: string) => {
  const usd = MODULE_PRICES_USD[period];
  const krwStr = `₩${usdToKrw(usd).toLocaleString()}`;

  // ✅ 기본값: KRW
  // ✅ 로그인 후 country가 한국이 아니면 USD
  if (isKrwDisplay(country)) return krwStr;
  return `$${usd}`;
};

/** 일반 USD 금액(정수/소수)을 표시용 문자열로 변환: 🇰🇷 기본 KRW, 🇺🇸 비한국 로그인 시 USD */
const asDisplayPrice = (usdNumber: number, country?: string) => {
  const krwStr = `₩${Math.round(usdToKrw(usdNumber)).toLocaleString()}`;
  if (isKrwDisplay(country)) return krwStr;
  return `$${usdNumber.toLocaleString()}`;
};


  const handleDownloadUnavailable = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    alert("Temporary error, download is currently unavailable.");
  };

  const { t } = useLang();

  // --- 로그인 상태 관리 ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // (1) 페이지 로드(새로고침) 시 Local Storage 확인하여 로그인 상태 복원
  useEffect(() => {
    const storedIsLoggedIn = localStorage.getItem("isLoggedIn");
    const storedExpireTime = localStorage.getItem("loginExpireTime");

    if (storedIsLoggedIn === "true" && storedExpireTime) {
      const expireTime = parseInt(storedExpireTime, 10);
      // 현재 시간이 만료 시간 전이라면, 로그인 상태 유지
      if (Date.now() < expireTime) {
        setIsLoggedIn(true);
      } else {
        // 만료되었으면 Local Storage 정리
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("loginExpireTime");
        localStorage.removeItem("userID"); // 만료 시 userID도 제거
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("DLAS_TOKEN"); // 추가
    setToken(null);                        // 추가
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
    module_licenses?: { [key: string]: string };  // ← 이 부분 추가!
  }>({})
  // Seed country early from localStorage (fast display/routing before network)
  useEffect(() => {
    try {
      const lc = localStorage.getItem("DLAS_USER_COUNTRY");
      if (lc) setUserInfo((prev) => ({ ...prev, country: lc }));
    } catch {}
  }, []);
;

  const fetchLicenseInfo = async (accessToken: string) => {
    try {
      const res = await fetch("https://license-server-697p.onrender.com/admin/my-license", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to fetch license info");
      const data = await res.json();
      setUserInfo((prev) => ({
        ...prev,
        licenseStatus: data.licenseStatus ?? prev.licenseStatus,
        module_licenses:
          (data.module_licenses &&
            typeof data.module_licenses === "object" &&
            !Array.isArray(data.module_licenses))
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

  // **로딩 상태** 추가
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
  const [idForSignup, setIdForSignup] = useState(""); // (원래 email이었지만, ID로 사용)
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [workplaceName, setWorkplaceName] = useState("");
  const [workplaceAddress, setWorkplaceAddress] = useState("");
  const [marketingAgree, setMarketingAgree] = useState(false);
  // 약관 동의 상태
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

  // 'How to get the free license' 접근 경로 추적용 state
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

      // 로그인 성공 후 유저 정보 fetch
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

  // 국가 목록
  const countries = [
    "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cabo Verde","Cambodia","Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo (Brazzaville)","Congo (Kinshasa)","Costa Rica","Croatia","Cuba","Cyprus","Czech Republic","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway","Oman","Pakistan","Palau","Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino","Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Vanuatu","Vatican City","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe",
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

  // 모듈 목록
  const modules = [
    "On-site Solution Service (Korea only)",
    "Transfer Jig Maker",
    "STL Classifier",
    "HTML Viewer Converter",
    "Image Converter",
    "Booleaner",
    "Fuser",
  ];
  const MODULE_PRICES: Record<string, number> = {
    "1DAY": 3,
    "1WEEK": 19,
    "1MONTH": 49,
    "1YEAR": 290,
  };

  // 현재 페이지 origin
  const currentOrigin = useMemo(() => {
    if (typeof window === "undefined") return "https://www.dlas.io";
    return window.location.origin;
  }, []);

  // ─────────────────────────────────────────────────────
  // 🇰🇷 한국 사용자 → TossPayments
  // 🇺🇸 그 외 → Paddle
  // ─────────────────────────────────────────────────────
  
  const handleModulePayment = (mod: string, period: string) => {
    const storedId = localStorage.getItem("userID") || userID;
    if (!storedId) {
      alert("Please log in first.");
      setTimeout(() => {
        document.getElementById("login-modal")?.classList.remove("hidden");
      }, 100);
      return;
    }

    // We must know the user's country to choose USD(Paddle) vs KRW(Toss)
    if (!userInfo.country || userInfo.country.trim() === "") {
      alert("국가 정보를 불러오는 중입니다. 상단 'MY'에서 확인한 뒤 다시 시도해 주세요.");
      return;
    }

    // 🇰🇷 Korea → temporarily block KRW checkout and show 안내문
    if (isKrwDisplay(userInfo.country)) {
      alert(KOREA_PAYMENT_MESSAGE);
      return;
    }

    // 🌎 Non‑Korea → Paddle (USD)
    if (!paddleReady || !(window as MyWindow).Paddle) {
      alert("Paddle is not ready yet. Please refresh the page or try again.");
      return;
    }

    const priceId =
      MODULE_PRICE_IDS[mod] && MODULE_PRICE_IDS[mod][period]
        ? MODULE_PRICE_IDS[mod][period]
        : "";
    if (!priceId) {
      alert("No priceId registered for this module/period.");
      return;
    }

    const orderName = `${mod} (${period})`;
    const amount = MODULE_PRICES_USD[period];

    (window as MyWindow).Paddle!.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customer: { email: storedId },
      customData: { userID: storedId, module: mod, period, orderName, amount },
      closeCallback: () => console.log("Checkout closed"),
    });
  };


  // ✅ 패밀리 라이선스 테이블 데이터 (표시 통화 자동 전환)
  const familyTableData = [
    ["Transfer Jig Maker", asDisplayPrice(790, userInfo.country), "Free", "Automated jig generation software"],
    ["Image Converter", priceLabel("1DAY", userInfo.country), "Free", "Convert STL to image quickly"],
    ["Booleaner", asDisplayPrice(590, userInfo.country), "Free", "Fast automaitc Booleaner"],
    ["HTML Viewer Converter", priceLabel("1DAY", userInfo.country), "Free", "Convert STL to HTML viewer"],
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
    ["AI DLAS CAD (Expected 2026)", `${asDisplayPrice(59, userInfo.country)}/month`, `${asDisplayPrice(5.9, userInfo.country)}/month`, ""],
  ];

  // 이메일 복사 함수
  const handleCopyEmail = () => {
    navigator.clipboard.writeText("support@dlas.io");
  };

  // [추가] 다운로드 모달 띄우기
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  // ─────────────────────────────
  // Poster modal / gallery state
  // ─────────────────────────────
  const [showPosterModal, setShowPosterModal] = useState(false);
  const [posterIndex, setPosterIndex] = useState(0);

  const openPosterAt = (idx: number) => {
    setPosterIndex(idx);
    setShowPosterModal(true);
  };
  const prevPoster = () => setPosterIndex((i) => (i - 1 + POSTER_PATHS.length) % POSTER_PATHS.length);
  const nextPoster = () => setPosterIndex((i) => (i + 1) % POSTER_PATHS.length);

  /** ✅ 모달 이미지 영역 클릭 → 다음(오른쪽)으로 넘기기 */
  const handlePosterAreaClick = () => nextPoster();
  const handlePrevClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    prevPoster();
  };
  const handleNextClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    nextPoster();
  };

  // Auto‑open once per day on first visit
  useEffect(() => {
    try {
      const key = "DLAS_POSTER_SEEN_DATE";
      const today = new Date().toISOString().slice(0, 10);
      const seen = localStorage.getItem(key);
      if (seen !== today) {
        setShowPosterModal(true);
        localStorage.setItem(key, today);
      }
    } catch {}
  }, []);

  // Esc / ← → keyboard handlers in modal
  useEffect(() => {
    if (!showPosterModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowPosterModal(false);
      if (e.key === "ArrowLeft") prevPoster();
      if (e.key === "ArrowRight") nextPoster();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showPosterModal]);


  // 실제 다운로드 실행 함수
  const handleDownloadConfirm = () => {
    setShowDownloadModal(false);
    // 다운로드 시작
    window.location.href =
      "https://github.com/Kim-jong-hwan-1/dlas-website/releases/download/v1.5.0/DLAS_Installer.exe";
  };

  // ------------------
  // ✅ 2) Paddle 결제 로직
  // ------------------

  // Paddle 준비 여부
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

  // Paddle Checkout 열기
  const handlePaddleCheckout = () => {
    // 1) 스크립트 / Initialize 완료 확인
    if (!paddleReady) {
      alert("Paddle is not ready yet. Please wait or refresh the page.");
      return;
    }
    // 2) 실제 window.Paddle 객체 검사
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

  // ─────────────────────────────────────
  // 🇰🇷 Family 라이선스 → Toss 결제 유도
  // ─────────────────────────────────────
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
      if (!tossInit) { alert("The payment module has not been loaded yet."); return; }
      const tossPayments = tossInit(tossClientKey);

    const orderId = `DLAS-FAMILY-${Date.now()}`;
    const amount = 550000; // Family 고정가
    const userID = localStorage.getItem("userID") || "";

    const orderName = "DLAS Family License";

    const successUrl =
      `${currentOrigin}/?provider=toss&type=family&orderName=${encodeURIComponent(orderName)}` +
      `&orderId=${encodeURIComponent(orderId)}&amount=${encodeURIComponent(String(amount))}`;
    const failUrl =
      `${currentOrigin}/?provider=toss&type=family`;

    tossPayments.requestPayment("CARD", {
      amount,
      orderId,
      orderName,
      customerEmail: userID,
      customerName: (userInfo && userInfo.name) ? userInfo.name : userID,
      successUrl,
      failUrl,
    });
  };

  // "가족 라이선스 결제" 버튼 클릭 -> 국가별 결제수단 분기
  
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
    // 🇰🇷 Korea → temporarily block KRW checkout
    if (isKrwDisplay(userInfo.country)) {
      alert(KOREA_PAYMENT_MESSAGE);
      return;
    }
    // 🌎 Others → Paddle family checkout
    handlePaddleCheckout();
  };



  return (
    <>
      {/* ✅ Hydration mismatch 방지: <html> 속성은 클라이언트에서 변경하지 않습니다. */}
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

      {/* ✅ 홈페이지 진입 시 ko 기본값만 로컬에 저장 (SSR 마크업과의 충돌 방지를 위해 html/data 속성은 건드리지 않음) */}
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
        {/* ▲ 왼쪽 위: 로고 + (보여지는) 언어 선택 ------------------------- */}
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
              {/* 세미나 탭을 최상단(첫 번째)으로 배치 */}
              <button
                onClick={() => scrollToSection("posters")}
                className="relative pb-2 transition-colors duration-200 cursor-pointer
                           border-b-2 border-transparent hover:border-black
                           text-gray-700 hover:text-black"
              >
                세미나
              </button>
              {["home", "download", "buy", "contact"].map((tab) => (
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
          {/* ★★★ 세미나 / 포스터 섹션을 가장 위로 이동 ★★★ */}
          <section
            id="posters"
            className="scroll-mt-[180px] py-20 bg-gradient-to-b from-white to-gray-50"
          >
            <div className="max-w-6xl mx-auto px-6">
              <div className="flex items-center justify-between mb-6">
                {/* "세미나 & 광고" → "세미나" 로 변경 */}
                <h2 className="text-4xl font-bold">세미나</h2>
                <button
                  className="border px-4 py-2 rounded hover:bg-gray-100"
                  onClick={() => openPosterAt(0)}
                >
                  전체 보기
                </button>
              </div>
              <p className="text-gray-600 mb-6">
                최신 행사/세미나 정보를 한 곳에서 확인하세요. 이미지를 클릭하면 크게 볼 수 있습니다.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {POSTER_PATHS.map((src, idx) => (
                  <button
                    key={idx}
                    className="group relative rounded-xl overflow-hidden border bg-white shadow-sm hover:shadow-lg transition"
                    onClick={() => openPosterAt(idx)}
                    aria-label={`Open poster ${idx+1}`}
                  >
                    {/* Use native img to avoid Next<Image> domain constraints for user-provided assets */}
                    <img
                      src={src}
                      alt={`poster-${idx+1}`}
                      className="w-full h-48 object-cover group-hover:scale-[1.02] transition-transform duration-300"
                      loading="lazy"
                    />
                    <span className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent text-white text-xs px-2 py-1">
                      Poster {idx + 1}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* 홈 섹션 */}
          <section id="home" className="scroll-mt-[180px] text-center py-20">
            <p className="text-xl text-gray-300 mb-2">
              <span className="text-5xl font-bold block">
                {t("home.subtitle")}
              </span>
            </p>
            <h1 className="text-6xl font-bold mb-8">{t("home.title")}</h1>

            {/* --- 강조 영역 (라이선스 배너 제거, 버튼만 유지) --- */}
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
                Get the free license!
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
          <section
            id="download"
            className="scroll-mt-[180px] text-center py-20 bg-gray-100"
          >
            <h2 className="text-4xl font-bold mb-4">{t("download.title")}</h2>
            <p className="text-lg text-gray-500 max-w-3xl mx-auto mt-2">
              <br />
              {t("download.desc.line3")}
              <br />
              {t("download.desc.line4")}
            </p>

            {/* ✅ 1.5.0 & MeshFix 버튼만 노출 */}
            <div className="mt-8 flex flex-col items-center space-y-4 w-full">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 w-full max-w-md">
                {/* DLAS 1.5.0 */}
                <a
                  href="https://github.com/Kim-jong-hwan-1/dlas-website/releases/download/v1.5.0/DLAS_Installer.exe"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-black text-white px-6 py-3 rounded hover:bg-gray-800 transition w-full sm:w-auto text-center"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowDownloadModal(true);
                  }}
                >
                  Download&nbsp;v1.5.0
                </a>
                {/* MeshFix */}
                <div className="flex flex-col items-start sm:items-end">
                  <a
                    href="https://github.com/MarcoAttene/MeshFix-V2.1/archive/refs/heads/master.zip"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 transition w-full sm:w-auto text-center"
                  >
                    MeshFix&nbsp;2.1.0&nbsp;(Source)
                  </a>
                  <span className="text-[10px] text-gray-600 mt-1 sm:text-right leading-tight">
                    MeshFix (GPL v3 – commercial use requires a separate license from IMATI-CNR)
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* 구매 섹션 */}
          <section
            id="buy"
            className="scroll-mt-[180px] text-center py-20 bg-white"
          >
            <h2 className="text-4xl font-bold mb-12">{t("nav.buy")}</h2>

            {(() => {
              const MODULE_NAME_TO_ID: Record<string, string> = {
                "Transfer Jig Maker": "9",
                "STL Classifier": "2",
                "HTML Viewer Converter": "5",
                "Image Converter": "6",
                "Booleaner": "4",
                "Fuser": "7",
              };

              const info: Record<
                string,
                { gif: string | null; youtube: string | null; image: string | null }
              > = {
                "On-site Solution Service (Korea only)": {
                  gif: null,
                  youtube: null,
                  image: null,
                },
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
                Booleaner: {
                  gif: "/gifs/denture_booleaner.gif",
                  youtube: "f5DBv8m-iJU",
                  image: "/modules/fast_denture_booleaner.png",
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

              // 1. 일반 모듈 카드들
              const moduleCards = modules
                .filter((mod) => mod !== "On-site Solution Service (Korea only)")
                .map((mod) => {
                  const { gif, youtube, image } = info[mod] ?? { gif: null, youtube: null, image: null };
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
                  const { display: expireDisplay, debug: expireDebug } = formatExpiration(expireUtc ?? undefined);
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
                            <span className="text-2xl font-extrabold px-4 break-words">{mod}</span>
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
                          <div className="flex flex-row w-full justify-center items-center gap-2">
                            <button
                              className="bg-black text-white rounded-lg w-1/4 h-12 text-base font-extrabold flex flex-col items-center justify-center transition hover:bg-gray-800"
                              onClick={() => handleModulePayment(mod, "1DAY")}
                            >
                              <span className="text-lg leading-5">1DAY</span>
                              <span className="text-xs leading-5">{priceLabel("1DAY", userInfo.country)}</span>
                            </button>
                            <button
                              className="bg-black text-white rounded-lg w-1/4 h-12 text-base font-extrabold flex flex-col items-center justify-center transition hover:bg-gray-800"
                              onClick={() => handleModulePayment(mod, "1WEEK")}
                            >
                              <span className="text-lg leading-5">1WEEK</span>
                              <span className="text-xs leading-5">{priceLabel("1WEEK", userInfo.country)}</span>
                            </button>
                            <button
                              className="bg-black text-white rounded-lg w-1/4 h-12 text-base font-extrabold flex flex-col items-center justify-center transition hover:bg-gray-800"
                              onClick={() => handleModulePayment(mod, "1MONTH")}
                            >
                              <span className="text-lg leading-5">1MONTH</span>
                              <span className="text-xs leading-5">{priceLabel("1MONTH", userInfo.country)}</span>
                            </button>
                            <button
                              className="bg-black text-white rounded-lg w-1/4 h-12 text-base font-extrabold flex flex-col items-center justify-center transition hover:bg-gray-800"
                              onClick={() => handleModulePayment(mod, "1YEAR")}
                            >
                              <span className="text-lg leading-5">1YEAR</span>
                              <span className="text-xs leading-5">{priceLabel("1YEAR", userInfo.country)}</span>
                            </button>
                          </div>
                          <div className="w-full text-center mt-3">
                            {isLoggedIn ? (
                              <span className="text-xs text-gray-600 font-mono">
                                License expires:&nbsp;
                                {expireDisplay ? (
                                  <>
                                    <span className="text-black">{expireDisplay}</span>
                                    <span className="text-xs text-gray-500">&nbsp;(UTC)</span>
                                  </>
                                ) : (
                                  <span className="text-red-500">
                                    Not activated{expireDebug ? ` (reason: ${expireDebug})` : ""}
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">* Log in to check your license</span>
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
                            <span className="text-2xl sm:text-3xl font-extrabold px-4 break-words">{mod}</span>
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
                              <span className="text-gray-400 text-2xl font-bold flex items-center justify-center w-full h-full">
                                Coming&nbsp;Soon
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-3 w-40 flex-shrink-0 h-full justify-center items-center">
                          <button
                            className="bg-black text-white rounded-lg w-32 h-16 text-lg font-extrabold flex flex-col items-center justify-center transition hover:bg-gray-800"
                            onClick={() => handleModulePayment(mod, "1DAY")}
                          >
                            <span className="text-xl leading-5">1DAY</span>
                            <span className="text-base leading-5">{priceLabel("1DAY", userInfo.country)}</span>
                          </button>
                          <button
                            className="bg-black text-white rounded-lg w-32 h-16 text-lg font-extrabold flex flex-col items-center justify-center transition hover:bg-gray-800"
                            onClick={() => handleModulePayment(mod, "1WEEK")}
                          >
                            <span className="text-xl leading-5">1WEEK</span>
                            <span className="text-base leading-5">{priceLabel("1WEEK", userInfo.country)}</span>
                          </button>
                          <button
                            className="bg-black text-white rounded-lg w-32 h-16 text-lg font-extrabold flex flex-col items-center justify-center transition hover:bg-gray-800"
                            onClick={() => handleModulePayment(mod, "1MONTH")}
                          >
                            <span className="text-xl leading-5">1MONTH</span>
                            <span className="text-base leading-5">{priceLabel("1MONTH", userInfo.country)}</span>
                          </button>
                          <button
                            className="bg-black text-white rounded-lg w-32 h-16 text-lg font-extrabold flex flex-col items-center justify-center transition hover:bg-gray-800"
                            onClick={() => handleModulePayment(mod, "1YEAR")}
                          >
                            <span className="text-xl leading-5">1YEAR</span>
                            <span className="text-base leading-5">{priceLabel("1YEAR", userInfo.country)}</span>
                          </button>
                          <div className="w-full text-center mt-4">
                            {isLoggedIn ? (
                              <span className="text-xs text-gray-600 font-mono">
                                License expires:&nbsp;
                                {expireDisplay ? (
                                  <>
                                    <span className="text-black">{expireDisplay}</span>
                                    <span className="text-xs text-gray-500">&nbsp;(UTC)</span>
                                  </>
                                ) : (
                                  <span className="text-red-500">
                                    Not activated{expireDebug ? ` (reason: ${expireDebug})` : ""}
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">* Log in to check your license</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                });

              // 2. 방문 솔루션 서비스 카드
              const onsiteCard = (
                <div
                  key="On-site Solution Service (Korea only)"
                  className="
                    relative
                    bg-gray-50 rounded-2xl border shadow-md px-2 py-8
                    flex flex-col sm:flex-row items-center
                    h-auto sm:h-80 sm:min-h-[320px] sm:max-h-[320px] gap-6
                  "
                >
                  {/* 모바일 (세로) */}
                  <div className="flex flex-col w-full sm:hidden gap-4">
                    <div className="text-2xl font-extrabold text-left">
                      방문 솔루션 <span className="text-base text-gray-400">(한국 한정/only for korea)</span>
                    </div>
                    <div className="text-gray-800 text-base font-bold">
                      직접 방문하여 기공소 내의 문제를 해결하고, 최적화된 솔루션을 제공합니다.
                    </div>
                    <div className="text-gray-700 text-base">
                      We visit your dental lab in person to solve workflow issues and provide optimized solutions.
                    </div>
                    <div className="flex flex-row justify-between items-center">
                      <span className="text-xl font-extrabold text-black whitespace-nowrap">
                        ₩550,000
                        <span className="text-xs ml-1 font-medium text-gray-500">(VAT included, 부가세 포함)</span>
                      </span>
                    </div>
                    <div className="mt-3 text-center">
                      <span className="text-base font-bold text-blue-700 block mb-1" style={{ fontSize: '1.1rem' }}>
                        문의/예약: <a href="mailto:techdev@dlas.io" className="underline">techdev@dlas.io</a>
                      </span>
                      <span className="text-xs text-gray-500 block">
                        * 본 서비스는 대한민국 기공소만 신청 가능합니다.<br />
                        * This service is only available for dental labs in South Korea.
                      </span>
                    </div>
                  </div>
                  {/* 데스크탑 (가로) */}
                  <div className="hidden sm:flex flex-row items-center w-full h-full gap-6">
                    <div className="w-80 flex flex-col items-start justify-center h-full px-8">
                      <span className="text-3xl font-extrabold text-black">
                        방문 솔루션
                      </span>
                      <span className="text-base text-gray-400 font-bold ml-1 mt-1">(한국 한정/only for korea)</span>
                    </div>
                    <div className="flex-1 flex flex-col justify-center h-full px-2 text-left gap-2">
                      <div className="text-lg text-gray-800 font-bold">
                        직접 방문하여 기공소 내의 문제를 해결하고, 최적화된 솔루션을 제공합니다.
                      </div>
                      <div className="text-base text-gray-700">
                        We visit your dental lab in person to solve workflow issues and provide optimized solutions.
                      </div>
                      <div className="mt-3">
                        <span className="text-base font-bold text-blue-700" style={{ fontSize: '1.15rem' }}>
                          문의/예약: <a href="mailto:techdev@dlas.io" className="underline">techdev@dlas.io</a>
                        </span>
                        <span className="text-xs text-gray-500 block mt-1">
                          * 본 서비스는 대한민국 기공소만 신청 가능합니다.<br />
                          * This service is only available for dental labs in South Korea.
                        </span>
                      </div>
                    </div>
                    <div className="w-64 flex flex-col items-center justify-center">
                      <span className="text-3xl font-extrabold text-black">
                        ₩550,000
                      </span>
                      <span className="text-xs mt-1 font-medium text-gray-500">
                        (VAT included, 부가세 포함)
                      </span>
                    </div>
                  </div>
                </div>
              );

              return (
                <div className="flex flex-col gap-y-16 w-full max-w-6xl mx-auto">
                  {moduleCards}
                  {onsiteCard}
                </div>
              );
            })()}
          </section>

          {/* 연락처 섹션 */}
          <section
            id="contact"
            className="scroll-mt-[180px] py-20 text-center bg-gray-100"
          >
            <h2 className="text-4xl font-bold">{t("contact.title")}</h2>
            <p className="text-lg text-gray-500 max-w-3xl mx-auto mt-4">
              {t("contact.info1")}
              <br />
              {t("contact.info2")}
              <br />
              Phone (Korea): +82-10-9756-1992
              <br />
              Kakao: Dlas_official
              <br />
              WhatsApp:{" "}
              <a
                href="https://wa.me/821097561992"
                target="_blank"
                rel="noopener noreferrer"
              >
                wa.me/821097561992
              </a>
            </p>
          </section>

          {/* --- Terms & Privacy 섹션 --- */}
          <section
            id="terms-privacy"
            className="scroll-mt-[180px] py-20 px-6 bg-white"
          >
            <div className="max-w-4xl mx-auto text-left leading-7 text-gray-700">
              <h2 className="text-4xl font-bold mb-8 text-center">
                {t("terms.title")}
              </h2>

              {/* (약관 및 개인정보처리방침 내용은 동일) */}
              <h3 className="text-2xl font-bold mb-4">
                {t("terms.headingTerms")}
              </h3>
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
                  <h4 className="font-semibold mb-1">
                    {t(`terms.${a}.title`)}
                  </h4>
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

              <h3 className="text-2xl font-bold mb-4">
                {t("privacy.headingPrivacy")}
              </h3>
              <p className="mb-4">{t("privacy.intro")}</p>
              {[
                "article1",
                "article2",
                "article3",
                "article4",
                "article5",
                "article6",
                "article7",
              ].map((a) => (
                <div key={a}>
                  <h4 className="font-semibold mb-1">
                    {t(`privacy.${a}.title`)}
                  </h4>
                  <p
                    className="mb-4"
                    dangerouslySetInnerHTML={{
                      __html: t(`privacy.${a}.desc`),
                    }}
                  />
                </div>
              ))}
              <p className="mb-4">
                <strong>{t("privacy.effectiveDate")}</strong>
              </p>
            </div>
          </section>
        </main>

        {/* ─────────────────────────────────────────────────────────── */}
        {/*      Toss 결제 결과 & 승인요청 모달 (승인 직전 단계)       */}
        {/* ─────────────────────────────────────────────────────────── */}
        {tossModalOpen && tossPayload && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-50 overflow-auto">
            <div className="flex min-h-full items-start justify-center px-6 py-10">
              <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-[760px] relative">
                <button
                  onClick={() => {
                    setTossModalOpen(false);
                    clearTossQuery();
                  }}
                  className="absolute top-3 right-4 text-gray-400 hover:text-black text-2xl"
                >
                  ×
                </button>

                {tossPayload.status === "success" ? (
                  <>
                    <h3 className="text-2xl font-bold mb-2">Toss 결제 성공 (승인 전)</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      결제 정보가 수신되었습니다. 아래 <b>승인요청</b>을 누르면 서버가 Toss에 결제 승인을 요청합니다.
                    </p>

                    <div className="bg-gray-50 border rounded p-4 text-sm mb-4">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        <div><b>Status</b></div><div>success (승인 전)</div>
                        <div><b>Type</b></div><div>{tossPayload.type}</div>
                        {tossPayload.module && (<><div><b>Module</b></div><div>{tossPayload.module}</div></>)}
                        {tossPayload.period && (<><div><b>Period</b></div><div>{tossPayload.period}</div></>)}
                        {tossPayload.orderName && (<><div><b>OrderName</b></div><div>{tossPayload.orderName}</div></>)}
                        <div><b>OrderId</b></div><div className="break-all">{tossPayload.orderId}</div>
                        <div><b>PaymentKey</b></div><div className="break-all">{tossPayload.paymentKey}</div>
                        <div><b>Amount</b></div><div>{tossPayload.amount.toLocaleString()}원</div>
                        {tossPayload.userEmail && (<><div><b>User</b></div><div>{tossPayload.userEmail}</div></>)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        className="bg-black text-white px-6 py-2 rounded hover:bg-gray-800 transition disabled:opacity-50"
                        disabled={tossApproveState === "requesting"}
                        onClick={requestServerApproval}
                      >
                        {tossApproveState === "requesting" ? "승인 요청 중..." :
                         tossApproveState === "ok" ? "승인 완료" :
                         tossApproveState === "fail" ? "승인 실패. 재시도" : "서버에 승인요청"}
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
                        <div><b>Status</b></div><div>fail</div>
                        {tossPayload.code && (<><div><b>Code</b></div><div>{tossPayload.code}</div></>)}
                        {tossPayload.message && (<><div><b>Message</b></div><div className="break-all">{tossPayload.message}</div></>)}
                        <div><b>OrderId</b></div><div className="break-all">{tossPayload.orderId || "-"}</div>
                        <div><b>Amount</b></div><div>{(tossPayload.amount||0).toLocaleString()}원</div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">원인 확인 후 다시 시도해 주세요.</p>
                  </>
                )}

                {/* ✅ 모바일 하단 닫기 버튼 */}
                <div className="mt-6 sm:hidden">
                  <button
                    onClick={() => { setTossModalOpen(false); clearTossQuery(); }}
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
          <div className="fixed inset-0 z-50 bg-black bg-opacity-50 overflow-auto">
            <div className="flex min-h-full items-start justify-center px-6 py-10">
              <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-[1100px] relative overflow-x-auto">
                <button
                  onClick={() => {
                    setShowFamilyModal(false);
                    setShowFreeLicenseGuide(false);
                    setShowPaymentProceed(false);
                  }}
                  className="absolute top-4 right-4 text-gray-400 hover:text-black text-2xl"
                >
                  ×
                </button>

                {showPaymentProceed ? (
                  /* --- 결제 진행 화면 --- */
                  <div>
                    <h2 className="text-xl font-bold mb-4 text-center">
                      {t("payment.title")}
                    </h2>
                    <div className="text-sm text-gray-700 leading-relaxed space-y-3">
                      <p className="font-bold text-red-600">
                        {t("payment.warning")}
                      </p>
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
                  /* --- 무료 라이선스 안내 화면 --- */
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
                  /* --- 패밀리 라이선스 안내 기본 화면 --- */
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
                        {familyTableData.map(
                          ([title, price1, price2, desc], idx) => (
                            <tr key={idx}>
                              <td className="p-2 border">{title}</td>
                              <td className="p-2 border text-center">
                                {price1}
                              </td>
                              <td className="p-2 border text-center">
                                {price2}
                              </td>
                              <td className="p-2 border">{desc}</td>
                            </tr>
                          )
                        )}
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
                              alert(
                                "You are already a Family user. Payment is not possible."
                              );
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

                {/* ✅ 모바일 하단 닫기 버튼 */}
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
          <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center px-4">
            <div className="bg-white w-full max-w-md p-8 rounded-lg shadow-xl relative">
              <button
                className="absolute top-2 right-3 text-gray-500 hover:text-black text-2xl"
                onClick={() => setShowPaymentSupportModal(false)}
              >
                ×
              </button>
              <h2 className="text-2xl font-bold mb-4 text-center">
                {t("purchase.title")}
              </h2>
              <p className="text-sm text-gray-700 leading-relaxed mb-4">
                {t("purchase.desc")}
              </p>
              <div className="flex items-center justify-between gap-2 bg-gray-100 rounded p-2 mb-4">
                <span className="text-black text-sm font-bold">
                  support@dlas.io
                </span>
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
          <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center px-4">
            <div className="bg-white w-full max-w-lg p-6 rounded-lg shadow-xl relative">
              <button
                className="absolute top-2 right-3 text-gray-500 hover:text-black text-2xl"
                onClick={() => setShowDownloadModal(false)}
              >
                ×
              </button>

              <h2 className="text-xl font-bold mb-3">※ Notice</h2>
              <ul className="text-sm text-gray-700 list-disc pl-5 mb-6 space-y-2">
                <li>
                  You may see a message like{" "}
                  <em>"This file isn't commonly downloaded."</em>
                </li>
                <li>
                  This installer is distributed only through the official DLAS
                  website and is safe to use.
                </li>
                <li>
                  If you see a warning, please click "additional information" or
                  "Continue" to proceed with the installation.
                </li>
                <li>
                  A digitally signed (code-signed) version will be provided
                  soon.
                </li>
                <li>
                  For any questions, please contact{" "}
                  <strong>support@dlas.io</strong>.
                </li>
              </ul>

              <h2 className="text-xl font-bold mb-3">※ 안내</h2>
              <ul className="text-sm text-gray-700 list-disc pl-5 mb-6 space-y-2">
                <li>
                  "이 파일은 일반적으로 다운로드되지 않습니다"라는 메시지가 보일
                  수 있습니다.
                </li>
                <li>
                  본 설치 파일은 DLAS 공식 홈페이지에서만 배포하며, 안전하게
                  사용하실 수 있습니다.
                </li>
                <li>
                  다운로드 경고가 나오더라도 '계속' 또는 '추가정보' 버튼을 눌러
                  설치를 진행해 주세요.
                </li>
                <li>
                  정식 코드서명(디지털 인증서)이 적용된 버전은 곧 제공될
                  예정입니다.
                </li>
                <li>
                  궁금한 점은 <strong>support@dlas.io</strong>로 문의해 주세요.
                </li>
              </ul>

              <div className="text-center mt-4">
                <button
                  onClick={handleDownloadConfirm}
                  className="bg-black text-white px-6 py-2 rounded hover:bg-gray-800 transition"
                >
                  확인
                </button>
              </div>

              {/* ✅ 모바일 하단 닫기 버튼 */}
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

        {/* Poster Modal */}
        {showPosterModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4">
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-6xl">
              {/* 닫기 버튼 */}
              <button
                className="absolute top-2 right-3 text-gray-500 hover:text-black text-2xl"
                onClick={() => setShowPosterModal(false)}
                aria-label="Close poster viewer"
              >
                ×
              </button>

              {/* 본문: 이미지 영역 + 우측 신청 패널 */}
              <div className="flex flex-col md:flex-row items-stretch">
                {/* 이미지 영역 (클릭하면 다음으로 이동) */}
                <div
                  className="relative flex-1 px-2 py-2 md:px-4 md:py-4 flex items-center justify-center cursor-pointer select-none"
                  onClick={handlePosterAreaClick}
                >
                  {/* 좌우 화살표 (오버레이 / 반투명 / 사이즈 확대) */}
                  <button
                    className="
                      hidden md:flex
                      absolute left-3 top-1/2 -translate-y-1/2
                      items-center justify-center
                      rounded-full p-2 md:p-3
                      text-3xl md:text-5xl
                      text-white bg-black/30 hover:bg-black/40
                      backdrop-blur-sm
                      opacity-80 hover:opacity-100
                      transition
                    "
                    onClick={handlePrevClick}
                    aria-label="Previous poster"
                    title="이전"
                  >
                    ◀︎
                  </button>

                  <img
                    src={POSTER_PATHS[posterIndex]}
                    alt={`poster-${posterIndex + 1}`}
                    className="max-h-[78vh] w-auto object-contain rounded"
                  />

                  <button
                    className="
                      hidden md:flex
                      absolute right-3 top-1/2 -translate-y-1/2
                      items-center justify-center
                      rounded-full p-2 md:p-3
                      text-3xl md:text-5xl
                      text-white bg-black/30 hover:bg-black/40
                      backdrop-blur-sm
                      opacity-80 hover:opacity-100
                      transition
                    "
                    onClick={handleNextClick}
                    aria-label="Next poster"
                    title="다음"
                  >
                    ▶︎
                  </button>
                </div>

                {/* 우측 신청 패널 */}
                <aside className="w-full md:w-72 border-t md:border-t-0 md:border-l px-5 py-5 bg-gray-50 flex flex-col gap-4">
                  <a
                    href="https://docs.google.com/forms/d/1x2C1I_Zx5QjedpJa-Y6r7HMb4cYy3O_EDVTIAmAEHMQ/edit"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full text-center font-bold rounded-lg px-5 py-3 bg-black text-white hover:bg-gray-800 transition"
                  >
                    신청하기
                  </a>

                  {/* 안내 문구 */}
                  <div className="space-y-2 text-sm leading-relaxed">
                    <div className="bg-red-50 border border-red-200 text-red-700 font-bold rounded px-3 py-2">
                      ⚠⚠⚠ 경북 마감 임박 ⚠⚠⚠
                    </div>
                    <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded px-3 py-2">
                      경북 신청의 경우 <b>문의 후 진행</b>해주세요.
                    </div>
                  </div>

                  {/* 모바일 전용 간단 화살표 버튼 */}
                  <div className="flex md:hidden justify-between pt-2">
                    <button
                      className="px-3 py-2 rounded bg-white border text-lg opacity-80"
                      onClick={prevPoster}
                      aria-label="Previous poster (mobile)"
                    >
                      ◀︎
                    </button>
                    <button
                      className="px-3 py-2 rounded bg-white border text-lg opacity-80"
                      onClick={nextPoster}
                      aria-label="Next poster (mobile)"
                    >
                      ▶︎
                    </button>
                  </div>

                  {/* 안내문 + 바로 아래 배지 이미지 */}
                  <div className="text-center text-xs text-gray-500 pt-2 mb-1">
                    이미지를 탭/클릭하면 다음으로 넘어갑니다.
                  </div>
                  {/* 데스크톱에서만 노출(필요시 md:hidden 제거로 모바일에도 표시 가능) */}
                  <div className="hidden md:block">
                    <img
                      src="/posters/10.png"
                      alt="DLAS 풀모듈 3일 라이선스 무료 증정"
                      className="w-full h-auto object-contain rounded-md"
                      loading="eager"
                    />
                  </div>
                </aside>
              </div>

              {/* 인디케이터 */}
              <div className="px-4 pb-4 text-center text-sm text-gray-600">
                {posterIndex + 1} / {POSTER_PATHS.length}
              </div>

              {/* ✅ 모바일 하단 닫기 버튼 */}
              <div className="px-4 pb-4 sm:hidden">
                <button
                  onClick={() => setShowPosterModal(false)}
                  className="w-full bg-black text-white py-3 rounded hover:bg-gray-800 transition"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 로그인 모달 */}
        <div
          id="login-modal"
          className="fixed inset-0 z-50 hidden bg-black bg-opacity-50 flex items-center justify-center"
        >
          <div className="bg-white w-full max-w-md p-8 rounded-lg shadow-xl relative">
            <button
              className="absolute top-2 right-3 text-gray-500 hover:text-black"
              onClick={() =>
                document.getElementById("login-modal")!.classList.add("hidden")
              }
            >
              ×
            </button>
            <h2 className="text-2xl font-bold mb-4 text-center">
              {t("login.title")}
            </h2>
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
              <button
                type="submit"
                className="w-full bg-black text-white py-3 rounded hover:bg-gray-800"
              >
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
                  document
                    .getElementById("login-modal")!
                    .classList.add("hidden");
                  document
                    .getElementById("signup-modal")!
                    .classList.remove("hidden");
                }}
              >
                {t("login.form.signupNow")}
              </a>
            </p>

            {/* ✅ 모바일 하단 닫기 버튼 */}
            <div className="mt-6 sm:hidden">
              <button
                className="w-full border px-6 py-3 rounded hover:bg-gray-50 transition"
                onClick={() =>
                  document.getElementById("login-modal")!.classList.add("hidden")
                }
              >
                닫기
              </button>
            </div>
          </div>
        </div>

        {/* 회원가입 모달 */}
        <div
          id="signup-modal"
          className="fixed inset-0 z-50 hidden bg-black bg-opacity-50 flex items-center justify-center"
        >
          <div className="bg-white w-full max-w-md p-8 rounded-lg shadow-xl relative">
            <button
              className="absolute top-2 right-3 text-gray-500 hover:text-black"
              onClick={() =>
                document.getElementById("signup-modal")!.classList.add("hidden")
              }
            >
              ×
            </button>
            <h2 className="text-2xl font-bold mb-4 text-center">
              {t("signup.title")}
            </h2>
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
                <option value="">
                  {t("signup.form.countryPlaceholder")}
                </option>
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
                  <span className="ml-2">
                    {t("signup.form.agreeRequired")}
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={marketingAgree}
                    onChange={(e) => setMarketingAgree(e.target.checked)}
                    className="form-checkbox h-5 w-5 text-black"
                  />
                  <span className="ml-2">
                    {t("signup.form.agreeMarketing")}
                  </span>
                </label>
              </div>

              {passwordError && (
                <p className="text-red-500 text-sm">{passwordError}</p>
              )}

              <button
                type="submit"
                className="w-full bg-black text-white py-3 rounded hover:bg-gray-800"
              >
                {t("signup.form.submit")}
              </button>
            </form>

            {/* ✅ 모바일 하단 닫기 버튼 */}
            <div className="mt-6 sm:hidden">
              <button
                className="w-full border px-6 py-3 rounded hover:bg-gray-50 transition"
                onClick={() =>
                  document.getElementById("signup-modal")!.classList.add("hidden")
                }
              >
                닫기
              </button>
            </div>
          </div>
        </div>

        {/* MY 모달 */}
        {showMyModal && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white w-full max-w-md p-8 rounded-lg shadow-xl relative">
              <button
                className="absolute top-2 right-3 text-gray-500 hover:text-black text-2xl"
                onClick={() => setShowMyModal(false)}
              >
                ×
              </button>
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

              {/* ✅ 모바일 하단 닫기 버튼 */}
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
        
        {/* Floating poster FAB */}
        <button
          onClick={() => openPosterAt(0)}
          className="fixed bottom-6 right-6 z-40 rounded-full shadow-lg border bg-white px-4 py-3 text-sm hover:bg-gray-50"
          aria-label="Open seminar posters"
          title="세미나 포스터"
        >
          포스터
        </button>

        <footer className="bg-black text-white py-10 px-6 mt-20">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-4">
              <div className="text-sm">
                © {new Date().getFullYear()} DLAS. {t("footer.rights")}
              </div>
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
                <p>주소 : 대전광역시 유성구 테크노4로 17 대덕비즈센터 C307호, 대한민국</p>
                <p>전화 : +82-10-9756-1992 (대한민국)</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
