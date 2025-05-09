// components/ClientLayout.tsx
'use client';

import React from 'react';
import LanguageWrapper from './LanguageWrapper';
import LanguageSelector from './LanguageSelector';
// import ClientHeader from './ClientHeader';  // 헤더 필요하면 사용

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LanguageWrapper>
      {/* (선택) ClientHeader */}
      {/*
      <ClientHeader />
      */}

      {/* 우측 상단 언어 선택 드롭다운 */}
      <div className="fixed top-4 right-4 sm:right-[220px] z-50">
  <LanguageSelector />
</div>


      {/* 실제 페이지 내용 */}
      {children}
    </LanguageWrapper>
  );
}
