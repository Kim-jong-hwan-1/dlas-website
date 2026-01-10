"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/components/LanguageWrapper";

interface AuthButtonsProps {
  showUI?: boolean;
}

export default function AuthButtons({ showUI = true }: AuthButtonsProps) {
  const { t } = useLang();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // 로그인 상태 확인 (토큰 + 만료시간 체크)
    const token = localStorage.getItem("DLAS_TOKEN");
    const expireTime = localStorage.getItem("loginExpireTime");

    if (token && expireTime) {
      if (Date.now() < parseInt(expireTime, 10)) {
        setIsLoggedIn(true);
      } else {
        // 만료되었으면 정리
        localStorage.removeItem("DLAS_TOKEN");
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("loginExpireTime");
        localStorage.removeItem("userID");
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("DLAS_TOKEN");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("loginExpireTime");
    localStorage.removeItem("userID");
    setIsLoggedIn(false);
    window.location.reload();
  };

  const openModal = (id: string) => {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove("hidden");
  };

  return (
    <div
      className="fixed top-6 left-6 sm:top-6 sm:right-6 sm:left-auto flex gap-0 z-50 transition-all duration-500 ease-out"
      style={{
        opacity: showUI ? 1 : 0,
        transform: showUI ? 'translateY(0)' : 'translateY(-50px)',
      }}
    >
      {!isLoggedIn ? (
        <>
          <button
            onClick={() => openModal("login-modal")}
            className="text-sm font-medium text-white/70 px-2 py-1 rounded
                       hover:text-white transition-all duration-300 backdrop-blur-sm"
            style={{
              textShadow: "0 0 8px rgba(255,255,255,0.3)"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.textShadow = "0 0 10px rgba(255,255,255,0.8), 0 0 20px rgba(255,255,255,0.5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.textShadow = "0 0 8px rgba(255,255,255,0.3)";
            }}
          >
            {t("nav.login")}
          </button>
          <button
            onClick={() => openModal("signup-modal")}
            className="text-sm font-medium text-white/70 px-2 py-1 rounded
                       hover:text-white transition-all duration-300 backdrop-blur-sm"
            style={{
              textShadow: "0 0 8px rgba(255,255,255,0.3)"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.textShadow = "0 0 10px rgba(255,255,255,0.8), 0 0 20px rgba(255,255,255,0.5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.textShadow = "0 0 8px rgba(255,255,255,0.3)";
            }}
          >
            {t("nav.signup")}
          </button>
        </>
      ) : (
        <button
          onClick={handleLogout}
          className="text-sm font-medium text-white/70 px-2 py-1 rounded
                     hover:text-white transition-all duration-300 backdrop-blur-sm"
          style={{
            textShadow: "0 0 8px rgba(255,255,255,0.3)"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.textShadow = "0 0 10px rgba(255,255,255,0.8), 0 0 20px rgba(255,255,255,0.5)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.textShadow = "0 0 8px rgba(255,255,255,0.3)";
          }}
        >
          로그아웃
        </button>
      )}
    </div>
  );
}
