"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useLang } from "@/components/LanguageWrapper";
import PageLayout from "@/components/PageLayout";

const tips = [
  // EXO 팁 (HTML)
  {
    id: 1,
    title: "EXO Tip #1: 파닉 추가하기",
    desc: "엑소에서 주문서 안바꾸고 파닉 추가하는 방법",
    type: "html",
    url: "/tip/exo_1_potinc.html",
  },
  {
    id: 2,
    title: "EXO Tip #2: 라이브러리 에디팅 응용",
    desc: "커넥션부위 조절로 깔끔한 어버트먼트 디자인 하는 방법",
    type: "html",
    url: "/tip/exo_2_library_1.html",
  },
  // EXO 팁 (YouTube)
  {
    id: 3,
    title: "EXO Tip #3: 과교합 해결",
    desc: "엑소에서 과교합 문제 해결하는 방법",
    type: "youtube",
    url: "https://www.youtube.com/embed/YNJGHHQ6q34",
  },
  {
    id: 4,
    title: "EXO Tip #4: 디자인 빨리하는 방법 (왁스업)",
    desc: "왁스업 디자인 작업 속도 향상 팁",
    type: "youtube",
    url: "https://www.youtube.com/embed/FzFub31JF30",
  },
  {
    id: 5,
    title: "EXO Tip #5: 치은디자인 하는 방법",
    desc: "엑소에서 치은 디자인 작업 방법",
    type: "youtube",
    url: "https://www.youtube.com/embed/GOjMKfDM0WY",
  },
  {
    id: 6,
    title: "EXO Tip #6: 교합기 사용법",
    desc: "엑소 교합기 활용 방법",
    type: "youtube",
    url: "https://www.youtube.com/embed/zFLYWG3pczw",
  },
  {
    id: 7,
    title: "EXO Tip #7: 주문서 살리고 어버트먼트 매칭",
    desc: "주문서 그대로 유지하면서 어버트먼트 매칭해서 디자인하기",
    type: "youtube",
    url: "https://www.youtube.com/embed/pwee-ZGyH1o",
  },
  // 개념 팁
  {
    id: 8,
    title: "개념 Tip #1: 윌슨만곡 부여의 의미",
    desc: "DLAS가 생각하는 윌슨만곡의 중요성과 적용 방법",
    type: "youtube",
    url: "https://www.youtube.com/embed/xXXLLi7y7b4",
  },
  {
    id: 9,
    title: "개념 Tip #2: 모델리스에서의 과교합 1편",
    desc: "모델리스 작업에서의 과교합 개념과 적용",
    type: "youtube",
    url: "https://www.youtube.com/embed/v72T5nzzBVs",
  },
  {
    id: 10,
    title: "개념 Tip #3: 모델리스에서의 과교합 2편",
    desc: "모델리스 작업에서의 과교합 심화 개념",
    type: "youtube",
    url: "https://www.youtube.com/embed/hD48-_5GCxk",
  },
  {
    id: 11,
    title: "개념 Tip #4: 토크와 어버트먼트 축변위",
    desc: "토크 적용과 어버트먼트 축변위의 이해",
    type: "youtube",
    url: "https://www.youtube.com/embed/h_0rIVS6Gyo",
  },
  {
    id: 12,
    title: "개념 Tip #5: 풀케이스 VD 채득시 CR의 중요성",
    desc: "풀케이스에서 VD 채득 시 CR의 중요성",
    type: "youtube",
    url: "https://www.youtube.com/embed/-RFqChL8ilY",
  },
  {
    id: 13,
    title: "개념 Tip #6: 스캔바디 오차 검증하기",
    desc: "스캔바디는 항상 일정한 위치를 알려주진 않는다",
    type: "youtube",
    url: "https://www.youtube.com/embed/pm2HzBIKOlw",
  },
  {
    id: 14,
    title: "개념 Tip #7: 치과에서 문제생겨서 전화 왔을 때",
    desc: "치과에서 문제 발생 시 대응 방법",
    type: "youtube",
    url: "https://www.youtube.com/embed/FAQEcjru41g",
  },
  {
    id: 15,
    title: "개념 Tip #8: 스캔바디 자체 오차 확인하기",
    desc: "스캔바디 자체의 오차를 확인하는 방법",
    type: "youtube",
    url: "https://www.youtube.com/embed/39Ud9wvFqis",
  },
];

export default function TipsPage() {
  const { t } = useLang();
  const [selectedTip, setSelectedTip] = useState<typeof tips[0] | null>(null);

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
                      자세히 보기
                    </button>
                  </div>
                </div>
              ))}

              {/* 왁스업 STL 공유 */}
              <div className="glass rounded-xl overflow-hidden hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] transition-all duration-300">
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2 text-[#f8fafc]">공유 Tip #1: 왁스업 STL 공유</h3>
                  <p className="text-[#f8fafc]/60 mb-4">상악 6전치 왁스업 STL 파일을 공유합니다</p>
                  <div className="space-y-2">
                    <a
                      href="/상악6전치검 1.stl"
                      download
                      className="block w-full border border-green-400/40 text-white/80 py-2 px-4 rounded-lg
                                 hover:bg-green-500/10 hover:border-green-400/60 transition-all duration-300 text-center backdrop-blur-sm"
                    >
                      상악6전치검 1.stl 다운로드
                    </a>
                    <a
                      href="/상악6전치검 2.stl"
                      download
                      className="block w-full border border-green-400/40 text-white/80 py-2 px-4 rounded-lg
                                 hover:bg-green-500/10 hover:border-green-400/60 transition-all duration-300 text-center backdrop-blur-sm"
                    >
                      상악6전치검 2.stl 다운로드
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
