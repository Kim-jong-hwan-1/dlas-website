'use client';

import { useEffect, useState } from 'react';

export default function LanguageSelector() {
  const [lang, setLang] = useState('en');

  useEffect(() => {
    const saved = localStorage.getItem('selectedLanguage');
    if (saved) {
      setLang(saved);
      translatePage(saved);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('selectedLanguage', lang);
    if (lang !== 'en') translatePage(lang);
  }, [lang]);

  async function translateText(text: string, targetLang: string) {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLang }),
    });
    const data = await res.json();
    return data.translated || text;
  }

  async function translatePage(targetLang: string) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      if (node.nodeValue.trim()) {
        textNodes.push(node);
      }
    }
    for (const node of textNodes) {
      const translated = await translateText(node.nodeValue, targetLang);
      node.nodeValue = translated;
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: '21px',       // 미세하게 위로 조정하여 로그인 버튼과 수직 정렬
      right: '200px',    // 로그인 왼쪽에 정렬
      zIndex: 9999,
      background: 'white',
      padding: '4px 8px',
      borderRadius: '6px',
      // boxShadow 제거됨
    }}>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        style={{
          fontSize: '14px',
          padding: '6px',
          borderRadius: '4px',
          border: '1px solid #ccc',
        }}
      >
        <option value="en">English</option>
        <option value="ko">Korean</option>
        <option value="ja">Japanese</option>
        <option value="zh">Chinese</option>
        <option value="es">Spanish</option>
        <option value="fr">French</option>
        <option value="de">German</option>
        <option value="it">Italian</option>
        <option value="pt">Portuguese</option>
        <option value="ru">Russian</option>
      </select>
    </div>
  );
}
