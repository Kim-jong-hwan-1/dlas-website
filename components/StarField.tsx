"use client";

import { useMemo } from "react";

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

interface StarFieldProps {
  starCount?: number;
  className?: string;
}

export default function StarField({ starCount = 200, className = "" }: StarFieldProps) {
  const stars = useMemo<Star[]>(() => {
    return Array.from({ length: starCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 5,
    }));
  }, [starCount]);

  return (
    <div
      className={`fixed inset-0 overflow-hidden pointer-events-none ${className}`}
      style={{ zIndex: 2 }}
      aria-hidden="true"
    >
      {/* Deep space gradient background - very transparent to show background image */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, rgba(30, 30, 35, 0.2) 0%, rgba(15, 15, 20, 0.3) 100%)",
        }}
      />

      {/* Stars layer */}
      <div className="absolute inset-0">
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full bg-white animate-twinkle"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              "--twinkle-duration": `${star.duration}s`,
              "--twinkle-delay": `${star.delay}s`,
              boxShadow: star.size > 1.5
                ? `0 0 ${star.size * 2}px rgba(255, 255, 255, 0.8)`
                : "none",
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Subtle glow layers - gray tones */}
      <div
        className="absolute animate-nebula-pulse"
        style={{
          top: "10%",
          left: "20%",
          width: "40%",
          height: "40%",
          background: "radial-gradient(circle, rgba(120, 120, 130, 0.12) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      <div
        className="absolute animate-nebula-pulse"
        style={{
          bottom: "20%",
          right: "10%",
          width: "35%",
          height: "35%",
          background: "radial-gradient(circle, rgba(100, 100, 110, 0.1) 0%, transparent 70%)",
          filter: "blur(60px)",
          animationDelay: "4s",
        }}
      />
      <div
        className="absolute animate-nebula-pulse"
        style={{
          top: "50%",
          left: "60%",
          width: "30%",
          height: "30%",
          background: "radial-gradient(circle, rgba(90, 90, 100, 0.08) 0%, transparent 70%)",
          filter: "blur(60px)",
          animationDelay: "2s",
        }}
      />
    </div>
  );
}
