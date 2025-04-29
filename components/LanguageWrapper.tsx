// components/LanguageWrapper.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '@/translations/translations';

export type LangCode = 'en' | 'ko';

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
    if (saved === 'ko' || saved === 'en') {
      setLang(saved);
    }
  }, []);

  // 번역 함수
  const t = (key: string): string => {
    // 예: "terms.article1.title" --> ["terms","article1","title"]
    const parts = key.split('.');
    let result: any = translations[lang];
    for (const part of parts) {
      if (result && typeof result === 'object') {
        result = result[part];
      } else {
        return key; // 매칭 못 찾으면 key 그대로
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
