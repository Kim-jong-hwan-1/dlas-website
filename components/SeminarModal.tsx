"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function SeminarModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  const seminarLink = "https://docs.google.com/forms/d/e/1FAIpQLSc_fzZTLxCqNlCYlbZs3RvogqSxbzq9BMFQnAiTBSNyw8z52A/viewform?usp=sharing&ouid=100677474144073110334";

  // 포스터 이미지 배열 (1.png ~ 9.png)
  const posters = Array.from({ length: 9 }, (_, i) => `/posters/${i + 1}.png`);

  useEffect(() => {
    // 페이지 로드 시 모달 표시
    setIsOpen(true);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
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

  // ESC 키로 모달 닫기
  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 p-2 sm:p-4"
      onClick={handleClose}
    >
      <div
        className="relative w-[95vw] sm:w-[85vw] lg:w-[65vw] h-[95vh] bg-white rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col"
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
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-4 sm:px-8 py-4 sm:py-6">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-center">세미나 안내</h2>
          <p className="text-center mt-1 sm:mt-2 text-sm sm:text-base text-blue-100">
            DLAS 세미나에 참여하세요
          </p>
        </div>

        {/* 슬라이더 영역 */}
        <div className="relative bg-gray-50 flex-1">
          {/* 이미지 컨테이너 */}
          <div
            className="relative w-full h-full cursor-pointer"
            onClick={handleNextSlide}
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

        {/* 하단 버튼 영역 */}
        <div className="px-4 sm:px-8 py-4 sm:py-6 bg-white flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <button
            onClick={handleClose}
            className="px-6 sm:px-8 py-3 sm:py-4 rounded-lg bg-gray-200 text-gray-700
                       hover:bg-gray-300 active:scale-95
                       font-medium transition text-base sm:text-lg"
          >
            나중에 보기
          </button>
          <button
            onClick={handleApply}
            className="px-8 sm:px-12 py-4 sm:py-5 rounded-lg bg-blue-600 text-white
                       hover:bg-blue-700 active:scale-95
                       font-bold transition shadow-lg text-xl sm:text-2xl"
          >
            세미나 신청하기
          </button>
        </div>
      </div>
    </div>
  );
}
