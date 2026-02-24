"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import PageLayout from "@/components/PageLayout";
import { useLang } from "@/components/LanguageWrapper";
import MouseLight from "@/components/MouseLight";

// 공지사항 데이터
const notices = [
  {
    id: 3,
    date: "2026-02-24",
    titleKey: "noticePage.notice3Title",
    contentKey: "noticePage.notice3Content",
    badge: "upcoming" as const,
  },
  {
    id: 1,
    date: "2026-02-19",
    titleKey: "noticePage.notice1Title",
    contentKey: "noticePage.notice1Content",
    badge: "completed" as const,
  },
  {
    id: 2,
    date: "2026-02-19",
    titleKey: "noticePage.notice2Title",
    contentKey: "noticePage.notice2Content",
    badge: "completed" as const,
  },
];

export default function NoticePage() {
  const { t } = useLang();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // 로딩 애니메이션 상태
  const [showWhiteScreen, setShowWhiteScreen] = useState(true);
  const [bgPhase, setBgPhase] = useState<"clear" | "blurring" | "blurred">("clear");

  useEffect(() => {
    const whiteTimer = setTimeout(() => setShowWhiteScreen(false), 100);
    const blurTimer = setTimeout(() => setBgPhase("blurring"), 200);
    const blurredTimer = setTimeout(() => setBgPhase("blurred"), 800);
    return () => {
      clearTimeout(whiteTimer);
      clearTimeout(blurTimer);
      clearTimeout(blurredTimer);
    };
  }, []);

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <>
      {/* 화이트 스크린 전환 효과 */}
      {showWhiteScreen && (
        <div
          className="fixed inset-0 z-[9998] bg-white pointer-events-none"
          style={{ animation: "fadeOut 0.8s ease-out forwards" }}
        />
      )}

      <PageLayout showUI={bgPhase !== "clear"} showBackground={false} showNavigation={false}>
        {/* Fixed Background Image */}
        <div className="fixed inset-0 z-[1]">
          <Image
            src="/background/4.png"
            alt="Background"
            fill
            className={`object-cover transition-all ${bgPhase === "clear" ? "blur-0" : "blur-[3px]"}`}
            style={{ transitionDuration: "0.8s" }}
            priority
          />
          <div
            className={`absolute inset-0 bg-black transition-opacity ${bgPhase === "clear" ? "opacity-0" : "opacity-40"}`}
            style={{ transitionDuration: "0.8s" }}
          />
        </div>

        {/* 마우스를 따라다니는 빛 효과 */}
        {bgPhase !== "clear" && <MouseLight />}

        {/* 공지사항 섹션 */}
        <section className="py-20 px-6 relative min-h-screen">
          <div
            className="max-w-4xl mx-auto relative z-10 transition-all duration-500 ease-out"
            style={{
              opacity: bgPhase !== "clear" ? 1 : 0,
              transform: bgPhase !== "clear" ? "translateY(0)" : "translateY(20px)",
            }}
          >
            <h2 className="text-4xl font-bold mb-12 text-center text-[#f8fafc]">
              {t("noticePage.title")}
            </h2>

            {/* 공지사항 목록 */}
            <div className="flex flex-col gap-4">
              {notices.map((notice) => (
                <div
                  key={notice.id}
                  className="bg-black/10 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden
                             hover:bg-black/15 hover:border-[#fde68a]/30 transition-all duration-500 cursor-pointer"
                  style={{ boxShadow: "0 0 30px rgba(255, 255, 255, 0.08)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.boxShadow =
                      "0 0 40px rgba(253, 230, 138, 0.25), 0 0 80px rgba(253, 230, 138, 0.15)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.boxShadow = "0 0 30px rgba(255, 255, 255, 0.08)")
                  }
                  onClick={() => toggleExpand(notice.id)}
                >
                  {/* 헤더 */}
                  <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {notice.badge === "upcoming" && (
                        <span className="flex-shrink-0 px-2.5 py-0.5 bg-red-500/20 border border-red-500/30 rounded-full text-red-300 text-xs font-semibold">
                          {t("noticePage.badgeUpcoming")}
                        </span>
                      )}
                      {notice.badge === "completed" && (
                        <span className="flex-shrink-0 px-2.5 py-0.5 bg-green-500/20 border border-green-500/30 rounded-full text-green-300 text-xs font-semibold">
                          {t("noticePage.badgeCompleted")}
                        </span>
                      )}
                      <h3 className="text-lg font-bold text-[#f8fafc] truncate">
                        {t(notice.titleKey)}
                      </h3>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                      <span className="text-sm text-white/40">{notice.date}</span>
                      <svg
                        className={`w-5 h-5 text-white/50 transition-transform duration-300 ${
                          expandedId === notice.id ? "rotate-180" : ""
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* 내용 (펼침) */}
                  {expandedId === notice.id && (
                    <div className="px-6 pb-6 border-t border-white/5">
                      <div
                        className="pt-4 text-white/70 leading-relaxed whitespace-pre-line"
                        dangerouslySetInnerHTML={{ __html: t(notice.contentKey) }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </PageLayout>
    </>
  );
}
