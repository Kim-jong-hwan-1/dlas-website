"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import PageLayout from "@/components/PageLayout";

export default function AboutPage() {
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
      title: "혁신",
      subtitle: "Innovation",
      description: "끊임없는 기술 혁신으로 치과 기공의 새로운 표준을 제시합니다. 우리는 불가능을 가능으로 바꾸는 도전을 두려워하지 않습니다.",
      icon: "✦"
    },
    {
      title: "신뢰",
      subtitle: "Trust",
      description: "변함없는 별빛처럼 고객과의 약속을 지킵니다. 정직과 투명함으로 오래도록 신뢰받는 파트너가 되겠습니다.",
      icon: "✧"
    },
    {
      title: "동반성장",
      subtitle: "Partnership",
      description: "함께 빛나는 별자리처럼, 고객과 함께 성장합니다. 우리의 성공은 고객의 성공 위에 빛납니다.",
      icon: "✦"
    },
    {
      title: "열정",
      subtitle: "Passion",
      description: "끊임없이 타오르는 별빛처럼, 더 나은 내일을 향한 열정을 멈추지 않습니다.",
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
                textShadow: '0 0 40px rgba(139, 92, 246, 0.5), 0 0 80px rgba(139, 92, 246, 0.3)',
                fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif'
              }}
            >
              어둠 속에서 빛나는 별처럼
            </h1>
            <p
              className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto leading-relaxed"
              style={{ fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif' }}
            >
              캄캄한 밤하늘에서도 밝게 빛나는 별들처럼,<br />
              힘들고 어려운 상황 속에서도 빛날 수 있도록.<br />
              DLAS는 치과 기공의 미래를 밝히는 빛이 되겠습니다.
            </p>
          </section>

          {/* 비전 & 미션 */}
          <section className="py-16 px-6">
            <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
              {/* 비전 */}
              <div
                className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8"
                style={{ boxShadow: '0 0 40px rgba(139, 92, 246, 0.15)' }}
              >
                <h2
                  className="text-2xl font-bold text-[#8b5cf6] mb-4"
                  style={{ textShadow: '0 0 20px rgba(139, 92, 246, 0.5)' }}
                >
                  VISION
                </h2>
                <p className="text-white/90 text-lg leading-relaxed">
                  치과 기공 산업의 밤하늘을 밝히는<br />
                  <span className="text-white font-semibold">북극성</span>이 되다
                </p>
                <p className="text-white/60 mt-4 text-sm leading-relaxed">
                  우리는 디지털 덴티스트리의 선두주자로서, 모든 치과 기공사가 나아갈 방향을 제시하는
                  변함없는 이정표가 되고자 합니다.
                </p>
              </div>

              {/* 미션 */}
              <div
                className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8"
                style={{ boxShadow: '0 0 40px rgba(6, 182, 212, 0.15)' }}
              >
                <h2
                  className="text-2xl font-bold text-[#06b6d4] mb-4"
                  style={{ textShadow: '0 0 20px rgba(6, 182, 212, 0.5)' }}
                >
                  MISSION
                </h2>
                <p className="text-white/90 text-lg leading-relaxed">
                  혁신적인 자동화 기술로<br />
                  <span className="text-white font-semibold">치과 기공사의 가치</span>를 빛나게 하다
                </p>
                <p className="text-white/60 mt-4 text-sm leading-relaxed">
                  반복적인 수작업에서 벗어나, 기공사 본연의 전문성과 창의성에 집중할 수 있도록.
                  우리의 기술이 그 여정을 함께합니다.
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
                Core Values
              </h2>
              <p className="text-center text-white/60 mb-12">우리가 믿고 추구하는 가치</p>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {coreValues.map((value, index) => (
                  <div
                    key={index}
                    className="bg-black/30 backdrop-blur-lg border border-white/10 rounded-xl p-6 text-center
                               hover:bg-black/50 hover:border-white/20 transition-all duration-300"
                    style={{ boxShadow: '0 0 20px rgba(139, 92, 246, 0.1)' }}
                  >
                    <div
                      className="text-3xl mb-4 text-[#8b5cf6]"
                      style={{ textShadow: '0 0 20px rgba(139, 92, 246, 0.8)' }}
                    >
                      {value.icon}
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1">{value.title}</h3>
                    <p className="text-sm text-[#8b5cf6]/80 mb-3">{value.subtitle}</p>
                    <p className="text-white/60 text-sm leading-relaxed">{value.description}</p>
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
                Why DLAS?
              </h2>
              <div
                className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 md:p-12"
                style={{ boxShadow: '0 0 60px rgba(139, 92, 246, 0.1), 0 0 30px rgba(6, 182, 212, 0.1)' }}
              >
                <p className="text-white/80 text-lg md:text-xl leading-relaxed mb-6">
                  <span className="text-white font-semibold">D</span>ental{' '}
                  <span className="text-white font-semibold">L</span>ab{' '}
                  <span className="text-white font-semibold">A</span>utomation{' '}
                  <span className="text-white font-semibold">S</span>olution
                </p>
                <p className="text-white/70 leading-relaxed mb-6">
                  DLAS는 치과 기공 자동화 솔루션의 약자입니다.<br />
                  하지만 우리에게 이 이름은 그 이상의 의미를 담고 있습니다.
                </p>
                <p className="text-white/70 leading-relaxed mb-6">
                  매일 밤 기공소에서 묵묵히 일하는 기공사들,<br />
                  그들의 손끝에서 탄생하는 작품들,<br />
                  그 가치가 세상에 더 밝게 빛나기를 바랍니다.
                </p>
                <p
                  className="text-white text-xl font-semibold"
                  style={{ textShadow: '0 0 20px rgba(139, 92, 246, 0.5)' }}
                >
                  "손의 기술에서 시스템의 기술로"
                </p>
                <p className="text-white/60 mt-4 text-sm">
                  우리는 기술로 시간을 아끼고, 그 시간으로 더 큰 가치를 만들어갑니다.
                </p>
              </div>
            </div>
          </section>

        </div>
      </PageLayout>
    </>
  );
}
