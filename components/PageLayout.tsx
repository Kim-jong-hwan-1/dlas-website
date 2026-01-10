"use client";

import Image from "next/image";
import Navigation from "./Navigation";
import AuthButtons from "./AuthButtons";
import Footer from "./Footer";

interface PageLayoutProps {
  children: React.ReactNode;
  showUI?: boolean;
  showBackground?: boolean;
  backgroundImage?: string;
}

export default function PageLayout({ children, showUI = true, showBackground = true, backgroundImage = "1" }: PageLayoutProps) {
  return (
    <>
      {/* 배경 이미지 (홈과 동일) */}
      {showBackground && (
        <div className="fixed inset-0 z-[1]">
          <Image
            src={`/background/${backgroundImage}.png`}
            alt="Background"
            fill
            className="object-cover blur-[3px]"
            priority
          />
          <div className="absolute inset-0 bg-black opacity-40" />
        </div>
      )}

      <Navigation showUI={showUI} />
      <AuthButtons showUI={showUI} />

      <main className="pt-[180px] relative z-10">
        {children}
      </main>

      <Footer showUI={showUI} />
    </>
  );
}
