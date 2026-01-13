"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useLang } from "@/components/LanguageWrapper";
import PageLayout from "@/components/PageLayout";
import MouseLight from "@/components/MouseLight";

export default function TermsPage() {
  const { t } = useLang();

  // 로딩 애니메이션 상태
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
            src="/background/5.png"
            alt="Background"
            fill
            className={`object-cover transition-all ${bgPhase === 'clear' ? 'blur-0' : 'blur-[3px]'}`}
            style={{ transitionDuration: '0.8s' }}
            priority
          />
          <div
            className={`absolute inset-0 bg-black transition-opacity ${bgPhase === 'clear' ? 'opacity-0' : 'opacity-40'}`}
            style={{ transitionDuration: '0.8s' }}
          />
        </div>

        {/* 마우스를 따라다니는 빛 효과 */}
        {bgPhase !== 'clear' && <MouseLight />}

        {/* Terms & Privacy 섹션 */}
        <section className="py-20 px-6 relative min-h-screen">
          <div
            className="max-w-4xl mx-auto text-left leading-7 text-[#f8fafc]/80 relative z-10 transition-all duration-500 ease-out"
            style={{
              opacity: bgPhase !== 'clear' ? 1 : 0,
              transform: bgPhase !== 'clear' ? 'translateY(0)' : 'translateY(20px)',
            }}
          >
            <h2 className="text-4xl font-bold mb-8 text-center text-[#f8fafc]">{t("terms.title")}</h2>

            <div
              className="bg-black/10 backdrop-blur-xl rounded-xl border border-white/10 p-8 mb-8
                         hover:bg-black/15 hover:border-[#fde68a]/30 transition-all duration-500"
              style={{ boxShadow: '0 0 30px rgba(255, 255, 255, 0.08)' }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 40px rgba(253, 230, 138, 0.25), 0 0 80px rgba(253, 230, 138, 0.15)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 0 30px rgba(255, 255, 255, 0.08)'}
            >
              <h3 className="text-2xl font-bold mb-6 text-[#f8fafc]">{t("terms.headingTerms")}</h3>
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
                <div key={a} className="mb-4">
                  <h4 className="font-semibold mb-1 text-[#fde68a]">{t(`terms.${a}.title`)}</h4>
                  <p
                    className="text-[#f8fafc]/70"
                    dangerouslySetInnerHTML={{
                      __html: t(`terms.${a}.desc`),
                    }}
                  />
                </div>
              ))}
              <p className="mt-6 text-[#f8fafc]/60">
                <strong>{t("terms.effectiveDate")}</strong>
              </p>
            </div>

            <div
              className="bg-black/10 backdrop-blur-xl rounded-xl border border-white/10 p-8
                         hover:bg-black/15 hover:border-[#fde68a]/30 transition-all duration-500"
              style={{ boxShadow: '0 0 30px rgba(255, 255, 255, 0.08)' }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 40px rgba(253, 230, 138, 0.25), 0 0 80px rgba(253, 230, 138, 0.15)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 0 30px rgba(255, 255, 255, 0.08)'}
            >
              <h3 className="text-2xl font-bold mb-6 text-[#f8fafc]">{t("privacy.headingPrivacy")}</h3>
              <p className="mb-4 text-[#f8fafc]/70">{t("privacy.intro")}</p>
              {["article1", "article2", "article3", "article4", "article5", "article6", "article7", "article8"].map(
                (a) => (
                  <div key={a} className="mb-4">
                    <h4 className="font-semibold mb-1 text-[#fde68a]">{t(`privacy.${a}.title`)}</h4>
                    <p
                      className="text-[#f8fafc]/70"
                      dangerouslySetInnerHTML={{
                        __html: t(`privacy.${a}.desc`),
                      }}
                    />
                  </div>
                )
              )}
              <p className="mt-6 text-[#f8fafc]/60">
                <strong>{t("privacy.effectiveDate")}</strong>
              </p>
            </div>
          </div>
        </section>
      </PageLayout>
    </>
  );
}
