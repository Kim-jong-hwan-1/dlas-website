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
      {/* 실제 페이지 내용 */}
      {children}
    </LanguageWrapper>
  );
}
