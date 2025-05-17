'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '@/translations/translations';

// ✅ 모든 언어 자동 추론 (translations 객체 기반)
export type LangCode = keyof typeof translations;

interface LangContextType {
  lang: LangCode;
  setLang: (lang: LangCode) => void;
  t: (key: string) => string;
}

const LangContext = createContext<LangContextType>({
  lang: 'en',
  setLang: () => {},
  t: (key: string) => key,
});

export const useLang = () => useContext(LangContext);

export default function LanguageWrapper({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<LangCode>('en');

  useEffect(() => {
    const saved = localStorage.getItem('selectedLanguage');

    // ✅ 저장된 언어가 translations에 존재하면 적용
    if (saved && saved in translations) {
      setLang(saved as LangCode);
    }
  }, []);

  // ✅ 번역 함수 (매칭 안 되면 fallback으로 key 반환)
  const t = (key: string): string => {
    const parts = key.split('.');
    let result: any = translations[lang] || translations['en'];

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
