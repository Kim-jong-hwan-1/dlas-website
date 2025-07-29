"use client";

declare global {
  interface Window {
    // TossPayments 타입 (전체)
    TossPayments?: (
      clientKey: string
    ) => {
      requestPayment: (
        paymentMethod: string,
        options: {
          amount: number;
          orderId: string;
          orderName: string;
          customerEmail: string;
          successUrl: string;
          failUrl: string;
        }
      ) => Promise<void>;
    };

    // Paddle Billing v2용 타입
    Paddle?: {
      Environment?: {
        set: (env: string) => void;
      };
      Initialize: (config: {
        token: string;
        checkout?: {
          settings?: {
            displayMode?: string;
            locale?: string;
          };
        };
      }) => void;
      Checkout: {
        open: (
          opts:
            | {
                // ✅ (단일 priceId 방식)
                priceId: string;
                quantity?: number;
                customer: { email: string };
                customData?: { [key: string]: any };
                discountCode?: string; // 할인 코드 필드
                closeCallback?: () => void;
              }
            | {
                // ✅ (items 배열 방식: 여러 priceId)
                items: { priceId: string; quantity?: number }[];
                customer: { email: string };
                customData?: { [key: string]: any };
                discountCode?: string; // 할인 코드 필드
                closeCallback?: () => void;
              }
        ) => void;
      };
    };
  }
}

export {}; // 타입 선언 파일에서는 필요 (중복 선언 방지)

import Head from "next/head";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useLang } from "@/components/LanguageWrapper";
import LanguageSelector from "@/components/LanguageSelector";
import Script from "next/script";

// --------------------------------
// ✅ 1) Paddle 환경/토큰/priceId 상수 정의
// --------------------------------
const isSandbox = process.env.NEXT_PUBLIC_PADDLE_ENV === "sandbox";

// Sandbox / Live 구분하여 환경 변수 세팅
const PADDLE_TOKEN = isSandbox
  ? process.env.NEXT_PUBLIC_PADDLE_TOKEN_SB!
  : process.env.NEXT_PUBLIC_PADDLE_TOKEN!;

const PADDLE_PRICE_ID = isSandbox
  ? process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_SB!
  : process.env.NEXT_PUBLIC_PADDLE_PRICE_ID!;

