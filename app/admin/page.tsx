"use client";

import { useState, useCallback } from "react";

const API_BASE = "https://license-server-697p.onrender.com";

// 모듈 ID → 이름 매핑
const MODULE_MAP: Record<string, string> = {
  "1": "3 Transfer Jig Maker",
  "2": "STL Classifier",
  "3": "Exo Abutment Editor",
  "4": "E-Transfer Jig Maker",
  "5": "STL to HTML",
  "6": "STL to Image",
};

// 날짜 계산 유틸
function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// 로그 항목 타입
interface LogEntry {
  time: string;
  action: string;
  target: string;
  result: string;
  success: boolean;
}

export default function AdminPage() {
  // 로그인 상태
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [token, setToken] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // 작업 상태
  const [targetEmail, setTargetEmail] = useState("");
  const [loading, setLoading] = useState("");
  const [statusInfo, setStatusInfo] = useState<Record<string, unknown> | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // 작업 로그
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = useCallback((action: string, target: string, result: string, success: boolean) => {
    const now = new Date();
    const time = now.toLocaleString("ko-KR", { hour12: false });
    setLogs((prev) => [{ time, action, target, result, success }, ...prev]);
  }, []);

  // 로그인
  const handleLogin = async () => {
    if (!adminEmail || !adminPassword) return;
    setLoginLoading(true);
    setLoginError("");
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "로그인 실패");
      setToken(data.access_token);
      setIsLoggedIn(true);
      addLog("로그인", adminEmail, "관리자 로그인 성공", true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "로그인 실패";
      setLoginError(msg);
      addLog("로그인", adminEmail, msg, false);
    } finally {
      setLoginLoading(false);
    }
  };

  // 상태 확인
  const handleCheckStatus = async () => {
    if (!targetEmail.trim()) return setMessage({ text: "대상 이메일을 입력하세요", type: "error" });
    setLoading("status");
    setMessage(null);
    setStatusInfo(null);
    try {
      const res = await fetch(`${API_BASE}/admin/userinfo?email=${encodeURIComponent(targetEmail.trim())}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "조회 실패");
      setStatusInfo(data);
      addLog("상태확인", targetEmail, "조회 성공", true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "조회 실패";
      setMessage({ text: msg, type: "error" });
      addLog("상태확인", targetEmail, msg, false);
    } finally {
      setLoading("");
    }
  };

  // 라이센스 부여 (모듈 1번 - 3 Transfer Jig Maker 전용)
  const grantLicense = async (label: string, expiryDate: string) => {
    if (!targetEmail.trim()) return setMessage({ text: "대상 이메일을 입력하세요", type: "error" });
    setLoading(label);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/admin/update_user`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: targetEmail.trim(),
          field: "module_licenses.1",
          value: expiryDate,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "업데이트 실패");
      }
      const successMsg = `${label} 부여 완료 (만료: ${expiryDate === "9999-12-31" ? "평생" : expiryDate})`;
      setMessage({ text: successMsg, type: "success" });
      addLog(label, targetEmail, successMsg, true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "부여 실패";
      setMessage({ text: msg, type: "error" });
      addLog(label, targetEmail, msg, false);
    } finally {
      setLoading("");
    }
  };

  // 로그인 화면
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#0f0f13] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-[#1a1a24] rounded-2xl border border-white/10 p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white tracking-wider">DLAS ADMIN</h1>
            <p className="text-white/40 text-sm mt-2">라이센스 관리 시스템</p>
          </div>
          <div className="space-y-4">
            <input
              type="email"
              placeholder="관리자 이메일"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="w-full px-4 py-3 bg-[#12121a] border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 transition"
            />
            <input
              type="password"
              placeholder="비밀번호"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="w-full px-4 py-3 bg-[#12121a] border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 transition"
            />
            {loginError && <p className="text-red-400 text-sm">{loginError}</p>}
            <button
              onClick={handleLogin}
              disabled={loginLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg font-medium transition"
            >
              {loginLoading ? "로그인 중..." : "로그인"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 메인 관리 화면
  return (
    <div className="min-h-screen bg-[#0f0f13] text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-wider">DLAS ADMIN</h1>
            <p className="text-white/40 text-sm">{adminEmail}</p>
          </div>
          <button
            onClick={() => {
              setIsLoggedIn(false);
              setToken("");
              setAdminEmail("");
              setAdminPassword("");
              setStatusInfo(null);
              setMessage(null);
            }}
            className="px-4 py-2 text-sm bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition"
          >
            로그아웃
          </button>
        </div>

        {/* 대상 이메일 입력 */}
        <div className="bg-[#1a1a24] rounded-2xl border border-white/10 p-6">
          <label className="block text-white/60 text-sm mb-2">대상 사용자 이메일 (타겟 아이디)</label>
          <div className="flex gap-3">
            <input
              type="email"
              placeholder="user@example.com"
              value={targetEmail}
              onChange={(e) => setTargetEmail(e.target.value)}
              className="flex-1 px-4 py-3 bg-[#12121a] border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 transition"
            />
            <button
              onClick={handleCheckStatus}
              disabled={!!loading}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 rounded-lg font-medium transition whitespace-nowrap"
            >
              {loading === "status" ? "조회 중..." : "상태 확인"}
            </button>
          </div>
        </div>

        {/* 상태 정보 표시 */}
        {statusInfo && (
          <div className="bg-[#1a1a24] rounded-2xl border border-white/10 p-6">
            <h2 className="text-lg font-semibold mb-4">사용자 정보</h2>
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div className="text-white/50">이메일</div>
              <div>{String((statusInfo as Record<string, unknown>).email || "-")}</div>
              <div className="text-white/50">이름</div>
              <div>{String((statusInfo as Record<string, unknown>).name || "-")}</div>
              <div className="text-white/50">회사</div>
              <div>{String((statusInfo as Record<string, unknown>).workplace_name || "-")}</div>
              <div className="text-white/50">국가</div>
              <div>{String((statusInfo as Record<string, unknown>).country || "-")}</div>
              <div className="text-white/50">인증 여부</div>
              <div>{(statusInfo as Record<string, unknown>).is_verified ? "O" : "X"}</div>
            </div>
            {/* 모듈 라이센스 */}
            <h3 className="text-sm font-semibold text-white/70 mb-2">모듈 라이센스</h3>
            <div className="space-y-1 text-sm">
              {(() => {
                const ml = (statusInfo as Record<string, unknown>).module_licenses as Record<string, string> | undefined;
                if (!ml || Object.keys(ml).length === 0) return <p className="text-white/30">라이센스 없음</p>;
                return Object.entries(ml).map(([id, date]) => {
                  const now = new Date().toISOString().split("T")[0];
                  const isActive = date === "9999-12-31" || date >= now;
                  return (
                    <div key={id} className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isActive ? "bg-green-400" : "bg-red-400"}`} />
                      <span className="text-white/60">{MODULE_MAP[id] || `모듈 ${id}`}</span>
                      <span className={isActive ? "text-green-400" : "text-red-400"}>
                        {date === "9999-12-31" ? "무제한" : date}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* 라이센스 부여 버튼 */}
        <div className="bg-[#1a1a24] rounded-2xl border border-white/10 p-6">
          <h2 className="text-lg font-semibold mb-4">라이센스 부여</h2>
          <p className="text-white/40 text-sm mb-3">대상 모듈: 3 Transfer Jig Maker (모듈 1)</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => grantLicense("3일 무료", addDays(3))}
              disabled={!!loading}
              className="py-4 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-600/50 rounded-xl font-medium transition"
            >
              {loading === "3일 무료" ? "처리 중..." : "3일 무료 열기"}
            </button>
            <button
              onClick={() => grantLicense("1년 라이센스", addDays(365))}
              disabled={!!loading}
              className="py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 rounded-xl font-medium transition"
            >
              {loading === "1년 라이센스" ? "처리 중..." : "1년 라이센스 부여"}
            </button>
            <button
              onClick={() => grantLicense("평생 라이센스", "9999-12-31")}
              disabled={!!loading}
              className="py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 rounded-xl font-medium transition"
            >
              {loading === "평생 라이센스" ? "처리 중..." : "평생 라이센스 부여"}
            </button>
          </div>
        </div>

        {/* 메시지 */}
        {message && (
          <div
            className={`p-4 rounded-xl border text-sm ${
              message.type === "success"
                ? "bg-green-500/10 border-green-500/30 text-green-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* 작업 로그 */}
        {logs.length > 0 && (
          <div className="bg-[#1a1a24] rounded-2xl border border-white/10 p-6">
            <h2 className="text-lg font-semibold mb-4">작업 로그</h2>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {logs.map((log, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 text-sm p-3 rounded-lg ${
                    log.success ? "bg-green-500/5" : "bg-red-500/5"
                  }`}
                >
                  <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${log.success ? "bg-green-400" : "bg-red-400"}`} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white/40 text-xs">{log.time}</span>
                      <span className="font-medium text-white/80">{log.action}</span>
                      <span className="text-white/40">{log.target}</span>
                    </div>
                    <p className="text-white/50 text-xs mt-0.5">{log.result}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
