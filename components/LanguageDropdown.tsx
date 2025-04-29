
'use client';

import { useState } from 'react';

export default function LanguageDropdown({ onSelect }: { onSelect: (lang: string) => void }) {
  const [showLang, setShowLang] = useState(false);

  const handleClick = (lang: string) => {
    onSelect(lang);
    setShowLang(false);
  };

  const languages = [
    { code: 'English', label: '🇺🇸 English' },
    { code: 'Chinese', label: '🇨🇳 中文' },
    { code: 'Korean', label: '🇰🇷 한국어' },
    { code: 'Spanish', label: '🇪🇸 Español' },
    { code: 'French', label: '🇫🇷 Français' },
    { code: 'Arabic', label: '🇸🇦 العربية' },
    { code: 'Russian', label: '🇷🇺 Русский' },
    { code: 'Portuguese', label: '🇧🇷 Português' },
    { code: 'Japanese', label: '🇯🇵 日本語' }
  ];

  return (
    <li className="relative z-50">
      <button onClick={() => setShowLang(!showLang)} className="hover:text-gray-400 text-sm">🌐 Language</button>
      {showLang && (
        <ul className="absolute right-0 top-full mt-1 bg-white text-black border rounded shadow-md z-50 w-44 text-sm">
          {languages.map(lang => (
            <li key={lang.code}>
              <button
                className="block px-4 py-2 w-full text-left hover:bg-gray-100"
                onClick={() => handleClick(lang.code)}
              >
                {lang.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
