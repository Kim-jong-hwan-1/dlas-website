"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export default function MouseLight() {
  // 마우스 위치 추적
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const [smoothPos, setSmoothPos] = useState({ x: -1000, y: -1000 });
  const [mouseTrail, setMouseTrail] = useState<Array<{ x: number; y: number; id: number; time: number }>>([]);
  const trailIdRef = useRef(0);

  // 마우스 움직임 핸들러
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const x = e.clientX;
    const y = e.clientY;
    setMousePos({ x, y });

    // 마우스 궤적 추가 (시간 포함)
    trailIdRef.current += 1;
    const newTrail = { x, y, id: trailIdRef.current, time: Date.now() };
    setMouseTrail(prev => [...prev.slice(-30), newTrail]);
  }, []);

  // 부드러운 위치 업데이트 (천천히 따라오기)
  useEffect(() => {
    const interval = setInterval(() => {
      setSmoothPos(prev => ({
        x: prev.x + (mousePos.x - prev.x) * 0.03,
        y: prev.y + (mousePos.y - prev.y) * 0.03,
      }));
    }, 16);
    return () => clearInterval(interval);
  }, [mousePos]);

  // 마우스 이벤트 리스너
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  // 오래된 궤적 천천히 제거
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setMouseTrail(prev => prev.filter(t => now - t.time < 3000));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[5] pointer-events-none overflow-hidden">
      {/* 가장 넓은 외곽 빛 - 아주 천천히 따라옴 */}
      <div
        className="absolute rounded-full"
        style={{
          left: smoothPos.x - 600,
          top: smoothPos.y - 600,
          width: 1200,
          height: 1200,
          background: `radial-gradient(circle,
            rgba(253, 230, 138, 0.02) 0%,
            rgba(253, 230, 138, 0.018) 10%,
            rgba(253, 230, 138, 0.015) 20%,
            rgba(253, 230, 138, 0.012) 30%,
            rgba(253, 230, 138, 0.008) 40%,
            rgba(253, 230, 138, 0.004) 50%,
            rgba(253, 230, 138, 0.002) 60%,
            transparent 70%)`,
          filter: 'blur(20px)',
        }}
      />

      {/* 중간 빛 레이어 */}
      <div
        className="absolute rounded-full"
        style={{
          left: smoothPos.x - 400,
          top: smoothPos.y - 400,
          width: 800,
          height: 800,
          background: `radial-gradient(circle,
            rgba(253, 230, 138, 0.03) 0%,
            rgba(253, 230, 138, 0.025) 10%,
            rgba(253, 230, 138, 0.02) 20%,
            rgba(253, 230, 138, 0.015) 30%,
            rgba(253, 230, 138, 0.01) 40%,
            rgba(253, 230, 138, 0.005) 50%,
            rgba(253, 230, 138, 0.002) 60%,
            transparent 70%)`,
          filter: 'blur(15px)',
        }}
      />

      {/* 빛의 궤적 - 자취 효과 */}
      {mouseTrail.map((trail) => {
        const age = (Date.now() - trail.time) / 3000;
        const opacity = Math.max(0, 1 - age) * 0.02;
        return (
          <div
            key={trail.id}
            className="absolute rounded-full"
            style={{
              left: trail.x - 300,
              top: trail.y - 300,
              width: 600,
              height: 600,
              background: `radial-gradient(circle,
                rgba(253, 230, 138, ${opacity}) 0%,
                rgba(253, 230, 138, ${opacity * 0.7}) 20%,
                rgba(253, 230, 138, ${opacity * 0.4}) 40%,
                rgba(253, 230, 138, ${opacity * 0.15}) 60%,
                transparent 80%)`,
              filter: 'blur(10px)',
            }}
          />
        );
      })}

      {/* 내부 빛 레이어 - 조금 더 빠르게 */}
      <div
        className="absolute rounded-full"
        style={{
          left: mousePos.x - 250,
          top: mousePos.y - 250,
          width: 500,
          height: 500,
          background: `radial-gradient(circle,
            rgba(253, 230, 138, 0.04) 0%,
            rgba(253, 230, 138, 0.03) 15%,
            rgba(253, 230, 138, 0.02) 30%,
            rgba(253, 230, 138, 0.01) 45%,
            rgba(253, 230, 138, 0.005) 60%,
            transparent 75%)`,
          filter: 'blur(12px)',
          transition: 'left 0.5s ease-out, top 0.5s ease-out',
        }}
      />
    </div>
  );
}
