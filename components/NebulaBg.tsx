"use client";

interface NebulaBgProps {
  className?: string;
  variant?: "hero" | "section" | "subtle";
}

export default function NebulaBg({ className = "", variant = "hero" }: NebulaBgProps) {
  const variants = {
    hero: {
      opacity: 0.2,
      blur: 80,
      scale: 1,
    },
    section: {
      opacity: 0.15,
      blur: 60,
      scale: 0.8,
    },
    subtle: {
      opacity: 0.1,
      blur: 40,
      scale: 0.6,
    },
  };

  const config = variants[variant];

  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      aria-hidden="true"
    >
      {/* Primary Purple Nebula */}
      <div
        className="absolute animate-nebula-pulse"
        style={{
          top: "-10%",
          left: "-10%",
          width: `${60 * config.scale}%`,
          height: `${60 * config.scale}%`,
          background: `radial-gradient(circle, rgba(139, 92, 246, ${config.opacity}) 0%, transparent 70%)`,
          filter: `blur(${config.blur}px)`,
        }}
      />

      {/* Secondary Cyan Nebula */}
      <div
        className="absolute animate-nebula-pulse"
        style={{
          bottom: "-5%",
          right: "-10%",
          width: `${50 * config.scale}%`,
          height: `${50 * config.scale}%`,
          background: `radial-gradient(circle, rgba(6, 182, 212, ${config.opacity * 0.8}) 0%, transparent 70%)`,
          filter: `blur(${config.blur}px)`,
          animationDelay: "4s",
        }}
      />

      {/* Accent Pink Nebula */}
      <div
        className="absolute animate-nebula-pulse"
        style={{
          top: "40%",
          right: "20%",
          width: `${35 * config.scale}%`,
          height: `${35 * config.scale}%`,
          background: `radial-gradient(circle, rgba(236, 72, 153, ${config.opacity * 0.6}) 0%, transparent 70%)`,
          filter: `blur(${config.blur}px)`,
          animationDelay: "2s",
        }}
      />

      {/* Deep Blue Nebula */}
      <div
        className="absolute animate-nebula-pulse"
        style={{
          top: "60%",
          left: "30%",
          width: `${40 * config.scale}%`,
          height: `${40 * config.scale}%`,
          background: `radial-gradient(circle, rgba(59, 130, 246, ${config.opacity * 0.5}) 0%, transparent 70%)`,
          filter: `blur(${config.blur}px)`,
          animationDelay: "6s",
        }}
      />
    </div>
  );
}
