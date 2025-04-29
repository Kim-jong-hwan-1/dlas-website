import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    console.log("회원가입 요청 데이터:", { email, password }); // ✅ 요청 로그 추가

    const response = await fetch("http://127.0.0.1:8000/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    console.log("회원가입 API 응답:", data); // ✅ 응답 로그 추가

    if (!response.ok) {
      return NextResponse.json({ error: data.detail || "회원가입 실패" }, { status: response.status });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("회원가입 API 오류:", error);
    return NextResponse.json({ error: "서버 오류 발생" }, { status: 500 });
  }
}
