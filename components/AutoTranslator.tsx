
'use client';

import { useEffect } from 'react';

export default function AutoTranslator({ targetLang }: { targetLang: string }) {
  useEffect(() => {
    const translateText = async (text: string) => {
      try {
        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ text, targetLang })
        });
        const data = await response.json();
        return data.translation || text;
      } catch (err) {
        console.error('Translation failed:', err);
        return text;
      }
    };

    const walkAndTranslate = async () => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const promises: Promise<void>[] = [];

      while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        const original = node.textContent?.trim();
        if (original && original.length > 1 && /[a-zA-Z]/.test(original)) {
          promises.push(
            translateText(original).then(translated => {
              node.textContent = translated;
            })
          );
        }
      }

      await Promise.all(promises);
    };

    walkAndTranslate();
  }, [targetLang]);

  return null;
}
