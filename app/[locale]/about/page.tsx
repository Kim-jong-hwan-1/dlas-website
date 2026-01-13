"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import PageLayout from "@/components/PageLayout";
import { useLang } from "@/components/LanguageWrapper";
import MouseLight from "@/components/MouseLight";

export default function AboutPage() {
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

  const coreValues = [
    {
      title: t("aboutPage.value1Title"),
      subtitle: t("aboutPage.value1Subtitle"),
      description: t("aboutPage.value1Desc"),
      icon: "✦"
    },
    {
      title: t("aboutPage.value2Title"),
      subtitle: t("aboutPage.value2Subtitle"),
      description: t("aboutPage.value2Desc"),
      icon: "✧"
    },
    {
      title: t("aboutPage.value3Title"),
      subtitle: t("aboutPage.value3Subtitle"),
      description: t("aboutPage.value3Desc"),
      icon: "✦"
    },
    {
      title: t("aboutPage.value4Title"),
      subtitle: t("aboutPage.value4Subtitle"),
      description: t("aboutPage.value4Desc"),
      icon: "✧"
    }
  ];

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
            src="/background/6.png"
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
              bgPhase === 'clear' ? 'opacity-0' : 'opacity-50'
            }`}
            style={{ transitionDuration: '0.8s' }}
          />
        </div>

        {/* 마우스를 따라다니는 빛 효과 */}
        {bgPhase !== 'clear' && <MouseLight />}

        {/* 메인 콘텐츠 */}
        <div
          className="relative z-10 transition-all duration-500 ease-out"
          style={{
            opacity: bgPhase !== 'clear' ? 1 : 0,
            transform: bgPhase !== 'clear' ? 'translateY(0)' : 'translateY(20px)',
            wordBreak: 'keep-all',
          }}
        >
          {/* 히어로 섹션 */}
          <section className="text-center py-16 px-6 min-h-[60vh] flex flex-col items-center justify-center">
            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-8"
              style={{
                textShadow: '0 0 40px rgba(253, 230, 138, 0.5), 0 0 80px rgba(253, 230, 138, 0.3)',
                fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif'
              }}
            >
              {t("aboutPage.heroTitle")}
            </h1>
            <p
              className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto leading-relaxed"
              style={{ fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif' }}
            >
              {t("aboutPage.heroDesc1")}<br />
              {t("aboutPage.heroDesc2")}<br />
              {t("aboutPage.heroDesc3")}
            </p>
          </section>

          {/* 비전 & 미션 */}
          <section className="py-16 px-6">
            <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
              {/* 비전 */}
              <div
                className="bg-black/10 backdrop-blur-xl border border-white/10 rounded-2xl p-8 overflow-hidden
                           hover:bg-black/15 hover:border-[#fde68a]/30 transition-all duration-500"
                style={{ boxShadow: '0 0 30px rgba(255, 255, 255, 0.08)' }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 40px rgba(253, 230, 138, 0.25), 0 0 80px rgba(253, 230, 138, 0.15)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 0 30px rgba(255, 255, 255, 0.08)'}
              >
                <h2
                  className="text-2xl font-bold text-[#fde68a] mb-4"
                  style={{ textShadow: '0 0 20px rgba(253, 230, 138, 0.5)' }}
                >
                  {t("aboutPage.visionTitle")}
                </h2>
                <p className="text-white/90 text-lg leading-relaxed break-words">
                  {t("aboutPage.visionDesc1")}<br />
                  <span className="text-white font-semibold">{t("aboutPage.visionDesc2")}</span>{t("aboutPage.visionDesc3")}
                </p>
                <p className="text-white/60 mt-4 text-sm leading-relaxed break-words">
                  {t("aboutPage.visionDetail")}
                </p>
              </div>

              {/* 미션 */}
              <div
                className="bg-black/10 backdrop-blur-xl border border-white/10 rounded-2xl p-8 overflow-hidden
                           hover:bg-black/15 hover:border-[#fde68a]/30 transition-all duration-500"
                style={{ boxShadow: '0 0 30px rgba(255, 255, 255, 0.08)' }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 40px rgba(253, 230, 138, 0.25), 0 0 80px rgba(253, 230, 138, 0.15)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 0 30px rgba(255, 255, 255, 0.08)'}
              >
                <h2
                  className="text-2xl font-bold text-[#fde68a] mb-4"
                  style={{ textShadow: '0 0 20px rgba(253, 230, 138, 0.5)' }}
                >
                  {t("aboutPage.missionTitle")}
                </h2>
                <p className="text-white/90 text-lg leading-relaxed break-words">
                  {t("aboutPage.missionDesc1")}<br />
                  <span className="text-white font-semibold">{t("aboutPage.missionDesc2")}</span>{t("aboutPage.missionDesc3")}
                </p>
                <p className="text-white/60 mt-4 text-sm leading-relaxed break-words">
                  {t("aboutPage.missionDetail")}
                </p>
              </div>
            </div>
          </section>

          {/* 핵심가치 */}
          <section className="py-16 px-6">
            <div className="max-w-5xl mx-auto">
              <h2
                className="text-3xl md:text-4xl font-bold text-center text-white mb-4"
                style={{ textShadow: '0 0 30px rgba(255, 255, 255, 0.3)' }}
              >
                {t("aboutPage.coreValuesTitle")}
              </h2>
              <p className="text-center text-white/60 mb-12">{t("aboutPage.coreValuesSubtitle")}</p>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {coreValues.map((value, index) => (
                  <div
                    key={index}
                    className="bg-black/10 backdrop-blur-xl border border-white/10 rounded-xl p-6 text-center overflow-hidden
                               hover:bg-black/15 hover:border-[#fde68a]/30 transition-all duration-500"
                    style={{ boxShadow: '0 0 30px rgba(255, 255, 255, 0.08)' }}
                    onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 40px rgba(253, 230, 138, 0.25), 0 0 80px rgba(253, 230, 138, 0.15)'}
                    onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 0 30px rgba(255, 255, 255, 0.08)'}
                  >
                    <div
                      className="text-3xl mb-4 text-[#fde68a]"
                      style={{ textShadow: '0 0 20px rgba(253, 230, 138, 0.8)' }}
                    >
                      {value.icon}
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1 break-words">{value.title}</h3>
                    <p className="text-sm text-[#fde68a]/80 mb-3">{value.subtitle}</p>
                    <p className="text-white/60 text-sm leading-relaxed break-words">{value.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 브랜드 스토리 */}
          <section className="py-16 px-6">
            <div className="max-w-4xl mx-auto text-center">
              <h2
                className="text-3xl md:text-4xl font-bold text-white mb-8"
                style={{ textShadow: '0 0 30px rgba(255, 255, 255, 0.3)' }}
              >
                {t("aboutPage.whyDlasTitle")}
              </h2>
              <div
                className="bg-black/10 backdrop-blur-xl border border-white/10 rounded-2xl p-8 md:p-12 overflow-hidden
                           hover:bg-black/15 hover:border-[#fde68a]/30 transition-all duration-500"
                style={{ boxShadow: '0 0 30px rgba(255, 255, 255, 0.08)' }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 40px rgba(253, 230, 138, 0.25), 0 0 80px rgba(253, 230, 138, 0.15)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 0 30px rgba(255, 255, 255, 0.08)'}
              >
                <p className="text-white/80 text-lg md:text-xl leading-relaxed mb-6">
                  <span className="text-white font-semibold">D</span>ental{' '}
                  <span className="text-white font-semibold">L</span>ab{' '}
                  <span className="text-white font-semibold">A</span>utomation{' '}
                  <span className="text-white font-semibold">S</span>olution
                </p>
                <p className="text-white/70 leading-relaxed mb-6 break-words">
                  {t("aboutPage.whyDlasDesc1")}<br />
                  {t("aboutPage.whyDlasDesc2")}
                </p>
                <p className="text-white/70 leading-relaxed mb-6 break-words">
                  {t("aboutPage.whyDlasDesc3")}<br />
                  {t("aboutPage.whyDlasDesc4")}<br />
                  {t("aboutPage.whyDlasDesc5")}
                </p>
                <p
                  className="text-white text-xl font-semibold break-words"
                  style={{ textShadow: '0 0 20px rgba(253, 230, 138, 0.5)' }}
                >
                  {t("aboutPage.whyDlasQuote")}
                </p>
                <p className="text-white/60 mt-4 text-sm break-words">
                  {t("aboutPage.whyDlasFooter")}
                </p>
              </div>
            </div>
          </section>

        </div>
      </PageLayout>
    </>
  );
}
