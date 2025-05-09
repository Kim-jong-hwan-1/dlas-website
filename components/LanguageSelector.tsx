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
    <div className="relative w-fit sm:absolute sm:top-5 sm:right-[220px]">
      <button
        onClick={() => setOpen(!open)}
        className="px-3 py-2 border border-gray-300 rounded bg-white text-sm"
      >
        {languages.find((l) => l.code === lang)?.label}
      </button>

      {open && (
        <div className="absolute top-12 left-0 bg-white border border-gray-300 rounded shadow">
          {languages.map((l) => (
            <div
              key={l.code}
              onClick={() => handleSelect(l.code)}
              className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${
                l.code === lang ? 'bg-gray-100' : ''
              }`}
            >
              {l.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
