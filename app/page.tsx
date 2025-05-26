"use client";

// 우선 전역 타입 선언 추가
declare global {
  interface Window {
    // clientKey(문자열)을 인자로 받아서 결제 요청 메서드(requestPayment)를 가진 객체를 반환
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
  }
}

import { useEffect, useState } from "react";
import Image from "next/image";
import { useLang } from "@/components/LanguageWrapper";
import Script from "next/script"; // 1) Toss SDK를 로드하기 위해 import

export default function Page() {
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
    licenseStatus?: string;
  }>({});

  // admin 엔드포인트 사용, email 매개변수로 유저정보 받기
  const fetchUserInfo = async (email: string) => {
    try {
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
    }
  };

  // MY 모달 표시될 때 Local Storage fallback
  useEffect(() => {
    if (showMyModal) {
      const storedID = userID || localStorage.getItem("userID");
      if (storedID) {
        setUserID(storedID);
        fetchUserInfo(storedID);
      }
    }
  }, [showMyModal]);

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
  const [showPaymentSupportModal, setShowPaymentSupportModal] = useState(false);

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

  // 국가 목록
  const countries = [
    "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda",
    "Argentina","Armenia","Australia","Austria","Azerbaijan","Bahamas","Bahrain",
    "Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia",
    "Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso",
    "Burundi","Cabo Verde","Cambodia","Cameroon","Canada","Central African Republic",
    "Chad","Chile","China","Colombia","Comoros","Congo (Brazzaville)","Congo (Kinshasa)",
    "Costa Rica","Croatia","Cuba","Cyprus","Czech Republic","Denmark","Djibouti",
    "Dominica","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea",
    "Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland","France","Gabon",
    "Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea",
    "Guinea-Bissau","Guyana","Haiti","Honduras","Hungary","Iceland","India","Indonesia",
    "Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan",
    "Kenya","Kiribati","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho",
    "Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar","Malawi",
    "Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius",
    "Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco",
    "Mozambique","Myanmar","Namibia","Nauru","Nepal","Netherlands","New Zealand",
    "Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway","Oman",
    "Pakistan","Palau","Palestine","Panama","Papua New Guinea","Paraguay","Peru",
    "Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda",
    "Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines",
    "Samoa","San Marino","Sao Tome and Principe","Saudi Arabia","Senegal",
    "Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia",
    "Solomon Islands","Somalia","South Africa","South Korea","South Sudan",
    "Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria",
    "Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga",
    "Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda",
    "Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay",
    "Uzbekistan","Vanuatu","Vatican City","Venezuela","Vietnam","Yemen",
    "Zambia","Zimbabwe"
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
    "Bite Finder",
    "Transfer Jig Maker",
    "Fast & Easy Modifier",
    "Printing Model maker",
    "Image Converter",
    "HTML Viewer Converter",
    "STL Classifier",
    "Crown Cad",
    "Denture Cad",
  ];

  // 패밀리 라이선스 테이블용 데이터
  const familyTableData = [
    [
      "Transfer Jig Maker",
      "$790",
      "Free for life",
      "Automated jig generation software",
    ],
    [
      "Image Converter ",
      "$390",
      "Free for life",
      "Convert STL to image quickly",
    ],
    [
      "STL Classifier (Expected June 2025)",
      "$590",
      "Free for life",
      "Classify STL by color and height",
    ],
    [
      "HTML Viewer Converter (Expected June 2025)",
      "$390",
      "Free for life",
      "Convert STL to HTML viewer",
    ],
    [
      "Printing Model Maker (Expected July 2025)",
      "$590",
      "Free for life",
      "Lightweight model creator",
    ],
    [
      "Bite Finder (Expected July 2025)",
      "$1,090",
      "Free for life",
      "Revolutionary bite locator for model-less workflows",
    ],
    [
      "Fast & Easy Modifier (Expected July 2025)",
      "$590",
      "Free for life",
      "Quick modifier (hook, hole, attachment)",
    ],
    [
      "Denture CAD (Expected 2025)",
      "$790",
      "Free for life",
      "Arrangement library, labial facing, custom tray",
    ],
    [
      "Crown CAD (Expected 2025)",
      "$790",
      "Free for life",
      "Integrated crown CAD with the best features",
    ],
    [
      "...new module 1 (Coming Soon)",
      "$790",
      "Free for life",
      "",
    ],
    [
      "...new module 2 (Coming Soon)",
      "$790",
      "Free for life",
      "",
    ],
    [
      "...new module 3 (Coming Soon)",
      "$790",
      "Free for life",
      "",
    ],
    [
      "AI DLAS CAD (Expected 2026)",
      "$59/month",
      "$5.9/month",
      "",
    ],
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
      "https://github.com/Kim-jong-hwan-1/dlas-website/releases/download/v1.1.7/DLAS_Installer.exe";
  };

  // -----------------------------
  // (기존) 결제 확인 함수는 삭제하고, Toss 위젯 실행 함수로 대체
  // -----------------------------
  const handleTossRequest = () => {
    if (typeof window === "undefined" || !window.TossPayments) {
      alert("결제 모듈이 아직 로드되지 않았습니다.");
      return;
    }

    // test용 클라이언트 키 (테스트용)
    const tossPayments = window.TossPayments("test_ck_Gv6LjeKD8aKa5DKW6yzNVwYxAdXy"); // ✅ 일반 결제 클라이언트 키

    const orderId = `DLAS-${Date.now()}`;
    const amount = 585860;
    const userID = localStorage.getItem("userID");

    // 실제로는 서버에서 결제키/주문정보를 받아와야 하지만 예시이므로 직접 진행
    tossPayments.requestPayment("카드", {
      amount,
      orderId,
      orderName: "DLAS Family License",
      customerEmail: userID || "", // Toss 쪽에 필요한 값
      successUrl: `https://www.dlas.io/payment/success?orderId=${orderId}&amount=${amount}`,
      failUrl: `https://www.dlas.io/payment/fail`,
    });
  };

  return (
    <>
      {/* 2) Toss SDK 로딩 (strategy="beforeInteractive") */}
      <Script src="https://js.tosspayments.com/v1" strategy="beforeInteractive" />

      <div className="min-h-screen bg-white text-black relative">
        {/* 왼쪽 상단 로고 (PC에서만) */}
        <Image
          src="/left-up.png"
          alt="Top Left Logo"
          width={120}
          height={120}
          className="fixed top-4 left-4 z-50 hidden sm:block"
        />

        {/* 상단 네비게이션 */}
        <nav className="fixed top-0 left-0 w-full bg-white py-4 px-8 shadow-lg z-40">
          <div className="flex justify-center items-center relative">
            {/* 로고: 모바일에서 상단 여백을 80px로 조정, PC에서는 0 */}
            <Image
              src="/logo.png"
              alt="DLAS Logo"
              width={600}
              height={400}
              className="object-contain max-w-full sm:max-w-[600px] mx-auto mt-[80px] sm:mt-0 mb-0 sm:mb-0"
              priority
            />
            {/* 네비게이션 메뉴 - 모바일에서는 hidden, sm이상에서는 flex */}
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

              {/* Terms & Privacy 버튼 */}
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
              {/* 로그인 & 회원가입 버튼 */}
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
              {/* MY & Logout 버튼 */}
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
            <button
              onClick={() => {
                setShowFamilyModal(true);
                // 혹시 이전에 열려있던 다른 화면을 초기화
                setShowFreeLicenseGuide(false);
                setShowPaymentProceed(false);
              }}
              className="text-2xl font-bold cursor-pointer mt-6 bg-black text-white px-10 py-6 rounded hover:bg-gray-800 transition"
            >
              {t("home.cta")} {t("home.price")}
            </button>
            <div className="mt-16 px-6 max-w-4xl mx-auto text-center">
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
              Windows 전용 설치 파일입니다.
              <br />
              압축을 풀 필요 없이 바로 실행하세요. (Mac 미지원)
              <br />
              <br />
              Windows installer (.exe).
              <br />
              Just run the file. (Not available for Mac.)
            </p>
            <button
              onClick={() => setShowDownloadModal(true)}
              className="inline-block mt-6 bg-black text-white px-8 py-4 rounded hover:bg-gray-800 transition"
            >
              Download DLAS for Windows (.exe)
            </button>
          </section>

          {/* 구매 섹션 */}
          <section id="buy" className="scroll-mt-[180px] py-20 px-10 bg-white">
            <h1 className="text-4xl font-bold mb-6 text-center">
              {t("buy.title")}
            </h1>

            {/* 패밀리 라이선스 카드(현재는 hidden 처리) */}
            <div
              className="hidden mb-12 w-[28rem] h-[36rem] border p-10 rounded-lg shadow hover:shadow-lg transition flex flex-col items-center mx-auto cursor-pointer"
              onClick={() => {
                setShowFamilyModal(true);
                setShowFreeLicenseGuide(false);
                setShowPaymentProceed(false);
              }}
            >
              <div className="w-[28rem] h-[28rem] bg-gray-100 mb-6 px-8 flex items-center justify-center">
                <span className="text-gray-400">{t("buy.familyGifPlaceholder")}</span>
              </div>
              <div className="text-lg font-semibold text-center text-gray-800">
                {t("buy.familyLicense")}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 justify-items-center">
              {modules.map((mod, i) => (
                <div
                  key={i}
                  className="w-[28rem] h-[36rem] border p-10 rounded-lg shadow hover:shadow-lg transition flex flex-col items-center"
                >
                  <div className="w-[28rem] h-[28rem] bg-gray-200 mb-6 relative overflow-hidden">
                    {mod === "Transfer Jig Maker" ? (
                      <Image
                        src="/gifs/fast_transfer_jig_maker.gif"
                        alt={`${mod} gif`}
                        fill
                        className="object-cover"
                      />
                    ) : mod === "Image Converter" ? (
                      <Image
                        src="/gifs/fast_image_converter.gif"
                        alt={`${mod} gif`}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <span className="text-gray-400 text-2xl font-bold">
                        Coming Soon
                      </span>
                    )}
                  </div>
                  <div className="text-xl font-semibold text-center text-gray-800">
                    {mod}
                  </div>
                </div>
              ))}
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

              <h3 className="text-2xl font-bold mb-4">
                {t("terms.headingTerms")}
              </h3>

              <h4 className="font-semibold mb-1">{t("terms.article1.title")}</h4>
              <p
                className="mb-4"
                dangerouslySetInnerHTML={{ __html: t("terms.article1.desc") }}
              />

              <h4 className="font-semibold mb-1">{t("terms.article2.title")}</h4>
              <p
                className="mb-4"
                dangerouslySetInnerHTML={{ __html: t("terms.article2.desc") }}
              />

              <h4 className="font-semibold mb-1">{t("terms.article3.title")}</h4>
              <p
                className="mb-4"
                dangerouslySetInnerHTML={{ __html: t("terms.article3.desc") }}
              />

              <h4 className="font-semibold mb-1">{t("terms.article4.title")}</h4>
              <p
                className="mb-4"
                dangerouslySetInnerHTML={{ __html: t("terms.article4.desc") }}
              />

              <h4 className="font-semibold mb-1">{t("terms.article5.title")}</h4>
              <p
                className="mb-4"
                dangerouslySetInnerHTML={{ __html: t("terms.article5.desc") }}
              />

              <h4 className="font-semibold mb-1">{t("terms.article6.title")}</h4>
              <p
                className="mb-4"
                dangerouslySetInnerHTML={{ __html: t("terms.article6.desc") }}
              />

              <h4 className="font-semibold mb-1">{t("terms.article7.title")}</h4>
              <p
                className="mb-4"
                dangerouslySetInnerHTML={{ __html: t("terms.article7.desc") }}
              />

              <h4 className="font-semibold mb-1">{t("terms.article8.title")}</h4>
              <p
                className="mb-4"
                dangerouslySetInnerHTML={{ __html: t("terms.article8.desc") }}
              />

              <p className="mb-12">
                <strong>{t("terms.effectiveDate")}</strong>
              </p>

              <h3 className="text-2xl font-bold mb-4">
                {t("privacy.headingPrivacy")}
              </h3>
              <p className="mb-4">{t("privacy.intro")}</p>

              <h4 className="font-semibold mb-1">
                {t("privacy.article1.title")}
              </h4>
              <p
                className="mb-4"
                dangerouslySetInnerHTML={{ __html: t("privacy.article1.desc") }}
              />

              <h4 className="font-semibold mb-1">
                {t("privacy.article2.title")}
              </h4>
              <p
                className="mb-4"
                dangerouslySetInnerHTML={{ __html: t("privacy.article2.desc") }}
              />

              <h4 className="font-semibold mb-1">
                {t("privacy.article3.title")}
              </h4>
              <p
                className="mb-4"
                dangerouslySetInnerHTML={{ __html: t("privacy.article3.desc") }}
              />

              <h4 className="font-semibold mb-1">
                {t("privacy.article4.title")}
              </h4>
              <p
                className="mb-4"
                dangerouslySetInnerHTML={{ __html: t("privacy.article4.desc") }}
              />

              <h4 className="font-semibold mb-1">
                {t("privacy.article5.title")}
              </h4>
              <p
                className="mb-4"
                dangerouslySetInnerHTML={{ __html: t("privacy.article5.desc") }}
              />

              <h4 className="font-semibold mb-1">
                {t("privacy.article6.title")}
              </h4>
              <p
                className="mb-4"
                dangerouslySetInnerHTML={{ __html: t("privacy.article6.desc") }}
              />

              <h4 className="font-semibold mb-1">
                {t("privacy.article7.title")}
              </h4>
              <p
                className="mb-4"
                dangerouslySetInnerHTML={{ __html: t("privacy.article7.desc") }}
              />

              <p className="mb-4">
                <strong>{t("privacy.effectiveDate")}</strong>
              </p>
            </div>
          </section>

          {/* 패밀리 라이선스 모달 */}
          {showFamilyModal && (
            <div className="fixed inset-0 z-50 bg-black bg-opacity-50 overflow-auto">
              <div className="flex min-h-full items-start justify-center px-6 py-10">
                <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-[1100px] relative overflow-x-auto">
                  <button
                    onClick={() => {
                      setShowFamilyModal(false);
                      // 모달 닫을 때 2가지 화면 상태 초기화
                      setShowFreeLicenseGuide(false);
                      setShowPaymentProceed(false);
                    }}
                    className="absolute top-4 right-4 text-gray-400 hover:text-black text-2xl"
                  >
                    ×
                  </button>

                  {/* 3단 분기: 1) 결제 진행 화면 2) 무료 라이선스 3) 기본 화면 */}
                  {showPaymentProceed ? (
                    /* --- 결제 진행 화면 (모듈 상태 안내) --- */
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
                            <li>{t("payment.items.0")}</li>
                            <li>{t("payment.items.1")}</li>
                            <li>{t("payment.items.2")}</li>
                            <li>{t("payment.items.3")}</li>
                            <li>{t("payment.items.4")}</li>
                            <li>{t("payment.items.5")}</li>
                          </ul>
                        </div>

                        <p>{t("payment.footer")}</p>
                      </div>

                      <div className="text-center mt-6">
                        {/* 2) "I agree" 버튼 → Toss 위젯 실행 */}
                        <button
                          className="bg-black text-white px-8 py-3 rounded hover:bg-gray-800 transition"
                          onClick={handleTossRequest}
                        >
                          {t("payment.agree")}
                        </button>
                      </div>
                    </div>
                  ) : showFreeLicenseGuide ? (
                    /* --- 무료 라이선스 획득 방법 화면 --- */
                    <div className="mt-6">
                      <button
                        onClick={() => setShowFreeLicenseGuide(false)}
                        className="underline text-blue-600 mb-4"
                      >
                        ← Back
                      </button>
                      <h3 className="text-2xl font-bold mb-4 text-center">
                        {t("freeLicense.title")}
                      </h3>

                      {/* 실제 이미지 3장으로 대체 */}
                      <div className="flex flex-row items-start justify-center space-x-4">
                        <img
                          src="/free_liecense/1.png"
                          alt="Step 1"
                          className="w-60 h-auto"
                        />
                        <img
                          src="/free_liecense/2.png"
                          alt="Step 2"
                          className="w-60 h-auto"
                        />
                        <img
                          src="/free_liecense/3.png"
                          alt="Step 3"
                          className="w-60 h-auto"
                        />
                      </div>

                      {/* 설명 */}
                      <div className="text-sm text-gray-700 mt-4 leading-6 space-y-2">
                        <p
                          dangerouslySetInnerHTML={{ __html: t("freeLicense.step1") }}
                        />
                        <p
                          dangerouslySetInnerHTML={{ __html: t("freeLicense.step2") }}
                        />
                        <p>{t("freeLicense.step3")}</p>
                        <p
                          dangerouslySetInnerHTML={{ __html: t("freeLicense.send") }}
                        />
                        <p>{t("freeLicense.aiReview")}</p>
                        <hr className="my-3" />
                        <div className="font-bold text-gray-900 space-y-1">
                          <p>{t("freeLicense.note1")}</p>
                          <p>{t("freeLicense.note2")}</p>
                          <p>{t("freeLicense.note3")}</p>
                        </div>
                        <hr className="my-3" />
                        <div className="font-bold text-gray-900 space-y-1">
                          <p>
                            - Each verified Instagram account grants 3 hours of free
                            license.
                          </p>
                          <p>
                            - One DLAS ID can redeem multiple times with different
                            Instagram accounts.
                          </p>
                          <p>
                            - One Instagram account cannot be reused for another DLAS
                            ID.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* --- 기본 패밀리 라이선스 안내 화면 --- */
                    <>
                      <h2 className="text-3xl font-bold mb-4 text-center">
                        {t("family.modalTitle")}
                      </h2>

                      <div className="text-gray-700 text-sm leading-relaxed space-y-2 mb-6">
                        <p>{t("family.desc1")}</p>
                        <p>{t("family.desc2")}</p>
                        <p>{t("family.desc3")}</p>
                        <p>{t("family.desc4")}</p>
                        <p>{t("family.desc5")}</p>
                      </div>

                      {/* 강조문구 + 버튼 */}
                      <div className="my-4 text-center">
                        <p className="font-bold text-red-600 mb-2">
                          {t("family.recommendFree")}
                        </p>
                        <button
                          onClick={() => setShowFreeLicenseGuide(true)}
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
                        {/* 여기 onClick에 로그인 상태 체크 조건을 추가 */}
                        <button
                          className="bg-black text-white px-8 py-3 rounded hover:bg-gray-800 transition"
                          onClick={() => {
                            if (!isLoggedIn) {
                              document
                                .getElementById("login-modal")!
                                .classList.remove("hidden");
                            } else {
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
        </main>

        {/* [추가] 다운로드 안내 모달 */}
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
                  This installer is distributed only through the official DLAS website
                  and is safe to use.
                </li>
                <li>
                  If you see a warning, please click "additional information" or
                  "Continue" to proceed with the installation.
                </li>
                <li>
                  A digitally signed (code-signed) version will be provided soon.
                </li>
                <li>
                  For any questions, please contact <strong>support@dlas.io</strong>.
                </li>
              </ul>

              <h2 className="text-xl font-bold mb-3">※ 안내</h2>
              <ul className="text-sm text-gray-700 list-disc pl-5 mb-6 space-y-2">
                <li>
                  "이 파일은 일반적으로 다운로드되지 않습니다"라는 메시지가 보일 수
                  있습니다.
                </li>
                <li>
                  본 설치 파일은 DLAS 공식 홈페이지에서만 배포하며, 안전하게 사용하실
                  수 있습니다.
                </li>
                <li>
                  다운로드 경고가 나오더라도 '계속' 또는 '추가정보' 버튼을 눌러 설치를
                  진행해 주세요.
                </li>
                <li>
                  정식 코드서명(디지털 인증서)이 적용된 버전은 곧 제공될 예정입니다.
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
                  document.getElementById("login-modal")!.classList.add("hidden");
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
                required
              />
              <input
                type="text"
                placeholder={t("signup.form.workplaceAddress")}
                value={workplaceAddress}
                onChange={(e) => setWorkplaceAddress(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded"
                required
              />

              {/* 약관 동의 체크박스 */}
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
          <div
            className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center"
          >
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
                  {userInfo.licenseStatus ?? "Loading..."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="bg-black text-white py-10 px-6 mt-20">
          <div className="max-w-5xl mx-auto">
            {/* 첫 번째 줄: 저작권, 소셜 링크 */}
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

            {/* 두 번째 줄: 사업자 정보 (왼쪽 정렬) */}
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
