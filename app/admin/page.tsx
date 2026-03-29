"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";

const API_BASE = "https://license-server-697p.onrender.com";

// 날짜 계산 유틸
function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// 호버 글로우 핸들러 (DLAS 공통 패턴)
const glowEnter = (e: React.MouseEvent<HTMLElement>) => {
  e.currentTarget.style.boxShadow = "0 0 40px rgba(253, 230, 138, 0.25), 0 0 80px rgba(253, 230, 138, 0.15)";
};
const glowLeave = (e: React.MouseEvent<HTMLElement>) => {
  e.currentTarget.style.boxShadow = "0 0 30px rgba(255, 255, 255, 0.08)";
};

// 로그 항목 타입
interface LogEntry {
  time: string;
  action: string;
  target: string;
  result: string;
  success: boolean;
}

// 서버 활동 로그 타입
interface ServerLog {
  id: number;
  user_email: string;
  action: string;
  description: string;
  ip_address: string;
  timestamp: string;
  success: boolean;
}

export default function AdminPage() {
  // 로그인 상태 (localStorage에서 복원)
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [token, setToken] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // 페이지 로드 시 저장된 세션 복원 (하루 유효)
  useEffect(() => {
    const saved = localStorage.getItem("DLAS_ADMIN_SESSION");
    if (saved) {
      const session = JSON.parse(saved);
      if (Date.now() - session.time < 24 * 60 * 60 * 1000) {
        setToken(session.token);
        setAdminEmail(session.email);
        setIsLoggedIn(true);
      } else {
        localStorage.removeItem("DLAS_ADMIN_SESSION");
      }
    }
  }, []);

  // 작업 상태
  const [targetEmail, setTargetEmail] = useState("");
  const [loading, setLoading] = useState("");
  const [statusInfo, setStatusInfo] = useState<Record<string, unknown> | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // 로컬 작업 로그
  const [logs, setLogs] = useState<LogEntry[]>([]);
  // 서버 활동 로그
  const [serverLogs, setServerLogs] = useState<ServerLog[]>([]);
  const [showServerLogs, setShowServerLogs] = useState(false);
  const [serverLogLoading, setServerLogLoading] = useState(false);

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
      localStorage.setItem("DLAS_ADMIN_SESSION", JSON.stringify({ token: data.access_token, email: adminEmail, time: Date.now() }));
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

  // 라이센스 부여 (모듈 1번 전용)
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
      const successMsg = `${label} 완료 (만료: ${expiryDate === "9999-12-31" ? "평생" : expiryDate})`;
      setMessage({ text: successMsg, type: "success" });
      addLog(label, targetEmail, successMsg, true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "처리 실패";
      setMessage({ text: msg, type: "error" });
      addLog(label, targetEmail, msg, false);
    } finally {
      setLoading("");
    }
  };

  // 라이센스 중지
  const revokeLicense = async () => {
    if (!targetEmail.trim()) return setMessage({ text: "대상 이메일을 입력하세요", type: "error" });
    setLoading("revoke");
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
          value: "2000-01-01",
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "중지 실패");
      }
      setMessage({ text: "라이센스 중지 완료", type: "success" });
      addLog("라이센스 중지", targetEmail, "모듈 1 라이센스 중지됨", true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "중지 실패";
      setMessage({ text: msg, type: "error" });
      addLog("라이센스 중지", targetEmail, msg, false);
    } finally {
      setLoading("");
    }
  };

  // 서버 활동 로그 조회
  const fetchServerLogs = async () => {
    setServerLogLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/activity-logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "로그 조회 실패");
      setServerLogs(Array.isArray(data) ? data : data.logs || []);
      setShowServerLogs(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "로그 조회 실패";
      setMessage({ text: msg, type: "error" });
    } finally {
      setServerLogLoading(false);
    }
  };

  // 서버 로그 CSV 다운로드
  const downloadLogsCSV = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/export-activity-logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("다운로드 실패");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dlas-activity-logs-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setMessage({ text: "CSV 다운로드 실패", type: "error" });
    }
  };

  // 모듈 1 라이센스 상태 추출
  const getModule1Status = () => {
    if (!statusInfo) return null;
    const ml = statusInfo.module_licenses as Record<string, string> | undefined;
    if (!ml || !ml["1"]) return { active: false, date: null };
    const date = ml["1"];
    const now = new Date().toISOString().split("T")[0];
    const active = date === "9999-12-31" || date >= now;
    return { active, date };
  };

  const module1 = getModule1Status();

  // 카드 공통 스타일
  const cardClass = "bg-black/10 backdrop-blur-xl rounded-2xl border border-white/10 p-6 hover:bg-black/15 hover:border-[#fde68a]/30 transition-all duration-500";
  const cardShadow = { boxShadow: "0 0 30px rgba(255, 255, 255, 0.08)" };

  // 로그인 화면
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
        <Image src="/background/1.png" alt="" fill className="object-cover blur-[3px]" priority />
        <div className="absolute inset-0 bg-black/50" />

        <div
          className={`relative z-10 w-full max-w-sm ${cardClass} p-8`}
          style={cardShadow}
          onMouseEnter={glowEnter}
          onMouseLeave={glowLeave}
        >
          <div className="text-center mb-8">
            <h1
              className="text-2xl font-bold text-white tracking-[0.3em]"
              style={{ textShadow: "0 0 40px rgba(253, 230, 138, 0.6), 0 0 80px rgba(253, 230, 138, 0.4)" }}
            >
              DLAS ADMIN
            </h1>
            <p className="text-white/40 text-sm mt-2">License Management System</p>
          </div>
          <div className="space-y-4">
            <input
              type="email"
              placeholder="Admin Email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-[#fde68a]/30 transition-all duration-300"
            />
            <input
              type="password"
              placeholder="Password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-[#fde68a]/30 transition-all duration-300"
            />
            {loginError && <p className="text-red-400/80 text-sm">{loginError}</p>}
            <button
              onClick={handleLogin}
              disabled={loginLoading}
              className="w-full py-3 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white border border-white/20 hover:border-[#fde68a]/40 rounded-lg font-medium transition-all duration-300"
              style={{ textShadow: "0 0 10px rgba(255,255,255,0.5)" }}
            >
              {loginLoading ? "..." : "LOGIN"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 메인 관리 화면
  return (
    <div className="min-h-screen relative overflow-hidden text-white">
      <Image src="/background/1.png" alt="" fill className="object-cover blur-[3px]" priority />
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* 헤더 */}
          <div className="flex items-center justify-between py-4">
            <div>
              <h1
                className="text-2xl font-bold tracking-[0.3em]"
                style={{ textShadow: "0 0 40px rgba(253, 230, 138, 0.6), 0 0 80px rgba(253, 230, 138, 0.4)" }}
              >
                DLAS ADMIN
              </h1>
              <p className="text-white/40 text-sm mt-1">{adminEmail}</p>
            </div>
            <button
              onClick={() => {
                setIsLoggedIn(false);
                setToken("");
                setAdminEmail("");
                setAdminPassword("");
                setStatusInfo(null);
                setMessage(null);
                localStorage.removeItem("DLAS_ADMIN_SESSION");
              }}
              className="px-4 py-2 text-sm bg-black/10 hover:bg-black/20 border border-white/10 hover:border-[#fde68a]/30 rounded-lg transition-all duration-500 text-white/60 hover:text-white"
            >
              LOGOUT
            </button>
          </div>

          {/* 대상 이메일 입력 */}
          <div
            className={cardClass}
            style={cardShadow}
            onMouseEnter={glowEnter}
            onMouseLeave={glowLeave}
          >
            <label className="block text-white/50 text-sm mb-3" style={{ textShadow: "0 0 8px rgba(255,255,255,0.2)" }}>
              Target User Email
            </label>
            <div className="flex gap-3">
              <input
                type="email"
                placeholder="user@example.com"
                value={targetEmail}
                onChange={(e) => setTargetEmail(e.target.value)}
                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/20 focus:outline-none focus:border-[#fde68a]/30 transition-all duration-300"
              />
              <button
                onClick={handleCheckStatus}
                disabled={!!loading}
                className="px-6 py-3 bg-black/30 hover:bg-black/50 disabled:opacity-50 border border-white/10 hover:border-[#fde68a]/30 rounded-lg font-medium transition-all duration-500 whitespace-nowrap"
                style={{ textShadow: "0 0 10px rgba(255,255,255,0.5)" }}
              >
                {loading === "status" ? "..." : "STATUS"}
              </button>
            </div>
          </div>

          {/* 모듈 1 라이센스 상태 */}
          {statusInfo && (
            <div
              className={cardClass}
              style={cardShadow}
              onMouseEnter={glowEnter}
              onMouseLeave={glowLeave}
            >
              <div className="flex items-center justify-between mb-4">
                <h2
                  className="text-lg font-semibold"
                  style={{ textShadow: "0 0 20px rgba(253, 230, 138, 0.5)" }}
                >
                  3 Transfer Jig Maker
                </h2>
                {module1 && (
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${
                      module1.active
                        ? "text-green-300 border-green-400/30 bg-green-400/10"
                        : "text-red-300 border-red-400/30 bg-red-400/10"
                    }`}
                    style={{
                      boxShadow: module1.active
                        ? "0 0 15px rgba(74, 222, 128, 0.3)"
                        : "0 0 15px rgba(248, 113, 113, 0.3)",
                      textShadow: module1.active
                        ? "0 0 10px rgba(74, 222, 128, 0.5)"
                        : "0 0 10px rgba(248, 113, 113, 0.5)",
                    }}
                  >
                    {module1.active ? "ACTIVE" : "INACTIVE"}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                  <p className="text-white/40 text-xs mb-1">User</p>
                  <p className="text-white/90">{String(statusInfo.email || "-")}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                  <p className="text-white/40 text-xs mb-1">Name</p>
                  <p className="text-white/90">{String(statusInfo.name || "-")}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                  <p className="text-white/40 text-xs mb-1">Company</p>
                  <p className="text-white/90">{String(statusInfo.workplace_name || "-")}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                  <p className="text-white/40 text-xs mb-1">License Expiry</p>
                  <p
                    className={module1?.active ? "text-green-300" : "text-red-300"}
                    style={{
                      textShadow: module1?.active
                        ? "0 0 8px rgba(74, 222, 128, 0.4)"
                        : "0 0 8px rgba(248, 113, 113, 0.4)",
                    }}
                  >
                    {module1?.date
                      ? module1.date === "9999-12-31"
                        ? "PERMANENT"
                        : module1.date
                      : "NONE"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 라이센스 관리 버튼 */}
          <div
            className={cardClass}
            style={cardShadow}
            onMouseEnter={glowEnter}
            onMouseLeave={glowLeave}
          >
            <h2
              className="text-lg font-semibold mb-2"
              style={{ textShadow: "0 0 20px rgba(253, 230, 138, 0.5)" }}
            >
              License Control
            </h2>
            <p className="text-white/30 text-xs mb-5">Module 1 &mdash; 3 Transfer Jig Maker</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                onClick={() => grantLicense("3일 무료", addDays(3))}
                disabled={!!loading}
                className="py-4 bg-black/30 hover:bg-black/50 disabled:opacity-50 border border-white/10 hover:border-[#fde68a]/30 rounded-xl font-medium transition-all duration-500 text-sm"
                style={{ textShadow: "0 0 8px rgba(255,255,255,0.3)" }}
              >
                {loading === "3일 무료" ? "..." : "3-Day Free"}
              </button>
              <button
                onClick={() => grantLicense("1년 라이센스", addDays(365))}
                disabled={!!loading}
                className="py-4 bg-black/30 hover:bg-black/50 disabled:opacity-50 border border-white/10 hover:border-[#fde68a]/30 rounded-xl font-medium transition-all duration-500 text-sm"
                style={{ textShadow: "0 0 8px rgba(255,255,255,0.3)" }}
              >
                {loading === "1년 라이센스" ? "..." : "1-Year"}
              </button>
              <button
                onClick={() => grantLicense("평생 라이센스", "9999-12-31")}
                disabled={!!loading}
                className="py-4 bg-black/30 hover:bg-black/50 disabled:opacity-50 border border-white/10 hover:border-[#fde68a]/30 rounded-xl font-medium transition-all duration-500 text-sm"
                style={{ textShadow: "0 0 8px rgba(255,255,255,0.3)" }}
              >
                {loading === "평생 라이센스" ? "..." : "Permanent"}
              </button>
              <button
                onClick={revokeLicense}
                disabled={!!loading}
                className="py-4 bg-black/30 hover:bg-red-900/30 disabled:opacity-50 border border-white/10 hover:border-red-400/30 rounded-xl font-medium transition-all duration-500 text-sm text-red-300/70 hover:text-red-300"
              >
                {loading === "revoke" ? "..." : "Revoke"}
              </button>
            </div>
          </div>

          {/* 메시지 */}
          {message && (
            <div
              className={`p-4 rounded-xl backdrop-blur-sm border text-sm ${
                message.type === "success"
                  ? "bg-green-500/5 border-green-400/20 text-green-300"
                  : "bg-red-500/5 border-red-400/20 text-red-300"
              }`}
              style={{
                boxShadow: message.type === "success"
                  ? "0 0 20px rgba(74, 222, 128, 0.1)"
                  : "0 0 20px rgba(248, 113, 113, 0.1)",
              }}
            >
              {message.text}
            </div>
          )}

          {/* 현재 세션 로그 */}
          {logs.length > 0 && (
            <div
              className={cardClass}
              style={cardShadow}
              onMouseEnter={glowEnter}
              onMouseLeave={glowLeave}
            >
              <h2
                className="text-lg font-semibold mb-4"
                style={{ textShadow: "0 0 20px rgba(253, 230, 138, 0.5)" }}
              >
                Session Log
              </h2>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {logs.map((log, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 text-sm p-3 rounded-lg bg-white/[0.02] border border-white/5"
                  >
                    <span
                      className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        log.success ? "bg-green-400" : "bg-red-400"
                      }`}
                      style={{
                        boxShadow: log.success
                          ? "0 0 6px rgba(74,222,128,0.6)"
                          : "0 0 6px rgba(248,113,113,0.6)",
                      }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white/30 text-xs">{log.time}</span>
                        <span className="font-medium text-white/70">{log.action}</span>
                        <span className="text-white/30 text-xs">{log.target}</span>
                      </div>
                      <p className="text-white/40 text-xs mt-0.5">{log.result}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 서버 활동 기록 (전체 히스토리) */}
          <div
            className={cardClass}
            style={cardShadow}
            onMouseEnter={glowEnter}
            onMouseLeave={glowLeave}
          >
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-lg font-semibold"
                style={{ textShadow: "0 0 20px rgba(253, 230, 138, 0.5)" }}
              >
                Server Activity History
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={downloadLogsCSV}
                  className="px-3 py-1.5 text-xs bg-black/30 hover:bg-black/50 border border-white/10 hover:border-[#fde68a]/30 rounded-lg transition-all duration-500 text-white/50 hover:text-white"
                >
                  CSV
                </button>
                <button
                  onClick={fetchServerLogs}
                  disabled={serverLogLoading}
                  className="px-3 py-1.5 text-xs bg-black/30 hover:bg-black/50 disabled:opacity-50 border border-white/10 hover:border-[#fde68a]/30 rounded-lg transition-all duration-500 text-white/50 hover:text-white"
                >
                  {serverLogLoading ? "..." : showServerLogs ? "REFRESH" : "LOAD"}
                </button>
              </div>
            </div>

            {showServerLogs && serverLogs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-white/40 border-b border-white/10">
                      <th className="text-left py-2 px-2 font-medium">Time</th>
                      <th className="text-left py-2 px-2 font-medium">User</th>
                      <th className="text-left py-2 px-2 font-medium">Action</th>
                      <th className="text-left py-2 px-2 font-medium">Detail</th>
                      <th className="text-left py-2 px-2 font-medium">IP</th>
                      <th className="text-center py-2 px-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serverLogs.slice(0, 100).map((log) => (
                      <tr
                        key={log.id}
                        className="border-b border-white/5 hover:bg-white/[0.03] transition-colors"
                      >
                        <td className="py-2 px-2 text-white/30 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString("ko-KR", { hour12: false })}
                        </td>
                        <td className="py-2 px-2 text-white/70 max-w-[150px] truncate">{log.user_email || "-"}</td>
                        <td className="py-2 px-2 text-white/60">{log.action}</td>
                        <td className="py-2 px-2 text-white/40 max-w-[200px] truncate">{log.description}</td>
                        <td className="py-2 px-2 text-white/30">{log.ip_address || "-"}</td>
                        <td className="py-2 px-2 text-center">
                          <span
                            className={`inline-block w-1.5 h-1.5 rounded-full ${log.success ? "bg-green-400" : "bg-red-400"}`}
                            style={{
                              boxShadow: log.success
                                ? "0 0 6px rgba(74,222,128,0.6)"
                                : "0 0 6px rgba(248,113,113,0.6)",
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-white/20 text-xs mt-3 text-center">
                  Showing {Math.min(serverLogs.length, 100)} of {serverLogs.length} records
                </p>
              </div>
            ) : showServerLogs ? (
              <p className="text-white/30 text-sm text-center py-4">No records found</p>
            ) : (
              <p className="text-white/20 text-sm text-center py-4">Click LOAD to view server activity history</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
