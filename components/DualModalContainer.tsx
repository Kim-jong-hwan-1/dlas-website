"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import SeminarModal from "./SeminarModal";
import WebinaModal from "./WebinaModal";

export default function DualModalContainer() {
  const [isSeminarOpen, setIsSeminarOpen] = useState(false);
  const [isWebinaOpen, setIsWebinaOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // /app-privacy 경로에서는 모달을 표시하지 않음
    if (pathname === "/app-privacy") {
      return;
    }

    // 모바일 여부 확인
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    // 페이지 로드 시 세미나 모달 표시 비활성화
    // setIsSeminarOpen(true);

    return () => window.removeEventListener('resize', checkMobile);
  }, [pathname]);

  const handleSeminarClose = () => {
    setIsSeminarOpen(false);
  };

  const handleWebinaClose = () => {
    setIsWebinaOpen(false);
  };

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
      <div className="w-full h-full max-w-[98vw] max-h-[95vh] flex flex-col lg:flex-row gap-4 items-center justify-center">
        {/* 세미나 모달 */}
        {isSeminarOpen && (
          <div className="w-full h-full">
            <SeminarModal onClose={handleSeminarClose} />
          </div>
        )}

        {/* 웨비나 모달 */}
        {isWebinaOpen && (
          <div className="w-full lg:w-1/2 h-full lg:h-full">
            <WebinaModal onClose={handleWebinaClose} />
          </div>
        )}
      </div>
    </div>
  );
}
