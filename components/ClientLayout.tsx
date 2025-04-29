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
      <div style={{ position: 'fixed', top: 20, right: 220, zIndex: 9999 }}>
        <LanguageSelector />
      </div>

      {/* 실제 페이지 내용 */}
      {children}
    </LanguageWrapper>
  );
}
