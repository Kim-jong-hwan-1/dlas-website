"use client";

import { useState } from "react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleLogin = async () => {
    if (!validateEmail(email)) {
      setMessage("올바른 이메일 형식을 입력하세요.");
      return;
    }

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(`오류: ${data.error || "로그인 실패"}`);
      } else {
        setMessage("로그인 성공!");
        localStorage.setItem("access_token", data.access_token);
      }
    } catch (error) {
      setMessage("서버와 연결할 수 없습니다.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white text-black">
      <h1 className="text-3xl font-bold mb-6">로그인</h1>
      <input
        type="email"
        placeholder="이메일"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="p-3 mb-4 w-80 bg-gray-800 text-black rounded-lg"
      />
      <input
        type="password"
        placeholder="비밀번호"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="p-3 mb-4 w-80 bg-gray-800 text-black rounded-lg"
      />
      <button
        onClick={handleLogin}
        className="bg-blue-600 text-black px-6 py-3 rounded-lg hover:bg-blue-700"
      >
        로그인
      </button>
      {message && <p className="mt-4">{message}</p>}
    </div>
  );
}
