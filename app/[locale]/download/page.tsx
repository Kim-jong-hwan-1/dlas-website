"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useLang } from "@/components/LanguageWrapper";
import PageLayout from "@/components/PageLayout";
import MouseLight from "@/components/MouseLight";

export default function DownloadPage() {
  const { t, lang } = useLang();
  const [showWhiteScreen, setShowWhiteScreen] = useState(true);
  const [bgPhase, setBgPhase] = useState<'clear' | 'blurring' | 'blurred'>('clear');
  const [showRegionModal, setShowRegionModal] = useState(false);

  // 한국어인지 확인
  const isKorean = lang === 'kr';

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

  return (
    <>
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
            src="/background/2.png"
            alt="Background"
            fill
            className={`object-cover transition-all duration-2000 ${
              bgPhase === 'clear' ? 'blur-0' : 'blur-[3px]'
            }`}
            style={{ transitionDuration: '0.8s' }}
            priority
          />
          {/* 어두워지는 오버레이 */}
          <div
            className={`absolute inset-0 bg-black transition-opacity duration-2000 ${
              bgPhase === 'clear' ? 'opacity-0' : 'opacity-40'
            }`}
            style={{ transitionDuration: '0.8s' }}
          />
        </div>

        {/* 마우스를 따라다니는 빛 효과 */}
        {bgPhase !== 'clear' && <MouseLight />}

        {/* 다운로드 섹션 */}
        <section className="text-center py-20 relative min-h-[80vh] flex flex-col items-center justify-center">
          <div
            className="relative z-10 transition-all duration-500 ease-out"
            style={{
              opacity: bgPhase !== 'clear' ? 1 : 0,
              transform: bgPhase !== 'clear' ? 'translateY(0)' : 'translateY(20px)',
            }}
          >
            <h2 className="text-4xl font-bold mb-8 text-[#f8fafc]">{t("download.title")}</h2>

            {/* 해외 사용자 안내 문구 */}
            {!isKorean && (
              <p className="text-white/60 text-sm mb-8 max-w-2xl mx-auto px-4 leading-relaxed">
                {t("footer.globalNotice")}
              </p>
            )}

            <div className="flex flex-col sm:flex-row justify-center gap-6 sm:gap-12 w-full px-4">
              {/* 자동화 모듈 - 모든 언어에서 표시, 한국 외 지역은 클릭 시 안내 모달 */}
              {isKorean ? (
                <a
                  href="https://github.com/Kim-jong-hwan-1/dlas-website/releases/download/v3.6.0/DLAS.-.Night.Sky.Setup.3.6.0.exe"
                  className="bg-black/10 backdrop-blur-xl border border-white/10 rounded-2xl px-14 py-8
                             text-white text-xl font-semibold text-center
                             hover:bg-black/15 hover:border-[#fde68a]/30 transition-all duration-500"
                  style={{ boxShadow: '0 0 30px rgba(255, 255, 255, 0.08)' }}
                  onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 40px rgba(253, 230, 138, 0.25), 0 0 80px rgba(253, 230, 138, 0.15)'}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 0 30px rgba(255, 255, 255, 0.08)'}
                  download
                >
                  {t("downloadPage.software")} v3.6.0
                </a>
              ) : (
                <button
                  onClick={() => setShowRegionModal(true)}
                  className="bg-black/10 backdrop-blur-xl border border-white/10 rounded-2xl px-14 py-8
                             text-white text-xl font-semibold text-center
                             hover:bg-black/15 hover:border-[#fde68a]/30 transition-all duration-500"
                  style={{ boxShadow: '0 0 30px rgba(255, 255, 255, 0.08)' }}
                  onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 40px rgba(253, 230, 138, 0.25), 0 0 80px rgba(253, 230, 138, 0.15)'}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 0 30px rgba(255, 255, 255, 0.08)'}
                >
                  {t("downloadPage.software")}
                </button>
              )}
              {/* FAST EDITOR는 모든 언어에서 표시 */}
              <a
                href="https://github.com/Kim-jong-hwan-1/dlas-website/releases/download/E_v.2.3.1/DLAS.FAST.EDITOR.Setup.2.3.1.exe"
                className="bg-black/10 backdrop-blur-xl border border-white/10 rounded-2xl px-14 py-8
                           text-white text-xl font-semibold text-center
                           hover:bg-black/15 hover:border-[#fde68a]/30 transition-all duration-500"
                style={{ boxShadow: '0 0 30px rgba(255, 255, 255, 0.08)' }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 40px rgba(253, 230, 138, 0.25), 0 0 80px rgba(253, 230, 138, 0.15)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 0 30px rgba(255, 255, 255, 0.08)'}
                download
              >
                {t("downloadPage.fastEditor")} v2.3.1
              </a>
            </div>
          </div>
        </section>
      </PageLayout>

      {/* 한국 외 지역 안내 모달 */}
      {showRegionModal && (
        <div
          className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center px-4"
          onClick={() => setShowRegionModal(false)}
        >
          <div
            className="bg-black/10 backdrop-blur-xl border border-white/10 rounded-2xl p-8 max-w-md text-center
                       hover:bg-black/15 hover:border-[#fde68a]/30 transition-all duration-500"
            style={{ boxShadow: '0 0 30px rgba(255, 255, 255, 0.08)' }}
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 40px rgba(253, 230, 138, 0.25), 0 0 80px rgba(253, 230, 138, 0.15)'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 0 30px rgba(255, 255, 255, 0.08)'}
          >
            <h3 className="text-xl font-bold text-white mb-4">
              {t("downloadPage.regionNotice") || "Region Notice"}
            </h3>
            <p className="text-white/70 mb-6">
              {t("downloadPage.regionNoticeDesc") || "The Automation Module is currently only available in South Korea due to medical device certification requirements."}
            </p>
            <button
              onClick={() => setShowRegionModal(false)}
              className="bg-black/30 border border-white/10 text-white px-6 py-2 rounded-lg
                         hover:bg-black/50 hover:border-white/20 transition-all duration-300"
            >
              {t("purchase.close") || "Close"}
            </button>
          </div>
        </div>
      )}

    </>
  );
}
