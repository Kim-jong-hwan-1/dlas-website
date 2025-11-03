"use client";

import { useEffect, useState } from "react";
import SeminarModal from "./SeminarModal";
import WebinaModal from "./WebinaModal";

export default function DualModalContainer() {
  const [isSeminarOpen, setIsSeminarOpen] = useState(false);
  const [isWebinaOpen, setIsWebinaOpen] = useState(false);

  useEffect(() => {
    // 페이지 로드 시 모달 표시
    setIsSeminarOpen(true);
    setIsWebinaOpen(true);
  }, []);

  const handleBackdropClick = () => {
    setIsSeminarOpen(false);
    setIsWebinaOpen(false);
  };

  // 두 모달이 모두 닫히면 컨테이너도 닫기
  if (!isSeminarOpen && !isWebinaOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 p-2 sm:p-4"
      onClick={handleBackdropClick}
    >
      <div className="w-full h-full max-w-[95vw] max-h-[95vh] flex flex-col lg:flex-row gap-4 items-center justify-center">
        {/* 세미나 모달 */}
        {isSeminarOpen && (
          <div className="w-full lg:w-1/2 h-[48%] lg:h-full">
            <SeminarModal onClose={() => setIsSeminarOpen(false)} />
          </div>
        )}

        {/* 웨비나 모달 */}
        {isWebinaOpen && (
          <div className="w-full lg:w-1/2 h-[48%] lg:h-full">
            <WebinaModal onClose={() => setIsWebinaOpen(false)} />
          </div>
        )}
      </div>
    </div>
  );
}
