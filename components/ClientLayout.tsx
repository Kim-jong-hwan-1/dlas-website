// components/ClientLayout.tsx
'use client';

import React, { Suspense } from 'react';
import LanguageWrapper from './LanguageWrapper';
import LanguageSelector from './LanguageSelector';
import DualModalContainer from './DualModalContainer';
import VisitorTracker from './VisitorTracker';
import StarField from './StarField';
import AuthModals from './AuthModals';
import type { Locale } from '@/i18n/config';
// import ShootingStar from './ShootingStar'; // 비활성화
// import ClientHeader from './ClientHeader';  // 헤더 필요하면 사용

export default function ClientLayout({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale?: Locale;
}) {
  return (
    <LanguageWrapper locale={locale}>
      {/* Space Theme: Starfield Background */}
      <StarField starCount={250} />
      {/* Space Theme: Shooting Stars - 비활성화 */}
      {/* <ShootingStar interval={5000} /> */}
      {/* 방문자 추적 (백그라운드 실행) */}
      <Suspense fallback={null}>
        <VisitorTracker />
      </Suspense>
      {/* 세미나 & 웨비나 모달 */}
      <DualModalContainer />
      {/* 로그인 & 회원가입 모달 */}
      <AuthModals />
      {/* 실제 페이지 내용 */}
      <div className="relative z-10">
        {children}
      </div>
    </LanguageWrapper>
  );
}
