'use client';
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  // --- 추가된 부분: 상태 관리 & 함수들 ---
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // 이용약관 동의 체크박스
  const [termsAgree, setTermsAgree] = useState(false);       // 필수 동의
  const [marketingAgree, setMarketingAgree] = useState(false); // 선택 동의

  const handleSignupSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // 비밀번호 일치 확인
    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    // 필수 약관 미동의 시 막기
    if (!termsAgree) {
      setPasswordError("You must agree to the required terms.");
      return;
    }

    // 모두 통과 시
    setPasswordError("");
    // 회원가입 폼 전송 로직 추가 (백엔드 연동 등)
    alert(`Sign Up Successful!
- Marketing Agreement: ${marketingAgree ? "Yes" : "No"}`);
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
            top: tab === 'home' ? 0 : target.offsetTop - 160,
            behavior: "smooth",
          });
        }, 100);
      }
    }
  }, []);

  const scrollToSection = (id: string) => {
    if (id === 'home') {
      window.scrollTo({ top: 0, behavior: "smooth" });
      window.history.replaceState(null, '', `/?tab=${id}`);
      return;
    }

    const el = document.getElementById(id);
    if (el) {
      window.scrollTo({
        top: el.offsetTop - 160,
        behavior: "smooth",
      });
      window.history.replaceState(null, '', `/?tab=${id}`);
    }
  };

  // 모듈 목록
  const modules = [
    'Bite Finder',
    'Transfer Jig Maker',
    'Fast & Easy Modifier',
    'Printing Model maker',
    'Image Converter',
    'HTML Viewer Converter',
    'Denture Booleaner',
    'Crown Cad',
    'Denture Cad',
  ];

  return (
    <div className="min-h-screen bg-white text-black relative">
      {/* 왼쪽 상단 로고 */}
      <Image
        src="/left-up.png"
        alt="Top Left Logo"
        width={120}
        height={120}
        className="fixed top-4 left-4 z-50"
      />

      {/* 상단 네비게이션 */}
      <nav className="fixed top-0 left-0 w-full bg-white py-4 px-8 shadow-lg z-40">
        <div className="flex justify-center items-center relative">
          <Image
            src="/logo.png"
            alt="DLAS Logo"
            width={600}
            height={400}
            className="object-contain"
            priority
          />
          <div className="absolute bottom-2 right-8 flex items-center space-x-8">
            {/* 기존 탭들 */}
            {["home", "download", "buy", "contact"].map((tab) => (
              <button
                key={tab}
                onClick={() => scrollToSection(tab)}
                className="relative pb-2 transition-colors duration-200 cursor-pointer
                           border-b-2 border-transparent hover:border-black 
                           text-gray-700 hover:text-black"
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}

            {/* Family: 다른 화면으로 이동 + 색감 차분하게 (teal) */}
            <Link
              href="/family"
              className="relative pb-2 transition-colors duration-200
                         border-b-2 border-teal-500 text-teal-600 font-semibold
                         hover:bg-teal-50 px-4 py-1 rounded"
            >
              Family
            </Link>
          </div>
        </div>
      </nav>

      {/* 우측 상단 로그인/회원가입 */}
      <div className="fixed top-6 right-6 flex gap-2 z-50">
        <button
          onClick={() => document.getElementById('login-modal')!.classList.remove('hidden')}
          className="text-sm font-medium border border-gray-300 px-4 py-2 rounded hover:bg-gray-100 transition"
        >
          Login
        </button>
        <button
          onClick={() => document.getElementById('signup-modal')!.classList.remove('hidden')}
          className="text-sm font-medium border border-gray-300 px-4 py-2 rounded hover:bg-gray-100 transition"
        >
          Sign Up
        </button>
      </div>

      <main className="pt-[180px]">
        {/* 홈 섹션 */}
        <section id="home" className="scroll-mt-[180px] text-center py-20">
          <p className="text-xl text-gray-300 mb-2">
            <span className="text-5xl font-bold block">
              Maximize Productivity with Just One Click
            </span>
          </p>
          <h1 className="text-6xl font-bold mb-8">From Hours to Seconds</h1>
          <button
            onClick={() => scrollToSection("buy")}
            className="text-2xl font-bold cursor-pointer mt-6 bg-black text-white px-10 py-6 rounded hover:bg-gray-800 transition"
          >
            Join the DLAS Family – only <span className="text-[2.2rem] font-bold">$390</span>
          </button>
          <div className="mt-16 px-6 max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-semibold mb-4 text-gray-900">Game Changer in Digital Dentistry</h2>
            <p className="text-lg text-gray-600 leading-relaxed mb-4">
              DLAS is more than just software. It is a revolution in dental CAD automation,
              designed to empower dental professionals with cutting-edge tools that simplify
              complex workflows, reduce manual labor, and maximize productivity.
            </p>
            <p className="italic text-2xl text-gray-800 font-medium">
              "The future of dental automation is here"
            </p>
          </div>
        </section>

        {/* 다운로드 섹션 */}
        <section id="download" className="scroll-mt-[180px] text-center py-20 bg-gray-100">
          <h2 className="text-4xl font-bold mb-4">Download Software</h2>
          <p className="text-lg text-gray-500 max-w-3xl mx-auto mt-2">
            Click below to download the latest version of DLAS CAD Software.
          </p>
          <a
            href="/downloads/DLAS_Setup_v1.0.exe"
            download
            className="inline-block mt-6 bg-black text-white px-8 py-4 rounded hover:bg-gray-800 transition"
          >
            Download Now
          </a>
        </section>

        {/* 구매 섹션 */}
        <section id="buy" className="scroll-mt-[180px] py-20 px-10 bg-white">
          <h1 className="text-4xl font-bold mb-6 text-center">Buy License</h1>

          <div className="mb-12 w-[28rem] h-[36rem] border p-10 rounded-lg shadow hover:shadow-lg transition flex flex-col items-center mx-auto">
            <div className="w-[28rem] h-[28rem] bg-gray-100 mb-6 px-8 flex items-center justify-center">
              <span className="text-gray-400">Family License GIF Placeholder</span>
            </div>
            <div className="text-lg font-semibold text-center text-gray-800">Family License</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 justify-items-center">
            {modules.map((mod, i) => (
              <div
                key={i}
                className="w-[28rem] h-[36rem] border p-10 rounded-lg shadow hover:shadow-lg transition flex flex-col items-center"
              >
                <div className="w-[28rem] h-[28rem] bg-gray-200 mb-6 px-8 flex items-center justify-center">
                  <span className="text-gray-400">GIF Placeholder</span>
                </div>
                <div className="text-xl font-semibold text-center text-gray-800">{mod}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 연락처 섹션 */}
        <section id="contact" className="scroll-mt-[180px] py-20 text-center bg-gray-100">
          <h2 className="text-4xl font-bold">Contact Us</h2>
          <p className="text-lg text-gray-500 max-w-3xl mx-auto mt-4">
            support@dlas.io
            <br />
            63, Dunsan-ro, Seo-gu, Daejeon, Republic of Korea 403-817 (DLAS)
          </p>
          <form className="mt-6 max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md">
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="First name"
                required
                className="p-3 bg-gray-100 text-black border border-gray-300 rounded-lg"
              />
              <input
                type="text"
                placeholder="Last name"
                required
                className="p-3 bg-gray-100 text-black border border-gray-300 rounded-lg"
              />
              <input
                type="email"
                placeholder="Email address"
                required
                className="p-3 bg-gray-100 text-black border border-gray-300 rounded-lg col-span-2"
              />
              <input
                type="text"
                placeholder="Phone number"
                required
                className="p-3 bg-gray-100 text-black border border-gray-300 rounded-lg col-span-2"
              />
              <textarea
                placeholder="Message"
                rows={4}
                required
                className="p-3 bg-gray-100 text-black border border-gray-300 rounded-lg col-span-2"
              ></textarea>
            </div>
            <button
              type="submit"
              className="mt-6 bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 w-full"
            >
              Inquire Now
            </button>
          </form>
        </section>
      </main>

      {/* 로그인 모달 */}
      <div
        id="login-modal"
        className="fixed inset-0 z-50 hidden bg-black bg-opacity-50 flex items-center justify-center"
      >
        <div className="bg-white w-full max-w-md p-8 rounded-lg shadow-xl relative">
          <button
            className="absolute top-2 right-3 text-gray-500 hover:text-black"
            onClick={() =>
              document.getElementById('login-modal')!.classList.add('hidden')
            }
          >
            ×
          </button>
          <h2 className="text-2xl font-bold mb-4 text-center">Login to DLAS</h2>
          <form className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              className="w-full p-3 border border-gray-300 rounded"
              required
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full p-3 border border-gray-300 rounded"
              required
            />
            <button
              type="submit"
              className="w-full bg-black text-white py-3 rounded hover:bg-gray-800"
            >
              Login
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-500">
            Don’t have an account?{" "}
            <a
              href="#"
              className="text-blue-600 hover:underline"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('login-modal')!.classList.add('hidden');
                document
                  .getElementById('signup-modal')!
                  .classList.remove('hidden');
              }}
            >
              Sign up
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
              document.getElementById('signup-modal')!.classList.add('hidden')
            }
          >
            ×
          </button>
          <h2 className="text-2xl font-bold mb-4 text-center">Sign Up for DLAS</h2>
          <form className="space-y-4" onSubmit={handleSignupSubmit}>
            <input
              type="text"
              placeholder="Name"
              className="w-full p-3 border border-gray-300 rounded"
              required
            />
            <input
              type="email"
              placeholder="Email"
              className="w-full p-3 border border-gray-300 rounded"
              required
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full p-3 border border-gray-300 rounded"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Confirm Password"
              className="w-full p-3 border border-gray-300 rounded"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            {passwordError && (
              <p className="text-red-500 text-sm">{passwordError}</p>
            )}

            <select
              className="w-full p-3 border border-gray-300 rounded"
              required
            >
              <option value="">Select Country</option>
              {countries.map((country, index) => (
                <option key={index} value={country}>
                  {country}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Workplace Name (Dental Lab / Clinic)"
              className="w-full p-3 border border-gray-300 rounded"
              required
            />
            <input
              type="text"
              placeholder="Workplace Address"
              className="w-full p-3 border border-gray-300 rounded"
              required
            />

            {/* 약관 동의 체크박스 구간 */}
            <div className="text-sm text-gray-600 mt-4 space-y-2">
              {/* 필수 약관 */}
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={termsAgree}
                  onChange={(e) => setTermsAgree(e.target.checked)}
                  className="form-checkbox h-5 w-5 text-black"
                />
                <span className="ml-2">
                  I agree to the <strong>Terms and Conditions</strong> (required)
                </span>
              </label>
              {/* 선택 약관 (마케팅 동의) */}
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={marketingAgree}
                  onChange={(e) => setMarketingAgree(e.target.checked)}
                  className="form-checkbox h-5 w-5 text-black"
                />
                <span className="ml-2">
                  I agree to receive marketing emails (optional)
                </span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full bg-black text-white py-3 rounded hover:bg-gray-800"
            >
              Create Account
            </button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-black text-white py-10 px-6 text-center mt-20">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm">
            © {new Date().getFullYear()} DLAS. All rights reserved.
          </div>
          <div className="flex gap-4">
            <a
              href="https://www.youtube.com/@dlas"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-red-500"
            >
              YouTube
            </a>
            <a
              href="https://www.instagram.com/dlas_official"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-pink-400"
            >
              Instagram
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
