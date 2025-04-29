'use client';

import { useEffect, useState } from "react";
import Image from "next/image";
import { useLang } from "@/components/LanguageWrapper";
import LanguageSelector from "@/components/LanguageSelector";


export default function Page() {
  const { t } = useLang();

  // --- 회원가입 로직 관련 상태 ---
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // 약관 동의 상태
  const [termsAgree, setTermsAgree] = useState(false);       // 필수 동의
  const [marketingAgree, setMarketingAgree] = useState(false); // 선택 동의

  // "Coming Soon" 모달 상태 (Family)
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);

  // 회원가입 폼 제출 처리
  const handleSignupSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // 비밀번호 확인
    if (password !== confirmPassword) {
      setPasswordError(t("signup.error.notMatch"));
      return;
    }
    // 필수 약관 미동의 시 막기
    if (!termsAgree) {
      setPasswordError(t("signup.error.mustAgree"));
      return;
    }

    setPasswordError("");
    alert(`
${t("signup.success")}
- ${t("signup.marketingLabel")}: ${marketingAgree ? t("common.yes") : t("common.no")}
`);
  };

  // 국가 목록 (생략 없이 전부 기재)
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
    'STL Classifier',
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

            {/* Family 탭: "Coming Soon" 모달 오픈 */}
            <button
              onClick={() => setShowComingSoonModal(true)}
              className="relative pb-2 transition-colors duration-200
                         border-b-2 border-teal-500 text-teal-600 font-semibold
                         hover:bg-teal-50 px-4 py-1 rounded"
            >
              {t("nav.family")}
            </button>
          </div>
        </div>
      </nav>

      {/* Coming Soon 모달 (Family) */}
      {showComingSoonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white p-10 rounded-2xl shadow-xl text-center relative w-80">
            <h2 className="text-3xl font-bold mb-6">{t("family.title")}</h2>
            <p className="text-gray-600 mb-8">{t("family.desc")}</p>
            <button
              onClick={() => setShowComingSoonModal(false)}
              className="bg-black text-white px-6 py-2 rounded hover:bg-gray-800 transition"
            >
              {t("common.ok")}
            </button>
          </div>
        </div>
      )}  
      

      {/* 우측 상단 로그인/회원가입 */}
      <div className="fixed top-6 right-6 flex gap-2 z-50">
        <button
          onClick={() => document.getElementById('login-modal')!.classList.remove('hidden')}
          className="text-sm font-medium border border-gray-300 px-4 py-2 rounded hover:bg-gray-100 transition"
        >
          {t("nav.login")}
        </button>
        <button
          onClick={() => document.getElementById('signup-modal')!.classList.remove('hidden')}
          className="text-sm font-medium border border-gray-300 px-4 py-2 rounded hover:bg-gray-100 transition"
        >
          {t("nav.signup")}
        </button>
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
            onClick={() => scrollToSection("buy")}
            className="text-2xl font-bold cursor-pointer mt-6 bg-black text-white px-10 py-6 rounded hover:bg-gray-800 transition"
          >
            {t("home.cta")}{" "}
            <span className="text-[2.2rem] font-bold">{t("home.price")}</span>
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
            {t("download.desc")}
          </p>
          <a
            href="/downloads/DLAS_Setup_v1.0.exe"
            download
            className="inline-block mt-6 bg-black text-white px-8 py-4 rounded hover:bg-gray-800 transition"
          >
            {t("download.button")}
          </a>
        </section>

        {/* 구매 섹션 */}
        <section id="buy" className="scroll-mt-[180px] py-20 px-10 bg-white">
          <h1 className="text-4xl font-bold mb-6 text-center">
            {t("buy.title")}
          </h1>

          <div className="mb-12 w-[28rem] h-[36rem] border p-10 rounded-lg shadow hover:shadow-lg transition flex flex-col items-center mx-auto">
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
                <div className="w-[28rem] h-[28rem] bg-gray-200 mb-6 px-8 flex items-center justify-center">
                  <span className="text-gray-400">{t("buy.moduleGif")}</span>
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
          </p>
          <form className="mt-6 max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md">
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder={t("contact.form.firstName")}
                required
                className="p-3 bg-gray-100 text-black border border-gray-300 rounded-lg"
              />
              <input
                type="text"
                placeholder={t("contact.form.lastName")}
                required
                className="p-3 bg-gray-100 text-black border border-gray-300 rounded-lg"
              />
              <input
                type="email"
                placeholder={t("contact.form.email")}
                required
                className="p-3 bg-gray-100 text-black border border-gray-300 rounded-lg col-span-2"
              />
              <input
                type="text"
                placeholder={t("contact.form.phone")}
                required
                className="p-3 bg-gray-100 text-black border border-gray-300 rounded-lg col-span-2"
              />
              <textarea
                placeholder={t("contact.form.message")}
                rows={4}
                required
                className="p-3 bg-gray-100 text-black border border-gray-300 rounded-lg col-span-2"
              ></textarea>
            </div>
            <button
              type="submit"
              className="mt-6 bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 w-full"
            >
              {t("contact.form.submit")}
            </button>
          </form>
        </section>

        {/* --- Terms & Privacy 섹션 --- */}
        <section
          id="terms-privacy"
          className="scroll-mt-[180px] py-20 px-6 bg-white"
        >
          <div className="max-w-4xl mx-auto text-left leading-7 text-gray-700">
            <h2 className="text-4xl font-bold mb-8 text-center">{t("terms.title")}</h2>

            <h3 className="text-2xl font-bold mb-4">{t("terms.headingTerms")}</h3>

            {/* Article 1 ~ 8 */}
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

            <h3 className="text-2xl font-bold mb-4">{t("privacy.headingPrivacy")}</h3>
            <p className="mb-4">{t("privacy.intro")}</p>

            <h4 className="font-semibold mb-1">{t("privacy.article1.title")}</h4>
            <p
              className="mb-4"
              dangerouslySetInnerHTML={{ __html: t("privacy.article1.desc") }}
            />

            <h4 className="font-semibold mb-1">{t("privacy.article2.title")}</h4>
            <p
              className="mb-4"
              dangerouslySetInnerHTML={{ __html: t("privacy.article2.desc") }}
            />

            <h4 className="font-semibold mb-1">{t("privacy.article3.title")}</h4>
            <p
              className="mb-4"
              dangerouslySetInnerHTML={{ __html: t("privacy.article3.desc") }}
            />

            <h4 className="font-semibold mb-1">{t("privacy.article4.title")}</h4>
            <p
              className="mb-4"
              dangerouslySetInnerHTML={{ __html: t("privacy.article4.desc") }}
            />

            <h4 className="font-semibold mb-1">{t("privacy.article5.title")}</h4>
            <p
              className="mb-4"
              dangerouslySetInnerHTML={{ __html: t("privacy.article5.desc") }}
            />

            <h4 className="font-semibold mb-1">{t("privacy.article6.title")}</h4>
            <p
              className="mb-4"
              dangerouslySetInnerHTML={{ __html: t("privacy.article6.desc") }}
            />

            <h4 className="font-semibold mb-1">{t("privacy.article7.title")}</h4>
            <p
              className="mb-4"
              dangerouslySetInnerHTML={{ __html: t("privacy.article7.desc") }}
            />

            <p className="mb-4">
              <strong>{t("privacy.effectiveDate")}</strong>
            </p>
          </div>
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
          <h2 className="text-2xl font-bold mb-4 text-center">{t("login.title")}</h2>
          <form className="space-y-4">
            <input
              type="email"
              placeholder={t("login.form.email")}
              className="w-full p-3 border border-gray-300 rounded"
              required
            />
            <input
              type="password"
              placeholder={t("login.form.password")}
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
                document.getElementById('login-modal')!.classList.add('hidden');
                document
                  .getElementById('signup-modal')!
                  .classList.remove('hidden');
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
              document.getElementById('signup-modal')!.classList.add('hidden')
            }
          >
            ×
          </button>
          <h2 className="text-2xl font-bold mb-4 text-center">{t("signup.title")}</h2>
          <form className="space-y-4" onSubmit={handleSignupSubmit}>
            <input
              type="text"
              placeholder={t("signup.form.name")}
              className="w-full p-3 border border-gray-300 rounded"
              required
            />
            <input
              type="email"
              placeholder={t("signup.form.email")}
              className="w-full p-3 border border-gray-300 rounded"
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
            {passwordError && (
              <p className="text-red-500 text-sm">{passwordError}</p>
            )}

            <select
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
              className="w-full p-3 border border-gray-300 rounded"
              required
            />
            <input
              type="text"
              placeholder={t("signup.form.workplaceAddress")}
              className="w-full p-3 border border-gray-300 rounded"
              required
            />

            {/* 약관 동의 체크박스 구간 */}
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

            <button
              type="submit"
              className="w-full bg-black text-white py-3 rounded hover:bg-gray-800"
            >
              {t("signup.form.submit")}
            </button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-black text-white py-10 px-6 text-center mt-20">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
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
      </footer>
    </div>
  );
}
