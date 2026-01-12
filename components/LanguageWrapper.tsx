// components/LanguageWrapper.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { translations } from '@/translations/translations';
import { locales, type Locale } from '@/i18n/config';

export type LangCode = Locale;

interface LangContextType {
  lang: LangCode;
  setLang: (lang: LangCode) => void;
  t: (key: string) => string;
}

const LangContext = createContext<LangContextType>({
  lang: 'ko',
  setLang: () => {},
  t: (key: string) => key,
});

export const useLang = () => useContext(LangContext);

interface LanguageWrapperProps {
  children: React.ReactNode;
  locale?: Locale;
}

export default function LanguageWrapper({ children, locale }: LanguageWrapperProps) {
  const pathname = usePathname();
  const router = useRouter();

  // URL에서 현재 locale 추출
  const getLocaleFromPath = (): Locale => {
    if (!pathname) return 'ko';
    const segments = pathname.split('/');
    const pathLocale = segments[1];
    if (locales.includes(pathLocale as Locale)) {
      return pathLocale as Locale;
    }
    return 'ko'; // 기본값
  };

  // locale prop 우선, 없으면 URL에서 추출
  const currentLocale = locale || getLocaleFromPath();
  const [lang, setLangState] = useState<LangCode>(currentLocale);

  // locale prop이나 pathname 변경 시 lang 업데이트
  useEffect(() => {
    setLangState(currentLocale);
  }, [currentLocale]);

  // 언어 변경 함수 - URL도 함께 변경
  const setLang = (newLang: LangCode) => {
    if (newLang === lang) return;

    // 현재 pathname에서 locale 부분 교체
    const currentPath = pathname || '/';
    const segments = currentPath.split('/');
    if (locales.includes(segments[1] as Locale)) {
      segments[1] = newLang;
    } else {
      segments.splice(1, 0, newLang);
    }
    const newPath = segments.join('/') || `/${newLang}`;

    // 쿠키도 업데이트
    document.cookie = `DLAS_LANG=${newLang}; path=/; max-age=${60 * 60 * 24 * 365}`;

    // 새 URL로 이동
    router.push(newPath);
  };

  // 번역 함수
  const t = (key: string): string => {
    const parts = key.split('.');
    let result: any = translations[lang];
    for (const part of parts) {
      if (result && typeof result === 'object') {
        result = result[part];
      } else {
        return key;
      }
    }
    return typeof result === 'string' ? result : key;
  };

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}
