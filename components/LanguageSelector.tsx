// components/LanguageSelector.tsx
'use client';

import { useState } from 'react';
import { useLang } from './LanguageWrapper';

export default function LanguageSelector() {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);

  // 15개 언어 목록 - 각 언어명이 그 언어로 표시되도록 label 지정
  const languages = [
    { code: 'en', label: 'English' },           // 영어
    { code: 'zh', label: '中文' },               // 중국어
    { code: 'ja', label: '日本語' },             // 일본어
    { code: 'de', label: 'Deutsch' },           // 독일어
    { code: 'fr', label: 'Français' },          // 프랑스어
    { code: 'hi', label: 'हिन्दी' },            // 힌디어
    { code: 'pt', label: 'Português' },         // 포르투갈어
    { code: 'ko', label: '한국어' },            // 한국어
    { code: 'ru', label: 'Русский' },           // 러시아어
    { code: 'es', label: 'Español' },           // 스페인어
    { code: 'ar', label: 'العربية' },           // 아랍어
    { code: 'tr', label: 'Türkçe' },            // 터키어
    { code: 'vi', label: 'Tiếng Việt' },        // 베트남어
    { code: 'th', label: 'ไทย' },               // 태국어
    { code: 'id', label: 'Bahasa Indonesia' },  // 인도네시아어
  ];

  const handleSelect = (code: string) => {
    // 15개 언어 코드 중 하나 선택 시, useLang 훅으로 상태 업데이트
    setLang(code as typeof lang);
    if (typeof window !== 'undefined') {
      // 로컬 스토리지에 언어코드 저장 (새로고침 후에도 유지)
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
              top: 60px !important;   /* 모바일에서 버튼과의 간격 */
              left: 0 !important;    /* 모바일에서 화면 왼쪽에 붙여서 표시 */
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
          {/* 현재 선택된 언어의 레이블 표시 */}
          {languages.find((l) => l.code === lang)?.label}
        </button>

        {open && (
          <div
            className="language-dropdown"
            style={{
              position: 'absolute',
              top: '25px', // 기존 40px → 25px (+1.5px 주석은 필요에 맞게 조정)
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
