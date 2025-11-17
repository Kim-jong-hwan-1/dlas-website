// components/ClientLayout.tsx
'use client';

import React, { Suspense } from 'react';
import LanguageWrapper from './LanguageWrapper';
import LanguageSelector from './LanguageSelector';
import DualModalContainer from './DualModalContainer';
import VisitorTracker from './VisitorTracker';
// import ClientHeader from './ClientHeader';  // 헤더 필요하면 사용

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LanguageWrapper>
      {/* 방문자 추적 (백그라운드 실행) */}
      <Suspense fallback={null}>
        <VisitorTracker />
      </Suspense>
      {/* 세미나 & 웨비나 모달 */}
      <DualModalContainer />
      {/* 실제 페이지 내용 */}
      {children}
    </LanguageWrapper>
  );
}
