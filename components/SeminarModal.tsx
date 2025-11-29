"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface SeminarModalProps {
  onClose?: () => void;
}

export default function SeminarModal({ onClose }: SeminarModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const seminarLink = "https://docs.google.com/forms/d/e/1FAIpQLSc_fzZTLxCqNlCYlbZs3RvogqSxbzq9BMFQnAiTBSNyw8z52A/viewform?usp=sharing&ouid=100677474144073110334";

  // 포스터 이미지 배열 (1.png ~ 9.png)
  const posters = Array.from({ length: 9 }, (_, i) => `/posters/${i + 1}.png`);

  const handleClose = () => {
    if (onClose) onClose();
  };

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? posters.length - 1 : prev - 1));
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev === posters.length - 1 ? 0 : prev + 1));
  };

  const handleApply = () => {
    window.open(seminarLink, "_blank", "noopener,noreferrer");
  };

  const handleImageClick = () => {
    setIsFullscreen(true);
  };

  const handleFullscreenClose = () => {
    setIsFullscreen(false);
  };

  // ESC 키로 전체화면 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        handleFullscreenClose();
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isFullscreen]);

  // 전체화면 모드
  if (isFullscreen) {
    return (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black cursor-pointer"
        onClick={handleFullscreenClose}
      >
        <div className="relative w-full h-full">
          <Image
            src={posters[currentSlide]}
            alt={`세미나 포스터 ${currentSlide + 1}`}
            fill
            className="object-contain"
            priority
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-full bg-white rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      onClick={(e) => e.stopPropagation()}
    >
        {/* 닫기 버튼 */}
        <button
          onClick={handleClose}
          aria-label="닫기"
          className="absolute right-4 top-4 z-[9999] h-10 w-10 rounded-full
                     bg-black/90 text-white shadow-lg
                     flex items-center justify-center
                     hover:bg-black active:scale-95
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-black
                     transition"
        >
          <span className="text-2xl leading-none">×</span>
        </button>

        {/* 모달 헤더 */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-4 sm:px-6 py-3 sm:py-4">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-center">세미나 안내</h2>
          <p className="text-center mt-1 text-xs sm:text-sm text-blue-100">
            DLAS 세미나에 참여하세요
          </p>
        </div>

        {/* 메인 콘텐츠 영역: 이미지(왼쪽) + 영상(오른쪽) */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* 왼쪽: 슬라이더 영역 */}
          <div className="relative bg-gray-50 flex-1 lg:w-1/2">
          {/* 이미지 컨테이너 */}
          <div
            className="relative w-full h-full cursor-pointer"
            onClick={handleImageClick}
          >
            <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-4">
              <Image
                src={posters[currentSlide]}
                alt={`세미나 포스터 ${currentSlide + 1}`}
                fill
                className="object-contain"
                priority={currentSlide === 0}
              />
            </div>
          </div>

          {/* 이전 버튼 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrevSlide();
            }}
            aria-label="이전 슬라이드"
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10
                       h-16 w-16 sm:h-24 sm:w-24 lg:h-36 lg:w-36 rounded-full bg-black/60 text-white
                       flex items-center justify-center
                       hover:bg-black/80 active:scale-95
                       transition shadow-lg"
          >
            <span className="text-3xl sm:text-5xl lg:text-7xl leading-none">‹</span>
          </button>

          {/* 다음 버튼 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNextSlide();
            }}
            aria-label="다음 슬라이드"
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10
                       h-16 w-16 sm:h-24 sm:w-24 lg:h-36 lg:w-36 rounded-full bg-black/60 text-white
                       flex items-center justify-center
                       hover:bg-black/80 active:scale-95
                       transition shadow-lg"
          >
            <span className="text-3xl sm:text-5xl lg:text-7xl leading-none">›</span>
          </button>

          {/* 슬라이드 인디케이터 */}
          <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 sm:gap-2 z-10">
            {posters.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentSlide(index);
                }}
                aria-label={`슬라이드 ${index + 1}로 이동`}
                className={`h-1.5 sm:h-2 rounded-full transition-all ${
                  index === currentSlide
                    ? "w-6 sm:w-8 bg-blue-600"
                    : "w-1.5 sm:w-2 bg-gray-400 hover:bg-gray-600"
                }`}
              />
            ))}
          </div>
        </div>

        {/* 오른쪽: 영상 영역 */}
        <div className="flex-1 lg:w-1/2 bg-white p-3 sm:p-4 flex flex-col gap-3 overflow-y-auto">
          {/* 소개 영상 */}
          <div className="flex flex-col items-center h-full">
            <h3 className="text-sm sm:text-base font-bold mb-2 text-blue-600">소개 영상</h3>
            <div className="w-full flex-1 bg-black rounded-lg overflow-hidden shadow-lg">
              <iframe
                src="https://www.youtube.com/embed/39Ud9wvFqis"
                title="DLAS 소개 영상"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          </div>
        </div>
      </div>

        {/* 가격 정보 */}
        <div className="px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-blue-100">
          <h3 className="text-sm sm:text-base font-bold text-center text-gray-800 mb-1">
            세미나 참가비
          </h3>
          <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 justify-center items-center">
            <div className="text-center px-2 py-1 bg-white rounded shadow-sm">
              <span className="text-xs font-semibold text-blue-600">1인</span>
              <span className="mx-1 text-gray-400">|</span>
              <span className="text-sm font-bold text-gray-800">20만원</span>
            </div>
            <div className="text-center px-2 py-1 bg-white rounded shadow-sm">
              <span className="text-xs font-semibold text-blue-600">2인</span>
              <span className="mx-1 text-gray-400">|</span>
              <span className="text-sm font-bold text-gray-800">각 17만원</span>
            </div>
            <div className="text-center px-2 py-1 bg-white rounded shadow-sm">
              <span className="text-xs font-semibold text-blue-600">3인</span>
              <span className="mx-1 text-gray-400">|</span>
              <span className="text-sm font-bold text-gray-800">각 15만원</span>
            </div>
          </div>
          <p className="text-center mt-1 text-[10px] sm:text-xs text-gray-500">
            * 부가세 별도
          </p>
          <p className="text-center mt-1 text-[10px] sm:text-xs text-red-600 font-semibold">
            * 세미나 등록은 해당 세미나 전날까지 가능하나, 조기마감 될 수 있습니다.
          </p>
        </div>

        {/* 하단 버튼 영역 */}
        <div className="px-3 sm:px-4 py-2 sm:py-3 bg-white flex gap-2">
          <button
            onClick={handleApply}
            className="px-4 sm:px-6 py-2 sm:py-3 rounded-lg bg-blue-600 text-white
                       hover:bg-blue-700 active:scale-95
                       font-bold transition shadow-lg text-base sm:text-lg flex-1"
          >
            세미나 신청하기
          </button>
          <button
            onClick={handleClose}
            className="px-4 sm:px-6 py-2 sm:py-3 rounded-lg bg-gray-500 text-white
                       hover:bg-gray-600 active:scale-95
                       font-medium transition shadow-lg text-base sm:text-lg flex-1"
          >
            닫기
          </button>
        </div>
      </div>
  );
}
