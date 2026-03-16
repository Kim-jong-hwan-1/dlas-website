"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import PageLayout from "@/components/PageLayout";
import Image from "next/image";
import { useLang } from "@/components/LanguageWrapper";
import MouseLight from "@/components/MouseLight";

// 단어별 애니메이션 컴포넌트
function AnimatedText({ text, isVisible, wordDelay = 250 }: { text: string; isVisible: boolean; wordDelay?: number }) {
  const words = text.split(' ');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // 마운트 후 약간의 딜레이를 두고 애니메이션 시작
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const show = mounted && isVisible;

  return (
    <span className="inline-block text-center w-full">
      {words.map((word, index) => (
        <span
          key={index}
          className="inline-block transition-opacity duration-1000 ease-out"
          style={{
            opacity: show ? 1 : 0,
            transitionDelay: show ? `${index * wordDelay}ms` : '0ms',
            marginRight: index < words.length - 1 ? '0.3em' : '0'
          }}
        >
          {word}
        </span>
      ))}
    </span>
  );
}

export default function HomePage() {
  const { t, lang } = useLang();
  const router = useRouter();

  // URL 쿼리 파라미터 체크하여 리다이렉트
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'terms-privacy') {
      router.replace(`/${lang}/terms`);
    }
  }, [router, lang]);

  // 채용 모달
  const [showRecruitModal, setShowRecruitModal] = useState(false);
  const [recruitPage, setRecruitPage] = useState(0);
  const recruitImages = [
    "/recruit/001.png",
    "/recruit/002.png",
    "/recruit/003.png",
    "/recruit/004.png",
    "/recruit/005.png",
    "/recruit/006.png",
    "/recruit/007.png",
  ];

  // 인트로 끝난 후 채용 모달 표시 (하루동안 보지않기 체크)
  const [introFinished, setIntroFinished] = useState(false);
  useEffect(() => {
    if (!introFinished) return;
    const dismissed = localStorage.getItem("DLAS_RECRUIT_DISMISSED");
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      if (Date.now() - dismissedTime < 24 * 60 * 60 * 1000) return;
    }
    const timer = setTimeout(() => setShowRecruitModal(true), 500);
    return () => clearTimeout(timer);
  }, [introFinished]);

  const dismissRecruitForDay = () => {
    localStorage.setItem("DLAS_RECRUIT_DISMISSED", String(Date.now()));
    setShowRecruitModal(false);
  };

  // 번역된 텍스트 시퀀스
  const textSequence = [
    t("homePage.text1"),
    t("homePage.text2"),
    t("homePage.text3"),
  ];

  // 첫 방문인지 체크 (sessionStorage 사용)
  const [isFirstVisit, setIsFirstVisit] = useState(true);
  const [showIntro, setShowIntro] = useState(true);
  const [showWhiteFlash, setShowWhiteFlash] = useState(false);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [isTextVisible, setIsTextVisible] = useState(false);
  const [bgPhase, setBgPhase] = useState<'clear' | 'blurring' | 'blurred'>('clear');
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // 재방문시 로딩 애니메이션 상태
  const [showWhiteScreen, setShowWhiteScreen] = useState(true);

  // 첫 방문 체크
  useEffect(() => {
    const hasVisited = sessionStorage.getItem('DLAS_HAS_VISITED');
    if (hasVisited) {
      // 이미 방문한 적 있으면 인트로 스킵, 로딩 애니메이션만 표시
      setIsFirstVisit(false);
      setShowIntro(false);

      // 로딩 애니메이션 타이머
      const whiteTimer = setTimeout(() => setShowWhiteScreen(false), 100);
      const blurTimer = setTimeout(() => setBgPhase('blurring'), 200);
      const blurredTimer = setTimeout(() => {
        setBgPhase('blurred');
        setIsTextVisible(true);
        setIntroFinished(true);
      }, 800);

      return () => {
        clearTimeout(whiteTimer);
        clearTimeout(blurTimer);
        clearTimeout(blurredTimer);
      };
    } else {
      // 첫 방문이면 세션에 저장, 화이트 스크린 숨김 (인트로 영상 표시)
      sessionStorage.setItem('DLAS_HAS_VISITED', 'true');
      setShowWhiteScreen(false);
    }
  }, []);

  // 영상 준비되면 자동 재생
  useEffect(() => {
    if (!isFirstVisit || !videoReady) return;

    if (videoRef.current) {
      videoRef.current.play().catch((err) => {
        console.log("Autoplay blocked:", err);
        // 자동재생 실패해도 영상은 계속 표시 (사용자가 SKIP 가능)
      });
    }
  }, [isFirstVisit, videoReady]);

  // 배경 블러 + 텍스트 순차 애니메이션
  useEffect(() => {
    if (showIntro) return;

    // 첫 방문 후 인트로 끝났을 때도 빠르게 로딩
    const blurTimer = setTimeout(() => {
      setBgPhase('blurring');
    }, 200);

    const textTimer = setTimeout(() => {
      setBgPhase('blurred');
      setIsTextVisible(true);
    }, 800);

    return () => {
      clearTimeout(blurTimer);
      clearTimeout(textTimer);
    };
  }, [showIntro]);

  // 텍스트 순차 애니메이션
  useEffect(() => {
    if (showIntro || bgPhase !== 'blurred') return;

    const interval = setInterval(() => {
      // 동시에 스르륵 사라짐
      setIsTextVisible(false);

      // 1초 사라지는 시간 + 1초 대기 후 다음 문장
      setTimeout(() => {
        setCurrentTextIndex((prev) => (prev + 1) % textSequence.length);
        setIsTextVisible(true);
      }, 2000);
    }, 5000); // 더 빠르게: 나타남(~1초) + 유지(2초) + 사라짐+대기(2초)

    return () => clearInterval(interval);
  }, [showIntro, bgPhase]);

  const handleVideoEnd = () => {
    setShowWhiteFlash(true);
    setShowIntro(false);
    setTimeout(() => setIntroFinished(true), 2000);
  };

  const handleSkip = () => {
    setShowWhiteFlash(true);
    setShowIntro(false);
    setTimeout(() => setIntroFinished(true), 2000);
  };

  return (
    <>
      {/* 인트로 영상 (첫 방문시에만) */}
      {isFirstVisit && showIntro && (
        <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            preload="auto"
            onLoadedData={() => setVideoReady(true)}
            onEnded={handleVideoEnd}
            onError={(e) => {
              console.log("Video error:", e);
              // 에러 발생시 화이트 플래시와 함께 스킵
              setShowWhiteFlash(true);
              setShowIntro(false);
            }}
            className="w-[90vw] max-h-[70vh] sm:w-auto sm:max-w-[80%] sm:max-h-[80%] object-contain"
            src="/background/intro.mp4"
          >
            <source src="/background/intro.mp4" type="video/mp4" />
          </video>
          <button
            onClick={handleSkip}
            className="absolute bottom-8 right-8 text-white/50 hover:text-white text-sm transition-all duration-300 px-4 py-2"
            style={{ textShadow: "0 0 10px rgba(255,255,255,0.5)" }}
          >
            SKIP
          </button>
        </div>
      )}

      {/* 화이트 플래시 전환 효과 (첫 방문 - 인트로 영상 후) */}
      {showWhiteFlash && (
        <div
          className="fixed inset-0 z-[9998] bg-white pointer-events-none animate-fade-out"
          style={{
            animation: 'fadeOut 2s ease-out forwards'
          }}
          onAnimationEnd={() => setShowWhiteFlash(false)}
        />
      )}

      {/* 화이트 스크린 전환 효과 (재방문시) */}
      {!isFirstVisit && showWhiteScreen && (
        <div
          className="fixed inset-0 z-[9998] bg-white pointer-events-none"
          style={{ animation: 'fadeOut 0.8s ease-out forwards' }}
        />
      )}

      <PageLayout showUI={bgPhase !== 'clear'} showBackground={false}>
        {/* Fixed Background Image - stays in place while scrolling */}
        <div className="fixed inset-0 z-[1]">
          <Image
            src="/background/1.png"
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

        {/* 마우스를 따라다니는 은은한 빛 효과 */}
        {bgPhase !== 'clear' && <MouseLight />}

        {/* 홈 섹션 */}
        <section className="text-center py-32 relative overflow-hidden min-h-[80vh] flex flex-col justify-center">
          {/* Hero Content */}
          <div className="relative z-10 px-6 max-w-4xl mx-auto -mt-[130px]">
            <p
              className="text-3xl md:text-5xl lg:text-6xl font-semibold text-white"
              style={{
                textShadow: '0 0 40px rgba(253, 230, 138, 0.6), 0 0 80px rgba(253, 230, 138, 0.4)',
                fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif'
              }}
            >
              <AnimatedText
                key={currentTextIndex}
                text={textSequence[currentTextIndex]}
                isVisible={isTextVisible}
                wordDelay={150}
              />
            </p>
          </div>
        </section>
      </PageLayout>

      {/* 채용 모달 */}
      {showRecruitModal && (
        <div
          className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4"
          onClick={() => setShowRecruitModal(false)}
        >
          <div
            className="relative bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-6 max-w-5xl w-full"
            style={{ boxShadow: '0 0 40px rgba(253, 230, 138, 0.15), 0 0 80px rgba(253, 230, 138, 0.08)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col md:flex-row gap-4 sm:gap-6">
              {/* 왼쪽: 이미지 캐러셀 */}
              <div className="relative flex-1 min-w-0">
                <div className="relative w-full aspect-[4/5] rounded-xl overflow-hidden">
                  <Image
                    src={recruitImages[recruitPage]}
                    alt={`채용공고 ${recruitPage + 1}`}
                    fill
                    className="object-contain"
                    priority
                  />
                </div>

                {/* 페이지 인디케이터 */}
                <div className="flex justify-center gap-2 mt-3">
                  {recruitImages.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setRecruitPage(i)}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        i === recruitPage ? 'bg-[#fde68a] w-6' : 'bg-white/30 hover:bg-white/50'
                      }`}
                    />
                  ))}
                </div>

                {/* 이전/다음 버튼 */}
                {recruitPage > 0 && (
                  <button
                    onClick={() => setRecruitPage((p) => p - 1)}
                    className="absolute left-2 top-[45%] -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 border border-white/10 text-white flex items-center justify-center hover:bg-black/60 transition-all"
                  >
                    ←
                  </button>
                )}
                {recruitPage < recruitImages.length - 1 && (
                  <button
                    onClick={() => setRecruitPage((p) => p + 1)}
                    className="absolute right-2 top-[45%] -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 border border-white/10 text-white flex items-center justify-center hover:bg-black/60 transition-all"
                  >
                    →
                  </button>
                )}
              </div>

              {/* 오른쪽: 유튜브 영상 */}
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="relative w-full aspect-[9/16] md:aspect-auto md:flex-1 rounded-xl overflow-hidden border border-white/10 bg-black/30">
                  <iframe
                    className="w-full h-full absolute inset-0"
                    src="https://www.youtube.com/embed/2Ji6d2V1dKs?autoplay=1&mute=1"
                    title="DLAS 채용 안내 영상"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            </div>

            {/* 하단 버튼 */}
            <div className="flex justify-between items-center mt-4">
              <button
                onClick={dismissRecruitForDay}
                className="text-white/40 text-sm hover:text-white/70 transition-colors"
              >
                하루동안 보지않기
              </button>
              <button
                onClick={() => setShowRecruitModal(false)}
                className="bg-black/30 border border-white/10 text-white px-5 py-2 rounded-lg text-sm
                           hover:bg-black/50 hover:border-white/20 transition-all duration-300"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