export default function Page() {
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

  // (2) 로그아웃 함수
  const handleLogout = () => {
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
  }>({});

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
        setUserID(storedID);
        fetchUserInfo(storedID);
      }
    }
  }, [showMyModal]); // eslint-disable-line react-hooks/exhaustive-deps

  // 국가 목록
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
    "Dominica",
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

  // 모듈 목록 (필요한 4개만 남김)
  const modules = [
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

  const handleModulePayment = (mod: string, period: string) => {
    if (!paddleReady || !window.Paddle) {
      alert("Paddle is not ready yet. Please wait or refresh the page.");
      return;
    }
    const storedId = localStorage.getItem("userID") || userID;
    if (!storedId) {
      alert("Please log in first.");
      // 안내창 '확인' 후 로그인 모달 자동 오픈
      setTimeout(() => {
        document.getElementById("login-modal")?.classList.remove("hidden");
      }, 100);
      return;
    }
    const orderName = `${mod} (${period})`;
    const amount = MODULE_PRICES[period];
  
    window.Paddle.Checkout.open({
      items: [
        {
          priceId: PADDLE_PRICE_ID,
          quantity: 1,
        },
      ],
      customer: { email: storedId },
      customData: { userID: storedId, module: mod, period, orderName, amount },
      closeCallback: () => console.log("Checkout closed"),
    });
  };
  
  // 패밀리 라이선스 테이블용 데이터
  const familyTableData = [
    ["Transfer Jig Maker", "$790", "Free", "Automated jig generation software"],
    ["Image Converter ", "$390", "Free", "Convert STL to image quickly"],
    ["Booleaner", "$590", "Free", "Fast automaitc Booleaner"],
    ["HTML Viewer Converter ", "$390", "Free", "Convert STL to HTML viewer"],
    [
      "Printing Model Maker (Expected July 2025)",
      "$590",
      "Free",
      "Lightweight model creator",
    ],
    [
      "Bite Finder (Expected July 2025)",
      "$1,090",
      "Free",
      "Revolutionary bite locator for model-less workflows",
    ],
    [
      "STL Classifier (Expected July 2025)",
      "$590",
      "Free",
      "Classify STL by color and height",
    ],
    [
      "Denture CAD (Expected 2025)",
      "$790",
      "Free",
      "Arrangement library, labial facing, custom tray",
    ],
    [
      "Crown CAD (Expected 2025)",
      "$790",
      "Free",
      "Integrated crown CAD with the best features",
    ],
    ["...new module 1 (Coming Soon)", "$790", "Free", ""],
    ["...new module 2 (Coming Soon)", "$790", "Free", ""],
    ["...new module 3 (Coming Soon)", "$790", "Free", ""],
    ["AI DLAS CAD (Expected 2026)", "$59/month", "$5.9/month", ""],
  ];

  // 이메일 복사 함수
  const handleCopyEmail = () => {
    navigator.clipboard.writeText("support@dlas.io");
  };

  // [추가] 다운로드 모달 띄우기
  const [showDownloadModal, setShowDownloadModal] = useState(false);

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

  // ** 1) 할인코드 State 추가 **  (UI 삭제됨 – 로직은 유지)
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
    if (!window.Paddle) {
      alert("Paddle object is missing. (Check ad-blocker or domain settings)");
      return;
    }

    const storedId = localStorage.getItem("userID") || userID;
    if (!storedId) {
      alert("Please log in first.");
      return;
    }

    window.Paddle.Checkout.open({
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

  // 1) TossPayments 결제 로직
  const handleTossRequest = () => {
    if (userInfo.licenseStatus === "family") {
      alert("You are already a Family user. Payment is not possible.");
      return;
    }

    if (typeof window === "undefined" || !window.TossPayments) {
      alert("The payment module has not been loaded yet.");
      return;
    }

    const tossClientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!;
    const tossPayments = window.TossPayments(tossClientKey);

    const orderId = `DLAS-${Date.now()}`;
    const amount = 550000; // 예시 결제 금액
    const userID = localStorage.getItem("userID") || "";

    tossPayments.requestPayment("카드", {
      amount,
      orderId,
      orderName: "DLAS Family License",
      customerEmail: userID,
      successUrl: `https://www.dlas.io/payment/success?orderId=${orderId}&amount=${amount}`,
      failUrl: "https://www.dlas.io/payment/fail",
    });
  };

  // "가족 라이선스 결제" 버튼 클릭 -> 국가별 결제
  const handleFamilyLicensePayment = () => {
    if (isUserInfoLoading) {
      alert("Loading your information... Please wait a moment.");
      return;
    }
    if (userInfo.licenseStatus === "family") {
      alert("You are already a Family user. Payment is not possible.");
      return;
    }
    // 국적 상관없이 모두 Paddle
    handlePaddleCheckout();
  };

  return (
    <>
      {/* ✅ Head 영역 추가 */}
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

      {/*
        Paddle Billing v2 SDK
        - onLoad 콜백에서 setPaddleReady(true)
      */}
      <Script
        src="https://cdn.paddle.com/paddle/v2/paddle.js"
        strategy="afterInteractive"
        onLoad={() => {
          try {
            // 1) 전역 객체 확인
            if (!window.Paddle) {
              console.error(
                "❌ window.Paddle undefined ― 스크립트 차단 여부 확인"
              );
              return;
            }
            // 2) Sandbox 설정
            if (isSandbox && window.Paddle.Environment) {
              window.Paddle.Environment.set("sandbox");
            }
            // 3) Initialize 호출
            window.Paddle.Initialize({
              token: PADDLE_TOKEN,
              checkout: { settings: { displayMode: "overlay", locale: "ko" } },
            });
            // 4) 준비 완료
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
            {/* ▼ 네비게이션 버튼 그룹 (오른쪽) ― LanguageSelector 제거됨 */}
            <div className="absolute bottom-2 right-4 sm:right-8 hidden sm:flex flex-wrap items-center gap-x-4 gap-y-2">
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
              {/* 상단: 'Get the free license!' 버튼 (검정색으로 변경) */}
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

            {/* ↓ 바로 'Game Changer' 문구가 이어지도록 배너·쿠폰 UI 삭제 */}
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

    {/* ▼▼ 구버전 다운로드 버튼/코드는 완전히 제거 ▼▼ */}
    {/* 
    <a ...>Download v1.3.3</a>
    {[ ... ].map((v) => (
      <button ...>Download {v}</button>
    ))}
    */}
  </div>
</section>



          <section

 id="buy"
 className="scroll-mt-[180px] text-center py-20 bg-white"
>
 <h2 className="text-4xl font-bold mb-12">{t("nav.buy")}</h2>

 <div className="flex flex-col gap-y-16 w-full max-w-6xl mx-auto">
   {modules.map((mod) => {
     const info: Record<
       string,
       { gif: string | null; youtube: string | null; image: string | null }
     > = {
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
         gif: null,
         youtube: null,
         image: "/modules/fast_stl_classifier.png",
       },
       Fuser: {
         gif: null,
         youtube: null,
         image: "/modules/fast_stl_fuser.png",
       },
     };
     const { gif, youtube, image } = info[mod] ?? { gif: null, youtube: null, image: null };

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
         {/* 모바일 전용 */}
         <div className="flex flex-col w-full sm:hidden items-center">
           {/* 이름(이미지) */}
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
           {/* YouTube */}
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
           {/* 결제 버튼(가로 4개) */}
           <div className="flex flex-row gap-2 w-full justify-center items-center">
             <button
               className="bg-black text-white rounded-lg w-1/4 h-12 text-base font-extrabold flex flex-col items-center justify-center transition hover:bg-gray-800"
               onClick={() => handleModulePayment(mod, "1DAY")}
             >
               <span className="text-lg leading-5">1DAY</span>
               <span className="text-xs leading-5">$3</span>
             </button>
             <button
               className="bg-black text-white rounded-lg w-1/4 h-12 text-base font-extrabold flex flex-col items-center justify-center transition hover:bg-gray-800"
               onClick={() => handleModulePayment(mod, "1WEEK")}
             >
               <span className="text-lg leading-5">1WEEK</span>
               <span className="text-xs leading-5">$19</span>
             </button>
             <button
               className="bg-black text-white rounded-lg w-1/4 h-12 text-base font-extrabold flex flex-col items-center justify-center transition hover:bg-gray-800"
               onClick={() => handleModulePayment(mod, "1MONTH")}
             >
               <span className="text-lg leading-5">1MONTH</span>
               <span className="text-xs leading-5">$49</span>
             </button>
             <button
               className="bg-black text-white rounded-lg w-1/4 h-12 text-base font-extrabold flex flex-col items-center justify-center transition hover:bg-gray-800"
               onClick={() => handleModulePayment(mod, "1YEAR")}
             >
               <span className="text-lg leading-5">1YEAR</span>
               <span className="text-xs leading-5">$290</span>
             </button>
           </div>
         </div>

         {/* 데스크탑(기존) */}
         <div className="hidden sm:flex flex-row items-center w-full h-full gap-6">
           {/* 이름(이미지) */}
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
           {/* GIF */}
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
           {/* YouTube */}
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
           {/* 결제 버튼 그룹 - 카드 내부 오른쪽에 배치, 고정폭 */}
           <div className="flex flex-col gap-3 w-40 flex-shrink-0 h-full justify-center items-center">
             <button
               className="bg-black text-white rounded-lg w-32 h-16 text-lg font-extrabold flex flex-col items-center justify-center transition hover:bg-gray-800"
               onClick={() => handleModulePayment(mod, "1DAY")}
             >
               <span className="text-xl leading-5">1DAY</span>
               <span className="text-base leading-5">$3</span>
             </button>
             <button
               className="bg-black text-white rounded-lg w-32 h-16 text-lg font-extrabold flex flex-col items-center justify-center transition hover:bg-gray-800"
               onClick={() => handleModulePayment(mod, "1WEEK")}
             >
               <span className="text-xl leading-5">1WEEK</span>
               <span className="text-base leading-5">$19</span>
             </button>
             <button
               className="bg-black text-white rounded-lg w-32 h-16 text-lg font-extrabold flex flex-col items-center justify-center transition hover:bg-gray-800"
               onClick={() => handleModulePayment(mod, "1MONTH")}
             >
               <span className="text-xl leading-5">1MONTH</span>
               <span className="text-base leading-5">$49</span>
             </button>
             <button
               className="bg-black text-white rounded-lg w-32 h-16 text-lg font-extrabold flex flex-col items-center justify-center transition hover:bg-gray-800"
               onClick={() => handleModulePayment(mod, "1YEAR")}
             >
               <span className="text-xl leading-5">1YEAR</span>
               <span className="text-base leading-5">$290</span>
             </button>
           </div>
         </div>
       </div>
     );
   })}
 </div>
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
              {/* --------------------------------------------------- */}
              {/* --- 이용약관 --- */}
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

              {/* --- 개인정보처리방침 --- */}
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
            </div>
          </div>
        )}

        {/* ------------------------- */}
        {/*           Footer          */}
        {/* ------------------------- */}
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
              <p>Owner: Jonghwan Kim</p>
              <p>Business Registration No.: 753-06-03175</p>
              <p>Online Business Registration No.: 2025-대전서구-1033</p>
              <p>B403-817, 63 Dunsan-ro, Seo-gu, Daejeon, Republic of Korea</p>
              <p>+82-10-9756-1992 (Republic of Korea)</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
