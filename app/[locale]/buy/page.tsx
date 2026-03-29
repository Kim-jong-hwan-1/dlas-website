"use client";

import PageLayout from "@/components/PageLayout";
import MouseLight from "@/components/MouseLight";
import { useLang } from "@/components/LanguageWrapper";

export default function BuyPage() {
  const { t } = useLang();

  return (
    <PageLayout showUI showBackground>
      <MouseLight />
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div
          className="bg-black/10 backdrop-blur-xl rounded-2xl border border-white/10 p-12 text-center max-w-lg
                     hover:bg-black/15 hover:border-[#fde68a]/30 transition-all duration-500"
          style={{ boxShadow: "0 0 30px rgba(255, 255, 255, 0.08)" }}
          onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 0 40px rgba(253, 230, 138, 0.25), 0 0 80px rgba(253, 230, 138, 0.15)"}
          onMouseLeave={(e) => e.currentTarget.style.boxShadow = "0 0 30px rgba(255, 255, 255, 0.08)"}
        >
          <h1
            className="text-2xl md:text-3xl font-bold text-white mb-4"
            style={{ textShadow: "0 0 30px rgba(253, 230, 138, 0.5)" }}
          >
            {t("buyPage.title") || "Purchase"}
          </h1>
          <p className="text-white/50 text-lg mb-6">
            Online purchase is currently unavailable.
          </p>
          <p className="text-white/30 text-sm">
            Please contact us for licensing inquiries.
          </p>
          <a
            href="/kr/contact"
            className="inline-block mt-6 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-[#fde68a]/40 rounded-lg text-white font-medium transition-all duration-300"
            style={{ textShadow: "0 0 10px rgba(255,255,255,0.5)" }}
          >
            Contact Us
          </a>
        </div>
      </div>
    </PageLayout>
  );
}
