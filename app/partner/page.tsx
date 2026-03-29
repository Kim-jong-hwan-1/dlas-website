"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";

const API_BASE = "https://license-server-697p.onrender.com";

const glowEnter = (e: React.MouseEvent<HTMLElement>) => {
  e.currentTarget.style.boxShadow = "0 0 40px rgba(253, 230, 138, 0.25), 0 0 80px rgba(253, 230, 138, 0.15)";
};
const glowLeave = (e: React.MouseEvent<HTMLElement>) => {
  e.currentTarget.style.boxShadow = "0 0 30px rgba(255, 255, 255, 0.08)";
};

interface LogEntry {
  time: string;
  action: string;
  target: string;
  result: string;
  success: boolean;
}

export default function PartnerPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [targetEmail, setTargetEmail] = useState("");
  const [loading, setLoading] = useState("");
  const [statusInfo, setStatusInfo] = useState<Record<string, unknown> | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // 세션 복원 (하루)
  useEffect(() => {
    const saved = localStorage.getItem("DLAS_PARTNER_SESSION");
    if (saved) {
      const s = JSON.parse(saved);
      if (Date.now() - s.time < 24 * 60 * 60 * 1000) {
        setToken(s.token);
        setEmail(s.email);
        setIsLoggedIn(true);
      } else {
        localStorage.removeItem("DLAS_PARTNER_SESSION");
      }
    }
  }, []);

  const addLog = useCallback((action: string, target: string, result: string, success: boolean) => {
    const time = new Date().toLocaleString("ko-KR", { hour12: false });
    setLogs((prev) => [{ time, action, target, result, success }, ...prev]);
  }, []);

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoginLoading(true);
    setLoginError("");
    try {
      const res = await fetch(`${API_BASE}/auth/partner-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Login failed");
      setToken(data.access_token);
      setIsLoggedIn(true);
      localStorage.setItem("DLAS_PARTNER_SESSION", JSON.stringify({ token: data.access_token, email, time: Date.now() }));
      // 파트너 로그인 기록
      fetch(`${API_BASE}/partner/log-auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.access_token}` },
        body: JSON.stringify({ type: "login" }),
      }).catch(() => {});
      addLog("Login", email, "Partner login success", true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed";
      setLoginError(msg);
    } finally {
      setLoginLoading(false);
    }
  };

  // 상태 확인 (파트너 전용 API)
  const handleCheckStatus = async () => {
    if (!targetEmail.trim()) return setMessage({ text: "Enter target email", type: "error" });
    setLoading("status");
    setMessage(null);
    setStatusInfo(null);
    try {
      const res = await fetch(`${API_BASE}/partner/check-status?email=${encodeURIComponent(targetEmail.trim())}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed");
      setStatusInfo(data);
      addLog("Status", targetEmail, "OK", true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed";
      setMessage({ text: msg, type: "error" });
      addLog("Status", targetEmail, msg, false);
    } finally {
      setLoading("");
    }
  };

  // 라이센스 액션 (파트너 전용 API)
  const handleAction = async (action: string, label: string) => {
    if (!targetEmail.trim()) return setMessage({ text: "Enter target email", type: "error" });
    setLoading(action);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/partner/update-license`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ target_email: targetEmail.trim(), action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed");
      const expiry = data.expiry === "9999-12-31" ? "Permanent" : data.expiry === "2000-01-01" ? "Revoked" : data.expiry;
      setMessage({ text: `${label} - ${expiry}`, type: "success" });
      addLog(label, targetEmail, expiry, true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed";
      setMessage({ text: msg, type: "error" });
      addLog(label, targetEmail, msg, false);
    } finally {
      setLoading("");
    }
  };

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
              DLAS PARTNER
            </h1>
            <p className="text-white/40 text-sm mt-2">License Control Panel</p>
          </div>
          <div className="space-y-4">
            <input
              type="email"
              placeholder="Partner Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-[#fde68a]/30 transition-all duration-300"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

  return (
    <div className="min-h-screen relative overflow-hidden text-white">
      <Image src="/background/1.png" alt="" fill className="object-cover blur-[3px]" priority />
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 p-4 md:p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* 헤더 */}
          <div className="flex items-center justify-between py-4">
            <div>
              <h1
                className="text-2xl font-bold tracking-[0.3em]"
                style={{ textShadow: "0 0 40px rgba(253, 230, 138, 0.6), 0 0 80px rgba(253, 230, 138, 0.4)" }}
              >
                DLAS PARTNER
              </h1>
              <p className="text-white/40 text-sm mt-1">{email}</p>
            </div>
            <button
              onClick={() => {
                // 파트너 로그아웃 기록
                fetch(`${API_BASE}/partner/log-auth`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ type: "logout" }),
                }).catch(() => {});
                setIsLoggedIn(false);
                setToken("");
                setEmail("");
                setPassword("");
                setStatusInfo(null);
                setMessage(null);
                localStorage.removeItem("DLAS_PARTNER_SESSION");
              }}
              className="px-4 py-2 text-sm bg-black/10 hover:bg-black/20 border border-white/10 hover:border-[#fde68a]/30 rounded-lg transition-all duration-500 text-white/60 hover:text-white"
            >
              LOGOUT
            </button>
          </div>

          {/* 타겟 이메일 */}
          <div className={cardClass} style={cardShadow} onMouseEnter={glowEnter} onMouseLeave={glowLeave}>
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

          {/* 모듈 1 상태 */}
          {statusInfo && (
            <div className={cardClass} style={cardShadow} onMouseEnter={glowEnter} onMouseLeave={glowLeave}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold" style={{ textShadow: "0 0 20px rgba(253, 230, 138, 0.5)" }}>
                  Module 1 &mdash; BITE FINDER
                </h2>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${
                    statusInfo.module1_active
                      ? "text-green-300 border-green-400/30 bg-green-400/10"
                      : "text-red-300 border-red-400/30 bg-red-400/10"
                  }`}
                  style={{
                    boxShadow: statusInfo.module1_active
                      ? "0 0 15px rgba(74, 222, 128, 0.3)"
                      : "0 0 15px rgba(248, 113, 113, 0.3)",
                  }}
                >
                  {statusInfo.module1_active ? "ACTIVE" : "INACTIVE"}
                </span>
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
                    className={statusInfo.module1_active ? "text-green-300" : "text-red-300"}
                    style={{
                      textShadow: statusInfo.module1_active
                        ? "0 0 8px rgba(74, 222, 128, 0.4)"
                        : "0 0 8px rgba(248, 113, 113, 0.4)",
                    }}
                  >
                    {statusInfo.module1_license
                      ? statusInfo.module1_license === "9999-12-31"
                        ? "PERMANENT"
                        : String(statusInfo.module1_license)
                      : "NONE"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 라이센스 컨트롤 */}
          <div className={cardClass} style={cardShadow} onMouseEnter={glowEnter} onMouseLeave={glowLeave}>
            <h2 className="text-lg font-semibold mb-2" style={{ textShadow: "0 0 20px rgba(253, 230, 138, 0.5)" }}>
              License Control
            </h2>
            <p className="text-white/30 text-xs mb-5">Module 1 &mdash; BITE FINDER</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                onClick={() => handleAction("3day", "3-Day Free")}
                disabled={!!loading}
                className="py-4 bg-black/30 hover:bg-black/50 disabled:opacity-50 border border-white/10 hover:border-[#fde68a]/30 rounded-xl font-medium transition-all duration-500 text-sm"
                style={{ textShadow: "0 0 8px rgba(255,255,255,0.3)" }}
              >
                {loading === "3day" ? "..." : "3-Day Free"}
              </button>
              <button
                onClick={() => handleAction("1year", "1-Year")}
                disabled={!!loading}
                className="py-4 bg-black/30 hover:bg-black/50 disabled:opacity-50 border border-white/10 hover:border-[#fde68a]/30 rounded-xl font-medium transition-all duration-500 text-sm"
                style={{ textShadow: "0 0 8px rgba(255,255,255,0.3)" }}
              >
                {loading === "1year" ? "..." : "1-Year"}
              </button>
              <button
                onClick={() => handleAction("permanent", "Permanent")}
                disabled={!!loading}
                className="py-4 bg-black/30 hover:bg-black/50 disabled:opacity-50 border border-white/10 hover:border-[#fde68a]/30 rounded-xl font-medium transition-all duration-500 text-sm"
                style={{ textShadow: "0 0 8px rgba(255,255,255,0.3)" }}
              >
                {loading === "permanent" ? "..." : "Permanent"}
              </button>
              <button
                onClick={() => handleAction("revoke", "Revoke")}
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
            >
              {message.text}
            </div>
          )}

          {/* 세션 로그 */}
          {logs.length > 0 && (
            <div className={cardClass} style={cardShadow} onMouseEnter={glowEnter} onMouseLeave={glowLeave}>
              <h2 className="text-lg font-semibold mb-4" style={{ textShadow: "0 0 20px rgba(253, 230, 138, 0.5)" }}>
                Session Log
              </h2>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {logs.map((log, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm p-3 rounded-lg bg-white/[0.02] border border-white/5">
                    <span
                      className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${log.success ? "bg-green-400" : "bg-red-400"}`}
                      style={{ boxShadow: log.success ? "0 0 6px rgba(74,222,128,0.6)" : "0 0 6px rgba(248,113,113,0.6)" }}
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
        </div>
      </div>
    </div>
  );
}
