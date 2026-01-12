// components/LanguageSelector.tsx
'use client';

import { useState } from 'react';
import { useLang } from './LanguageWrapper';
import { locales, type Locale } from '@/i18n/config';

export default function LanguageSelector() {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);

  // 지원하는 4개 언어
  const languages: { code: Locale; label: string }[] = [
    { code: 'kr', label: '한국어' },
    { code: 'en', label: 'English' },
    { code: 'jp', label: '日本語' },
    { code: 'es', label: 'Español' },
  ];

  const handleSelect = (code: Locale) => {
    setLang(code);
    setOpen(false);
  };

  return (
    <>
      <style>
        {`
          @media (max-width: 768px) {
            .language-dropdown {
              top: 60px !important;
              left: 0 !important;
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
          {languages.find((l) => l.code === lang)?.label || lang}
        </button>

        {open && (
          <div
            className="language-dropdown"
            style={{
              position: 'absolute',
              top: '25px',
              left: 0,
              background: '#fff',
              border: '1px solid #ddd',
              borderRadius: 4,
              zIndex: 100,
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
