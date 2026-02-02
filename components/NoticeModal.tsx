"use client";

import { useState, useEffect } from "react";
import { useLang } from "@/components/LanguageWrapper";

interface NoticeModalProps {
  show: boolean;
  onClose: () => void;
}

export default function NoticeModal({ show, onClose }: NoticeModalProps) {
  const { t } = useLang();
  const [isVisible, setIsVisible] = useState(false);
  const [dontShowToday, setDontShowToday] = useState(false);

  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => setIsVisible(true), 100);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [show]);

  const handleClose = () => {
    // 오늘 하루 그만보기 체크시 localStorage에 오늘 날짜 저장
    if (dontShowToday) {
      const today = new Date().toDateString();
      localStorage.setItem('DLAS_NOTICE_HIDDEN_DATE', today);
    }
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 z-[9997] flex items-center justify-center p-4 transition-all duration-300 ${
        isVisible ? "bg-black/60 backdrop-blur-sm" : "bg-transparent"
      }`}
      onClick={handleClose}
    >
      <div
        className={`relative w-full max-w-xl transform transition-all duration-500 ${
          isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 투명 카드 스타일 모달 */}
        <div
          className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8
                     hover:bg-black/25 hover:border-white/20 transition-all duration-500
                     shadow-2xl"
        >
          {/* 닫기 버튼 */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-white/40 hover:text-white/70 transition-colors duration-300"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* 헤더 */}
          <div className="text-center mb-6">
            <div className="inline-block px-3 py-1 bg-white/5 border border-white/20 rounded-full text-white/70 text-xs font-medium mb-3">
              {t("notice.important") || "IMPORTANT NOTICE"}
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white/90 mb-2">
              {t("notice.title") || "공지사항"}
            </h2>
            <div className="w-20 h-px bg-white/20 mx-auto" />
          </div>

          {/* 마감일 강조 */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/15 rounded-lg">
              <svg className="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-white/80 font-medium">
                {t("notice.deadline") || "~ 2026. 02. 14"}
              </span>
            </div>
          </div>

          {/* 내용 섹션 */}
          <div className="space-y-4">
            {/* 판매 종료 공지 */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white/90 font-semibold mb-1">{t("notice.salesEnd") || "판매 종료 안내"}</h3>
                  <p className="text-white/60 text-sm leading-relaxed">
                    {t("notice.salesEndDesc") || "Family License 및 Permanent License는 2026년 2월 14일까지만 판매됩니다."}
                  </p>
                </div>
              </div>
            </div>

            {/* 가격 인상 공지 */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-white/90 font-semibold mb-1">{t("notice.priceChange") || "가격 변경 안내"}</h3>
                  <p className="text-white/60 text-sm leading-relaxed mb-3">
                    {t("notice.priceChangeDesc") || "2026년 2월 15일부터 아래 제품의 가격이 인상됩니다."}
                  </p>

                  {/* 가격표 - 개선된 가독성 */}
                  <div className="bg-black/20 rounded-lg overflow-hidden">
                    <div className="px-4 py-2 bg-white/5 border-b border-white/10">
                      <span className="text-white/80 text-sm font-medium">3 Transfer Jig / E Transfer Jig</span>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-white/50 text-xs mb-1">{t("notice.yearly") || "1년 이용권"}</div>
                        <div className="text-white font-bold text-lg">₩2,200,000</div>
                      </div>
                      <div className="text-center border-l border-white/10">
                        <div className="text-white/50 text-xs mb-1">{t("notice.lifetime") || "평생 이용권"}</div>
                        <div className="text-white font-bold text-lg">₩5,500,000</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 오늘 하루 그만보기 체크박스 */}
          <div className="mt-5 flex items-center justify-center">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={dontShowToday}
                onChange={(e) => setDontShowToday(e.target.checked)}
                className="w-4 h-4 rounded border-white/30 bg-white/10 text-white/80
                           focus:ring-white/30 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-white/50 text-sm group-hover:text-white/70 transition-colors">
                {t("notice.dontShowToday") || "오늘 하루 그만보기"}
              </span>
            </label>
          </div>

          {/* 확인 버튼 */}
          <div className="mt-5 flex justify-center">
            <button
              onClick={handleClose}
              className="px-8 py-2.5 bg-white/10 border border-white/20 rounded-full text-white/90 font-medium
                         hover:bg-white/15 hover:border-white/30
                         transition-all duration-300"
            >
              {t("notice.confirm") || "확인"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
