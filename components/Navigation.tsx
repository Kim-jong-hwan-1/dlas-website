"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/components/LanguageWrapper";

interface NavigationProps {
  showUI?: boolean;
}

export default function Navigation({ showUI = true }: NavigationProps) {
  const { t } = useLang();
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: t("nav.home"), key: "home" },
    { href: "/download", label: t("nav.download"), key: "download" },
    { href: "/buy", label: t("nav.buy"), key: "buy" },
    { href: "/tips", label: t("nav.tips"), key: "tips" },
    { href: "/terms", label: t("nav.terms"), key: "terms" },
  ];

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="fixed top-0 left-0 w-full py-2 px-8 z-40 border-b border-white/10 bg-black/40 backdrop-blur-sm transition-all duration-500 ease-out"
      style={{
        opacity: showUI ? 1 : 0,
        transform: showUI ? 'translateY(0)' : 'translateY(-100%)',
      }}
    >
      <div className="flex justify-center items-center relative">
        <Link href="/">
          <Image
            src="/logo.png"
            alt="DLAS Logo"
            width={400}
            height={267}
            className="object-contain max-w-[280px] sm:max-w-[400px] mx-auto mt-[60px] sm:mt-3 mb-0 sm:mb-3 brightness-0 invert cursor-pointer"
            priority
          />
        </Link>
        {/* 네비게이션 버튼 그룹 (오른쪽) */}
        <div className="absolute bottom-2 right-4 sm:right-8 hidden sm:flex flex-wrap items-center gap-x-5 gap-y-2">
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`relative pb-2 transition-all duration-300 cursor-pointer
                         ${isActive(item.href)
                           ? "text-white font-bold text-shadow-glow"
                           : "text-white/60 hover:text-white/90"}`}
              style={isActive(item.href) ? {
                textShadow: "0 0 10px rgba(255,255,255,0.8), 0 0 20px rgba(255,255,255,0.5), 0 0 30px rgba(255,255,255,0.3)"
              } : {}}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
