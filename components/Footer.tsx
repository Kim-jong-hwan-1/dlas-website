"use client";

import { useLang } from "@/components/LanguageWrapper";

interface FooterProps {
  showUI?: boolean;
}

export default function Footer({ showUI = true }: FooterProps) {
  const { t } = useLang();

  return (
    <footer
      className="bg-black/80 backdrop-blur-sm text-white py-10 px-6 mt-20 relative z-20 transition-all duration-500 ease-out"
      style={{
        opacity: showUI ? 1 : 0,
        transform: showUI ? 'translateY(0)' : 'translateY(100%)',
      }}
    >
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-4">
          <div className="text-sm text-white/70">© {new Date().getFullYear()} DLAS. {t("footer.rights")}</div>
          <div className="flex gap-4">
            <a
              href="https://www.youtube.com/@Dlas-official-e6k"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/70 hover:text-white transition-all duration-300"
              style={{ textShadow: "0 0 8px rgba(255,255,255,0.3)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textShadow = "0 0 10px rgba(255,255,255,0.8), 0 0 20px rgba(255,255,255,0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textShadow = "0 0 8px rgba(255,255,255,0.3)";
              }}
            >
              {t("footer.youtube")}
            </a>
            <a
              href="https://www.instagram.com/dlas_official_"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/70 hover:text-white transition-all duration-300"
              style={{ textShadow: "0 0 8px rgba(255,255,255,0.3)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textShadow = "0 0 10px rgba(255,255,255,0.8), 0 0 20px rgba(255,255,255,0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textShadow = "0 0 8px rgba(255,255,255,0.3)";
              }}
            >
              {t("footer.instagram")}
            </a>
            <a
              href="https://pf.kakao.com/_JLkxkn"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/70 hover:text-white transition-all duration-300"
              style={{ textShadow: "0 0 8px rgba(255,255,255,0.3)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textShadow = "0 0 10px rgba(255,255,255,0.8), 0 0 20px rgba(255,255,255,0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textShadow = "0 0 8px rgba(255,255,255,0.3)";
              }}
            >
              {t("footer.kakao")}
            </a>
          </div>
        </div>

        <div className="mt-6 text-sm text-white/60 leading-relaxed">
          <p>{t("footer.companyName")}</p>
          <p>{t("footer.ceo")} : {t("footer.ceoName")}</p>
          <p>{t("footer.businessNumber")} : 589-86-03616</p>
          <p>{t("footer.address")} : {t("footer.addressValue")}</p>
          <p>{t("footer.phone")} : 032-212-2882,2885,2887 {t("footer.fax")} : 032-212-2883</p>
          <p>{t("footer.email")} : support@dlas.io</p>
        </div>
      </div>
    </footer>
  );
}
