"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useLang } from "@/components/LanguageWrapper";
import PageLayout from "@/components/PageLayout";

export default function TipsPage() {
  const { t } = useLang();
  const [selectedTip, setSelectedTip] = useState<{ id: number; title: string; desc: string; type: string; url: string } | null>(null);

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

  const tips = [
    // EXO 팁 (HTML)
    { id: 1, title: t("tipsPage.tip1Title"), desc: t("tipsPage.tip1Desc"), type: "html", url: "/tip/exo_1_potinc.html" },
    { id: 2, title: t("tipsPage.tip2Title"), desc: t("tipsPage.tip2Desc"), type: "html", url: "/tip/exo_2_library_1.html" },
    // EXO 팁 (YouTube)
    { id: 3, title: t("tipsPage.tip3Title"), desc: t("tipsPage.tip3Desc"), type: "youtube", url: "https://www.youtube.com/embed/YNJGHHQ6q34" },
    { id: 4, title: t("tipsPage.tip4Title"), desc: t("tipsPage.tip4Desc"), type: "youtube", url: "https://www.youtube.com/embed/FzFub31JF30" },
    { id: 5, title: t("tipsPage.tip5Title"), desc: t("tipsPage.tip5Desc"), type: "youtube", url: "https://www.youtube.com/embed/GOjMKfDM0WY" },
    { id: 6, title: t("tipsPage.tip6Title"), desc: t("tipsPage.tip6Desc"), type: "youtube", url: "https://www.youtube.com/embed/zFLYWG3pczw" },
    { id: 7, title: t("tipsPage.tip7Title"), desc: t("tipsPage.tip7Desc"), type: "youtube", url: "https://www.youtube.com/embed/pwee-ZGyH1o" },
    // 개념 팁
    { id: 8, title: t("tipsPage.tip8Title"), desc: t("tipsPage.tip8Desc"), type: "youtube", url: "https://www.youtube.com/embed/xXXLLi7y7b4" },
    { id: 9, title: t("tipsPage.tip9Title"), desc: t("tipsPage.tip9Desc"), type: "youtube", url: "https://www.youtube.com/embed/v72T5nzzBVs" },
    { id: 10, title: t("tipsPage.tip10Title"), desc: t("tipsPage.tip10Desc"), type: "youtube", url: "https://www.youtube.com/embed/hD48-_5GCxk" },
    { id: 11, title: t("tipsPage.tip11Title"), desc: t("tipsPage.tip11Desc"), type: "youtube", url: "https://www.youtube.com/embed/h_0rIVS6Gyo" },
    { id: 12, title: t("tipsPage.tip12Title"), desc: t("tipsPage.tip12Desc"), type: "youtube", url: "https://www.youtube.com/embed/-RFqChL8ilY" },
    { id: 13, title: t("tipsPage.tip13Title"), desc: t("tipsPage.tip13Desc"), type: "youtube", url: "https://www.youtube.com/embed/pm2HzBIKOlw" },
    { id: 14, title: t("tipsPage.tip14Title"), desc: t("tipsPage.tip14Desc"), type: "youtube", url: "https://www.youtube.com/embed/FAQEcjru41g" },
    { id: 15, title: t("tipsPage.tip15Title"), desc: t("tipsPage.tip15Desc"), type: "youtube", url: "https://www.youtube.com/embed/39Ud9wvFqis" },
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
            src="/background/4.png"
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

        {/* 기공작업팁 섹션 */}
        <section className="py-20 px-6 relative min-h-screen">
          <div
            className="max-w-6xl mx-auto relative z-10 transition-all duration-500 ease-out"
            style={{
              opacity: bgPhase !== 'clear' ? 1 : 0,
              transform: bgPhase !== 'clear' ? 'translateY(0)' : 'translateY(20px)',
            }}
          >
            <h2 className="text-4xl font-bold mb-12 text-center text-[#f8fafc]">{t("nav.tips")}</h2>

            {/* 팁 목록 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tips.map((tip) => (
                <div
                  key={tip.id}
                  className="glass rounded-xl overflow-hidden hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] transition-all duration-300"
                >
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-2 text-[#f8fafc]">{tip.title}</h3>
                    <p className="text-[#f8fafc]/60 mb-4">{tip.desc}</p>
                    <button
                      onClick={() => setSelectedTip(tip)}
                      className="w-full border border-[#8b5cf6]/40 text-white/80 py-2 px-4 rounded-lg
                                 hover:bg-[#8b5cf6]/10 hover:border-[#8b5cf6]/60 transition-all duration-300 backdrop-blur-sm"
                    >
                      {t("tipsPage.viewDetail")}
                    </button>
                  </div>
                </div>
              ))}

              {/* 왁스업 STL 공유 */}
              <div className="glass rounded-xl overflow-hidden hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] transition-all duration-300">
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2 text-[#f8fafc]">{t("tipsPage.shareTitle")}</h3>
                  <p className="text-[#f8fafc]/60 mb-4">{t("tipsPage.shareDesc")}</p>
                  <div className="space-y-2">
                    <a
                      href="/상악6전치검 1.stl"
                      download
                      className="block w-full border border-green-400/40 text-white/80 py-2 px-4 rounded-lg
                                 hover:bg-green-500/10 hover:border-green-400/60 transition-all duration-300 text-center backdrop-blur-sm"
                    >
                      {t("tipsPage.shareDownload1")}
                    </a>
                    <a
                      href="/상악6전치검 2.stl"
                      download
                      className="block w-full border border-green-400/40 text-white/80 py-2 px-4 rounded-lg
                                 hover:bg-green-500/10 hover:border-green-400/60 transition-all duration-300 text-center backdrop-blur-sm"
                    >
                      {t("tipsPage.shareDownload2")}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </PageLayout>

      {/* 팁 모달 */}
      {selectedTip && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedTip(null)}
        >
          <button
            onClick={() => setSelectedTip(null)}
            className="absolute top-4 right-4 text-white text-4xl font-bold z-10 w-12 h-12 flex items-center justify-center
                       hover:bg-white/20 rounded-full transition"
          >
            ×
          </button>
          <div
            className="w-full max-w-4xl h-[80vh] glass rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedTip.type === "youtube" ? (
              <iframe
                src={selectedTip.url.replace('youtube.com', 'youtube-nocookie.com')}
                title={selectedTip.title}
                className="w-full h-full"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <iframe src={selectedTip.url} title={selectedTip.title} className="w-full h-full bg-white" />
            )}
          </div>
        </div>
      )}
    </>
  );
}
