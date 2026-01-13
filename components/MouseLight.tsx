"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface TrailPoint {
  x: number;
  y: number;
  time: number;
}

export default function MouseLight() {
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const lastPosRef = useRef({ x: -1000, y: -1000 });

  // 마우스 움직임 핸들러
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const x = e.clientX;
    const y = e.clientY;
    setMousePos({ x, y });

    // 일정 거리 이상 움직였을 때만 점 추가
    const dx = x - lastPosRef.current.x;
    const dy = y - lastPosRef.current.y;
    if (Math.sqrt(dx * dx + dy * dy) > 3) {
      lastPosRef.current = { x, y };
      setTrail(prev => [...prev, { x, y, time: Date.now() }]);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  // 오래된 점 서서히 제거
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTrail(prev => prev.filter(p => now - p.time < 2500));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[5] pointer-events-none overflow-hidden">
      {/* 은은한 자취 - 많이 블러 처리 */}
      <svg className="absolute inset-0 w-full h-full" style={{ filter: 'blur(20px)' }}>
        {trail.map((point, index) => {
          if (index === 0) return null;
          const prev = trail[index - 1];
          const age = (Date.now() - point.time) / 2500;
          const opacity = Math.max(0, (1 - age) * 0.12);

          return (
            <line
              key={index}
              x1={prev.x}
              y1={prev.y}
              x2={point.x}
              y2={point.y}
              stroke={`rgba(253, 230, 138, ${opacity})`}
              strokeWidth="15"
              strokeLinecap="round"
            />
          );
        })}
      </svg>

      {/* 더 퍼지는 외곽 글로우 */}
      <svg className="absolute inset-0 w-full h-full" style={{ filter: 'blur(35px)' }}>
        {trail.map((point, index) => {
          if (index === 0) return null;
          const prev = trail[index - 1];
          const age = (Date.now() - point.time) / 2500;
          const opacity = Math.max(0, (1 - age) * 0.08);

          return (
            <line
              key={index}
              x1={prev.x}
              y1={prev.y}
              x2={point.x}
              y2={point.y}
              stroke={`rgba(253, 230, 138, ${opacity})`}
              strokeWidth="30"
              strokeLinecap="round"
            />
          );
        })}
      </svg>

      {/* 마우스 포인터 - 작은 빛 */}
      <div
        className="absolute rounded-full"
        style={{
          left: mousePos.x - 4,
          top: mousePos.y - 4,
          width: 8,
          height: 8,
          background: 'rgba(255, 255, 255, 0.85)',
          boxShadow: `
            0 0 6px 3px rgba(255, 255, 255, 0.7),
            0 0 12px 6px rgba(253, 230, 138, 0.5),
            0 0 25px 12px rgba(253, 230, 138, 0.25)
          `,
        }}
      />
    </div>
  );
}
