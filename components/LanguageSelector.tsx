// components/LanguageSelector.tsx
'use client';

import { useState } from 'react';
import { useLang } from './LanguageWrapper';

export default function LanguageSelector() {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'ko', label: '한국어' },
  ];

  const handleSelect = (code: string) => {
    setLang(code as 'en' | 'ko');
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedLanguage', code);
    }
    setOpen(false);
  };

  return (
    <>
      {/* 미디어 쿼리를 위한 스타일 삽입 */}
      <style>
        {`
          @media (max-width: 768px) {
            .language-dropdown {
              top: 60px !important;   /* 모바일에서 높이 */
              left: 0 !important;    /* 모바일에서 화면 맨 왼쪽 붙이기 */
            }
          }
        `}
      </style>

      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen(!open)}
          style={{
            padding: '8px 12px',
            border: '1px solid #ccc',
            borderRadius: 4,
            background: '#fff',
            cursor: 'pointer',
          }}
        >
          {languages.find((l) => l.code === lang)?.label}
        </button>

        {open && (
          <div
            className="language-dropdown"
            style={{
              position: 'absolute',
              // 데스크탑에서 현 상태에서 1.5픽셀 아래 (기존 40px → 41.5px)
              top: '41.5px',
              left: 0,
              background: '#fff',
              border: '1px solid #ddd',
              borderRadius: 4,
            }}
          >
            {languages.map((l) => (
              <div
                key={l.code}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  background: l.code === lang ? '#f5f5f5' : '#fff',
                }}
                onClick={() => handleSelect(l.code)}
              >
                {l.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
