"use client";

import { useState } from "react";
import { useLang } from "@/components/LanguageWrapper";

// 닫기 버튼 컴포넌트 (우주 테마)
function CloseButton({
  onClick,
  label = "닫기",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="absolute top-3 right-4 text-white/60 hover:text-white text-2xl font-light transition-all duration-300"
      style={{ textShadow: "0 0 10px rgba(255,255,255,0.5)" }}
    >
      ×
    </button>
  );
}

const countries = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda",
  "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain",
  "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan",
  "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria",
  "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada",
  "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros",
  "Congo (Brazzaville)", "Congo (Kinshasa)", "Costa Rica", "Croatia", "Cuba",
  "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominican Republic", "Ecuador",
  "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini",
  "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany",
  "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
  "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq",
  "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya",
  "Kiribati", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho",
  "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar",
  "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania",
  "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro",
  "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands",
  "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia",
  "Norway", "Oman", "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea",
  "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania",
  "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia",
  "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe",
  "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore",
  "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea",
  "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland",
  "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo",
  "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
  "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States",
  "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam",
  "Yemen", "Zambia", "Zimbabwe",
];

// 우주 테마 입력 필드 스타일
const inputStyle = `
  w-full p-3
  bg-white/5 border border-white/20 rounded-lg
  text-white placeholder-white/40
  focus:outline-none focus:border-[#8b5cf6]/50 focus:bg-white/10
  transition-all duration-300
`;

// 우주 테마 버튼 스타일
const buttonStyle = `
  w-full py-3 rounded-lg font-medium
  bg-gradient-to-r from-[#8b5cf6]/80 to-[#06b6d4]/80
  hover:from-[#8b5cf6] hover:to-[#06b6d4]
  text-white transition-all duration-300
  border border-white/10
`;

