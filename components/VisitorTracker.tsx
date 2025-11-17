'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * 방문자 추적 컴포넌트
 * 페이지 방문 시 자동으로 추적 서버에 데이터 전송
 */
export default function VisitorTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 추적 서버 URL (환경 변수 또는 기본값)
  const TRACKING_SERVER = process.env.NEXT_PUBLIC_TRACKING_SERVER || 'http://localhost:3000';

  useEffect(() => {
    // 세션 ID 생성 또는 가져오기
    function getSessionId() {
      let sessionId = localStorage.getItem('visitor_session_id');
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('visitor_session_id', sessionId);
      }
      return sessionId;
    }

    // 방문 추적
    async function trackVisit() {
      try {
        const sessionId = getSessionId();
        const queryString = searchParams?.toString() || '';

        const response = await fetch(`${TRACKING_SERVER}/api/track`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            page_path: pathname,
            query_string: queryString,
            session_id: sessionId,
          }),
        });

        const data = await response.json();

        if (process.env.NODE_ENV === 'development') {
          console.log('✅ 방문자 추적:', data);
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ 방문자 추적 실패:', error);
        }
      }
    }

    // 페이지 로드 시 추적
    trackVisit();

  }, [pathname, searchParams]); // pathname이나 searchParams가 변경될 때마다 추적

  // UI를 렌더링하지 않음 (백그라운드에서만 작동)
  return null;
}
