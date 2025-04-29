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
    localStorage.setItem('selectedLanguage', code);
    setOpen(false);
  };

  return (
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
          style={{
            position: 'absolute',
            top: '40px',
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
  );
}
