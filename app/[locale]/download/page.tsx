"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useLang } from "@/components/LanguageWrapper";
import PageLayout from "@/components/PageLayout";

export default function DownloadPage() {
  const { t } = useLang();
  const [showWhiteScreen, setShowWhiteScreen] = useState(true);
  const [bgPhase, setBgPhase] = useState<'clear' | 'blurring' | 'blurred'>('clear');

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

        {/* 다운로드 섹션 */}
        <section className="text-center py-20 relative min-h-[80vh] flex flex-col items-center justify-center">
          <div
            className="relative z-10 transition-all duration-500 ease-out"
            style={{
              opacity: bgPhase !== 'clear' ? 1 : 0,
              transform: bgPhase !== 'clear' ? 'translateY(0)' : 'translateY(20px)',
            }}
          >
            <h2 className="text-4xl font-bold mb-12 text-[#f8fafc]">{t("download.title")}</h2>
            <div className="flex flex-col sm:flex-row justify-center gap-6 sm:gap-32 w-full px-4">
              <a
                href="https://github.com/Kim-jong-hwan-1/dlas-website/releases/download/v2.6.1/DLAS_Setup_v2.6.1.exe"
                className="border border-[#8b5cf6]/40 text-[#f8fafc]/80 px-14 py-6 rounded-xl
                           hover:bg-[#8b5cf6]/10 hover:border-[#8b5cf6]/60 transition-all duration-300
                           text-center whitespace-nowrap inline-block text-xl font-semibold backdrop-blur-sm"
                download
              >
                {t("downloadPage.software")} v2.6.1
              </a>
              <a
                href="https://github.com/Kim-jong-hwan-1/dlas-website/releases/download/E_v.1.0.0/DLAS.FAST.EDITOR.Setup.1.0.0.exe"
                className="border border-[#8b5cf6]/40 text-[#f8fafc]/80 px-14 py-6 rounded-xl
                           hover:bg-[#8b5cf6]/10 hover:border-[#8b5cf6]/60 transition-all duration-300
                           text-center whitespace-nowrap inline-block text-xl font-semibold backdrop-blur-sm"
                download
              >
                {t("downloadPage.fastEditor")} v1.0.0
              </a>
            </div>
          </div>
        </section>
      </PageLayout>
    </>
  );
}
