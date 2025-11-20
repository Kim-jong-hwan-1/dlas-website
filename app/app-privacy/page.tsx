"use client";

import { useEffect } from "react";
import { useLang } from "@/components/LanguageWrapper";

export default function AppPrivacyPage() {
  const { t, setLang } = useLang();

  useEffect(() => {
    // 항상 한국어로 설정
    setLang('ko');
    // 페이지 로드 시 스크롤을 최상단으로
    window.scrollTo(0, 0);
  }, [setLang]);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <a href="/" className="text-2xl font-bold text-black hover:text-gray-700 transition">
            DLAS
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Title */}
          <h1 className="text-4xl font-bold mb-8 text-center text-black">
            {t("privacy.headingPrivacy")}
          </h1>

          {/* Intro */}
          <p className="mb-8 text-gray-700 leading-7">{t("privacy.intro")}</p>

          {/* Article 8 - Mobile App Privacy (Highlighted) */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-6 mb-8 rounded-r-lg">
            <h2 className="text-2xl font-bold mb-4 text-blue-900">
              {t("privacy.article8.title")}
            </h2>
            <div
              className="text-gray-800 leading-7"
              dangerouslySetInnerHTML={{
                __html: t("privacy.article8.desc"),
              }}
            />
          </div>

          {/* Divider */}
          <hr className="my-8 border-gray-300" />

          {/* Other Articles */}
          <h3 className="text-2xl font-bold mb-6 text-black">
            전체 개인정보처리방침
          </h3>

          {["article1", "article2", "article3", "article4", "article5", "article6", "article7"].map(
            (a) => (
              <div key={a} className="mb-6">
                <h4 className="font-semibold mb-2 text-lg text-black">
                  {t(`privacy.${a}.title`)}
                </h4>
                <p
                  className="text-gray-700 leading-7"
                  dangerouslySetInnerHTML={{
                    __html: t(`privacy.${a}.desc`),
                  }}
                />
              </div>
            )
          )}

          {/* Effective Date */}
          <p className="mt-8 text-gray-700 font-semibold">
            {t("privacy.effectiveDate")}
          </p>

          {/* Back to Home Button */}
          <div className="mt-12 text-center">
            <a
              href="/"
              className="inline-block bg-black text-white px-8 py-3 rounded-lg hover:bg-gray-800 transition"
            >
              홈으로 돌아가기
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-black text-white py-10 px-6">
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
          <div className="mt-4 text-xs text-gray-400">
            <p>상호 : 덴티스 | 대표자 : 김종환</p>
            <p>사업자등록번호 : 357-81-02129</p>
            <p>주소 : 대전광역시 서구 둔산로 63, 601호(둔산동, 대성빌딩)</p>
            <p>전화 : 032-212-2882,2885,2887 팩스 : 032-212-2883</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
