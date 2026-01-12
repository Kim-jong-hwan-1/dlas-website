// hooks/useLocalePath.ts
'use client';

import { usePathname } from 'next/navigation';
import { locales, type Locale } from '@/i18n/config';

/**
 * 현재 locale을 포함한 경로 생성 훅
 */
export function useLocalePath() {
  const pathname = usePathname();

  // 현재 locale 추출
  const getCurrentLocale = (): Locale => {
    if (!pathname) return 'kr';
    const segments = pathname.split('/');
    const pathLocale = segments[1];
    if (locales.includes(pathLocale as Locale)) {
      return pathLocale as Locale;
    }
    return 'kr';
  };

  const locale = getCurrentLocale();

  // 경로에 locale prefix 추가
  const localePath = (path: string): string => {
    // 이미 locale이 있으면 그대로 반환
    const segments = path.split('/').filter(Boolean);
    if (segments.length > 0 && locales.includes(segments[0] as Locale)) {
      return path;
    }

    // 절대 경로인 경우
    if (path.startsWith('/')) {
      return `/${locale}${path}`;
    }

    // 상대 경로인 경우
    return `/${locale}/${path}`;
  };

  return { locale, localePath };
}

/**
 * locale을 context 없이 직접 사용할 때
 */
export function getLocalePath(locale: Locale, path: string): string {
  const segments = path.split('/').filter(Boolean);
  if (segments.length > 0 && locales.includes(segments[0] as Locale)) {
    return path;
  }

  if (path.startsWith('/')) {
    return `/${locale}${path}`;
  }

  return `/${locale}/${path}`;
}
