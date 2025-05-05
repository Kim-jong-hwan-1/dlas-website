"use client";

import { useState } from "react";

export default function Register() {
  const [email, setEmail] = useState("");  // 실제로는 ID지만 email 이름 유지
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleRegister = async () => {
    console.log("회원가입 버튼 클릭됨"); // 로그 확인
    try {
      const response = await fetch("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      console.log("회원가입 응답:", data); // 응답 확인

      if (response.ok) {
        setMessage(data.message || "회원가입 성공! 로그인하세요.");
      } else {
        setMessage(`오류: ${data.detail || "회원가입 실패"}`);
      }
    } catch (error) {
      console.error("회원가입 오류:", error);
      setMessage("서버와 연결할 수 없습니다.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white text-black">
      <h1 className="text-3xl font-bold mb-6">회원가입</h1>
      <input
        type="text"  // ✅ 이메일 형식이 아닌 일반 텍스트
        placeholder="ID"  // ✅ 사용자에게는 ID로 보임
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
        onClick={handleRegister}
        className="bg-blue-600 text-black px-6 py-3 rounded-lg hover:bg-blue-700"
      >
        회원가입
      </button>
      {message && <p className="mt-4">{message}</p>}
    </div>
  );
}