export default function AuthModals() {
  const { t } = useLang();

  // 로그인 상태
  const [idForLogin, setIdForLogin] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // 회원가입 상태
  const [idForSignup, setIdForSignup] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [name, setName] = useState("");
  const [country, setCountry] = useState("South Korea");
  const [workplaceName, setWorkplaceName] = useState("");
  const [workplaceAddress, setWorkplaceAddress] = useState("");
  const [marketingAgree, setMarketingAgree] = useState(false);
  const [termsAgree, setTermsAgree] = useState(false);

  const closeModal = (id: string) => {
    document.getElementById(id)?.classList.add("hidden");
  };

  const openModal = (id: string) => {
    document.getElementById(id)?.classList.remove("hidden");
  };

  // 로그인 제출 처리
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
          headers: { "Content-Type": "application/json" },
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
      }

      alert("Login success!");

      const oneHourLater = Date.now() + 60 * 60 * 1000;
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("loginExpireTime", oneHourLater.toString());
      localStorage.setItem("userID", idForLogin);

      closeModal("login-modal");
      window.location.reload();
    } catch (error) {
      console.error("Error during login:", error);
      if (error instanceof Error) {
        alert(`Error during login: ${error.message}`);
      } else {
        alert("An unknown error occurred while logging in.");
      }
    }
  };

  // 회원가입 제출 처리
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
          headers: { "Content-Type": "application/json" },
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
        closeModal("signup-modal");

        // 회원가입 후 자동 로그인
        try {
          const loginResponse = await fetch(
            "https://license-server-697p.onrender.com/auth/login",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: idForSignup,
                password: password,
              }),
            }
          );

          if (loginResponse.ok) {
            const loginData = await loginResponse.json();
            const access_token = loginData.access_token;
            if (access_token) {
              localStorage.setItem("DLAS_TOKEN", access_token);
              const oneHourLater = Date.now() + 60 * 60 * 1000;
              localStorage.setItem("isLoggedIn", "true");
              localStorage.setItem("loginExpireTime", oneHourLater.toString());
              localStorage.setItem("userID", idForSignup);
              window.location.reload();
            }
          }
        } catch (loginError) {
          console.error("Auto-login failed:", loginError);
        }
      } catch {
        console.error("JSON parse failed", text);
        alert("Received an invalid response from the server.");
      }
    } catch (err) {
      console.error("Error while signing up", err);
      alert("Network error.");
    }
  };

  return (
    <>
      {/* 로그인 모달 */}
      <div
        id="login-modal"
        className="fixed inset-0 z-[200] hidden bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) closeModal("login-modal");
        }}
      >
        <div
          className="bg-black/80 border border-white/20 w-full max-w-md p-8 rounded-2xl shadow-2xl relative backdrop-blur-xl"
          style={{
            boxShadow: "0 0 60px rgba(139, 92, 246, 0.2), 0 0 30px rgba(6, 182, 212, 0.1)"
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <CloseButton
            onClick={() => closeModal("login-modal")}
            label="로그인 모달 닫기"
          />

          <h2
            className="text-2xl font-bold mb-6 text-center text-white"
            style={{ textShadow: "0 0 20px rgba(139, 92, 246, 0.5)" }}
          >
            {t("login.title")}
          </h2>

          <form className="space-y-4" onSubmit={handleLoginSubmit}>
            <input
              type="text"
              placeholder="ID (Email)"
              value={idForLogin}
              onChange={(e) => setIdForLogin(e.target.value)}
              className={inputStyle}
              required
            />
            <input
              type="password"
              placeholder={t("login.form.password")}
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className={inputStyle}
              required
            />
            <button type="submit" className={buttonStyle}>
              {t("login.form.submit")}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-white/60">
            {t("login.form.noAccount")}{" "}
            <button
              className="text-[#8b5cf6] hover:text-[#06b6d4] transition-colors duration-300"
              onClick={(e) => {
                e.preventDefault();
                closeModal("login-modal");
                openModal("signup-modal");
              }}
            >
              {t("login.form.signupNow")}
            </button>
          </p>
        </div>
      </div>

      {/* 회원가입 모달 */}
      <div
        id="signup-modal"
        className="fixed inset-0 z-[200] hidden bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) closeModal("signup-modal");
        }}
      >
        <div
          className="bg-black/80 border border-white/20 w-full max-w-md p-8 rounded-2xl shadow-2xl relative backdrop-blur-xl max-h-[90vh] overflow-y-auto"
          style={{
            boxShadow: "0 0 60px rgba(139, 92, 246, 0.2), 0 0 30px rgba(6, 182, 212, 0.1)"
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <CloseButton
            onClick={() => closeModal("signup-modal")}
            label="회원가입 모달 닫기"
          />

          <h2
            className="text-2xl font-bold mb-6 text-center text-white"
            style={{ textShadow: "0 0 20px rgba(139, 92, 246, 0.5)" }}
          >
            {t("signup.title")}
          </h2>

          <form className="space-y-4" onSubmit={handleSignupSubmit}>
            <input
              type="text"
              placeholder={t("signup.form.name")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputStyle}
              required
            />
            <input
              type="text"
              placeholder={t("signup.form.id")}
              className={inputStyle}
              value={idForSignup}
              onChange={(e) => setIdForSignup(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder={t("signup.form.password")}
              className={inputStyle}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder={t("signup.form.confirmPassword")}
              className={inputStyle}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className={`${inputStyle} appearance-none cursor-pointer`}
              required
            >
              <option value="" className="bg-gray-900">{t("signup.form.countryPlaceholder")}</option>
              {countries.map((c, index) => (
                <option key={index} value={c} className="bg-gray-900">
                  {c}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder={t("signup.form.workplaceName")}
              value={workplaceName}
              onChange={(e) => setWorkplaceName(e.target.value)}
              className={inputStyle}
            />

            <input
              type="text"
              placeholder={t("signup.form.workplaceAddress")}
              value={workplaceAddress}
              onChange={(e) => setWorkplaceAddress(e.target.value)}
              className={inputStyle}
            />

            <div className="text-sm text-white/70 mt-4 space-y-3">
              <label className="flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  checked={termsAgree}
                  onChange={(e) => setTermsAgree(e.target.checked)}
                  className="w-5 h-5 rounded border-white/30 bg-white/10 text-[#8b5cf6] focus:ring-[#8b5cf6]/50"
                />
                <span className="ml-3 group-hover:text-white transition-colors">{t("signup.form.agreeRequired")}</span>
              </label>
              <label className="flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  checked={marketingAgree}
                  onChange={(e) => setMarketingAgree(e.target.checked)}
                  className="w-5 h-5 rounded border-white/30 bg-white/10 text-[#8b5cf6] focus:ring-[#8b5cf6]/50"
                />
                <span className="ml-3 group-hover:text-white transition-colors">{t("signup.form.agreeMarketing")}</span>
              </label>
            </div>

            {passwordError && (
              <p className="text-red-400 text-sm" style={{ textShadow: "0 0 10px rgba(248, 113, 113, 0.5)" }}>
                {passwordError}
              </p>
            )}

            <button type="submit" className={buttonStyle}>
              {t("signup.form.submit")}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
