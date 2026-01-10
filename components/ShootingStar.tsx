"use client";

import { useEffect, useState } from "react";

interface ShootingStarProps {
  interval?: number; // ms between shooting stars
  className?: string;
}

interface Star {
  id: number;
  x: number;
  y: number;
  angle: number;
  duration: number;
}

export default function ShootingStar({
  interval = 4000,
  className = "",
}: ShootingStarProps) {
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    const createStar = () => {
      const id = Date.now();
      const newStar: Star = {
        id,
        x: Math.random() * 60 + 20, // start between 20% and 80% from left
        y: Math.random() * 30, // start in top 30%
        angle: Math.random() * 20 + 25, // angle between 25 and 45 degrees
        duration: Math.random() * 0.5 + 1, // 1-1.5 seconds
      };

      setStars((prev) => [...prev, newStar]);

      // Remove star after animation
      setTimeout(() => {
        setStars((prev) => prev.filter((s) => s.id !== id));
      }, newStar.duration * 1000 + 200);
    };

    // Create first star after a short delay
    const initialTimeout = setTimeout(createStar, 1000);

    // Create stars at intervals
    const intervalId = setInterval(createStar, interval);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(intervalId);
    };
  }, [interval]);

  return (
    <div
      className={`fixed inset-0 overflow-hidden pointer-events-none ${className}`}
      style={{ zIndex: 3 }}
      aria-hidden="true"
    >
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            transform: `rotate(${star.angle}deg)`,
          }}
        >
          {/* Shooting star with tail */}
          <div
            className="relative"
            style={{
              animation: `shootingStar ${star.duration}s ease-out forwards`,
            }}
          >
            {/* Star head */}
            <div
              className="absolute w-1 h-1 bg-white rounded-full"
              style={{
                boxShadow: "0 0 6px 2px rgba(255, 255, 255, 0.8)",
              }}
            />
            {/* Star tail */}
            <div
              className="absolute top-0 left-0"
              style={{
                width: "80px",
                height: "1px",
                background:
                  "linear-gradient(90deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 100%)",
                transform: "translateX(-80px)",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
