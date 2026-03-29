"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";

const API_BASE = "https://license-server-697p.onrender.com";

const MODULE_MAP: Record<string, string> = {
  "1": "BITE FINDER",
  "2": "CROWN CAD",
  "3": "DENTURE CAD",
  "4": "FAST DENTURE BOOLEANER",
  "5": "FAST HTML VIEWER CONVERTER",
  "6": "FAST IMAGE CONVERTER",
  "7": "FAST MODIFIER",
  "8": "FAST STL REDUCER",
  "9": "FAST TRANSFER JIG MAKER",
};

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

const glowEnter = (e: React.MouseEvent<HTMLElement>) => {
  e.currentTarget.style.boxShadow = "0 0 40px rgba(253, 230, 138, 0.25), 0 0 80px rgba(253, 230, 138, 0.15)";
};
const glowLeave = (e: React.MouseEvent<HTMLElement>) => {
  e.currentTarget.style.boxShadow = "0 0 30px rgba(255, 255, 255, 0.08)";
};

interface LogEntry { time: string; action: string; target: string; result: string; success: boolean; }
interface PartnerLog { id: number; partner_email: string; partner_name: string; description: string; ip_address: string; timestamp: string; success: boolean; }

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [token, setToken] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [targetEmail, setTargetEmail] = useState("");
  const [moduleId, setModuleId] = useState("1");
  const [loading, setLoading] = useState("");
  const [statusInfo, setStatusInfo] = useState<Record<string, unknown> | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // 파트너 로그
  const [partnerLogs, setPartnerLogs] = useState<PartnerLog[]>([]);
  const [showPartnerLogs, setShowPartnerLogs] = useState(false);
  const [partnerLogLoading, setPartnerLogLoading] = useState(false);

  // 어드민 로그
  interface ServerLog { id: number; user_email: string; action: string; description: string; ip_address: string; timestamp: string; success: boolean; }
  const [adminLogs, setAdminLogs] = useState<ServerLog[]>([]);
  const [showAdminLogs, setShowAdminLogs] = useState(false);
  const [adminLogLoading, setAdminLogLoading] = useState(false);

  // 세션 복원
  useEffect(() => {
    const saved = localStorage.getItem("DLAS_ADMIN_SESSION");
    if (saved) {
      const s = JSON.parse(saved);
      if (Date.now() - s.time < 24 * 60 * 60 * 1000) {
        setToken(s.token);
        setAdminEmail(s.email);
        setIsLoggedIn(true);
      } else {
        localStorage.removeItem("DLAS_ADMIN_SESSION");
      }
    }
  }, []);

  const addLog = useCallback((action: string, target: string, result: string, success: boolean) => {
    const time = new Date().toLocaleString("ko-KR", { hour12: false });
    setLogs((prev) => [{ time, action, target, result, success }, ...prev]);
  }, []);

  const handleLogin = async () => {
    if (!adminEmail || !adminPassword) return;
    setLoginLoading(true);
    setLoginError("");
    try {
      const res = await fetch(`${API_BASE}/auth/admin-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Login failed");
      setToken(data.access_token);
      setIsLoggedIn(true);
      localStorage.setItem("DLAS_ADMIN_SESSION", JSON.stringify({ token: data.access_token, email: adminEmail, time: Date.now() }));
      addLog("Login", adminEmail, "Admin login success", true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed";
      setLoginError(msg);
    } finally {
      setLoginLoading(false);
    }
  };

  // 상태 확인 (전체 모듈)
  const handleCheckStatus = async () => {
    if (!targetEmail.trim()) return setMessage({ text: "Enter target email", type: "error" });
    setLoading("status");
    setMessage(null);
    setStatusInfo(null);
    try {
      const res = await fetch(`${API_BASE}/admin/userinfo?email=${encodeURIComponent(targetEmail.trim())}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed");

      // 전체 유저정보도 가져오기
      const res2 = await fetch(`${API_BASE}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const users = await res2.json();
      const user = Array.isArray(users) ? users.find((u: Record<string, unknown>) => u.email === targetEmail.trim()) : null;

      setStatusInfo({ ...data, ...(user || {}) });
      addLog("Status", targetEmail, "OK", true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed";
      setMessage({ text: msg, type: "error" });
      addLog("Status", targetEmail, msg, false);
    } finally {
      setLoading("");
    }
  };

  // IP 차단 초기화
  const resetIPBlock = async () => {
    if (!targetEmail.trim()) return setMessage({ text: "Enter target email", type: "error" });
    if (!confirm(`${targetEmail} 의 IP 차단 기록을 초기화합니다. 계속할까요?`)) return;
    setLoading("ip-reset");
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/admin/reset-ip-block`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: targetEmail.trim() }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed");
      }
      setMessage({ text: `IP 차단 초기화 완료: ${targetEmail}`, type: "success" });
      addLog("IP Reset", targetEmail, "IP block cleared", true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed";
      setMessage({ text: msg, type: "error" });
      addLog("IP Reset", targetEmail, msg, false);
    } finally {
      setLoading("");
    }
  };

  // 라이센스 부여 (선택한 모듈)
  const grantLicense = async (label: string, expiryDate: string) => {
    if (!targetEmail.trim()) return setMessage({ text: "Enter target email", type: "error" });
    setLoading(label);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/admin/update_user`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: targetEmail.trim(), field: `module_licenses.${moduleId}`, value: expiryDate }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed");
      }
      const display = expiryDate === "9999-12-31" ? "Permanent" : expiryDate === "2000-01-01" ? "Revoked" : expiryDate;
      const successMsg = `Module ${moduleId} (${MODULE_MAP[moduleId]}) → ${label}: ${display}`;
      setMessage({ text: successMsg, type: "success" });
      addLog(label, targetEmail, successMsg, true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed";
      setMessage({ text: msg, type: "error" });
      addLog(label, targetEmail, msg, false);
    } finally {
      setLoading("");
    }
  };

  // 파트너 로그 조회
  const fetchPartnerLogs = async () => {
    setPartnerLogLoading(true);
    try {
      const res = await fetch(`${API_BASE}/partner/logs?limit=500`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed");
      setPartnerLogs(data.logs || []);
      setShowPartnerLogs(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed";
      setMessage({ text: msg, type: "error" });
    } finally {
      setPartnerLogLoading(false);
    }
  };

  // 파트너 description → 활동 타입 분류
  const classifyPartnerAction = (desc: string): string => {
    if (desc.includes("로그인")) return "로그인";
    if (desc.includes("로그아웃")) return "로그아웃";
    if (desc.includes("3일 무료")) return "3일무료부여";
    if (desc.includes("1년 라이센스")) return "1년부여";
    if (desc.includes("평생 라이센스")) return "평생부여";
    if (desc.includes("라이센스 중지")) return "라이센스중지";
    return "기타";
  };

  // 어드민 description → 활동 타입 분류
  const classifyAdminAction = (desc: string): string => {
    if (desc.includes("유저 수정") && desc.includes("module_licenses")) {
      if (desc.includes("9999-12-31")) return "평생부여";
      if (desc.includes("2000-01-01")) return "라이센스중지";
      return "라이센스변경";
    }
    if (desc.includes("유저 수정")) return "유저정보수정";
    if (desc.includes("유저 추가")) return "유저추가";
    if (desc.includes("유저 삭제")) return "유저삭제";
    if (desc.includes("임시 라이센스")) return "임시라이센스";
    if (desc.includes("패밀리 라이센스")) return "패밀리부여";
    if (desc.includes("IP 차단 초기화")) return "IP차단초기화";
    return "기타";
  };

  // 파트너 로그 엑셀(CSV) 다운로드
  const downloadPartnerCSV = () => {
    if (partnerLogs.length === 0) return;
    const BOM = "\uFEFF";
    const header = "No,Time,Activity Type,Partner Name,Partner Email,Detail,Target,IP Address,Success\n";
    const rows = partnerLogs.map((log, i) => {
      const type = classifyPartnerAction(log.description);
      const targetMatch = log.description.match(/→\s*(\S+)/);
      const target = targetMatch ? targetMatch[1] : "";
      return `${i + 1},"${new Date(log.timestamp).toLocaleString("ko-KR", { hour12: false })}","${type}","${log.partner_name}","${log.partner_email}","${log.description}","${target}","${log.ip_address}","${log.success ? "Y" : "N"}"`;
    }).join("\n");
    const blob = new Blob([BOM + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `partner-logs-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 어드민 로그 조회
  const fetchAdminLogs = async () => {
    setAdminLogLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/activity-logs?action=admin_action&limit=500`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed");
      setAdminLogs(data.activities || []);
      setShowAdminLogs(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed";
      setMessage({ text: msg, type: "error" });
    } finally {
      setAdminLogLoading(false);
    }
  };

  // 어드민 로그 CSV 다운로드
  const downloadAdminCSV = () => {
    if (adminLogs.length === 0) return;
    const BOM = "\uFEFF";
    const header = "No,Time,Activity Type,Admin,Detail,IP Address,Success\n";
    const rows = adminLogs.map((log, i) => {
      const type = classifyAdminAction(log.description);
      return `${i + 1},"${new Date(log.timestamp).toLocaleString("ko-KR", { hour12: false })}","${type}","${log.user_email}","${log.description}","${log.ip_address}","${log.success ? "Y" : "N"}"`;
    }).join("\n");
    const blob = new Blob([BOM + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `admin-logs-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 모듈별 라이센스 상태
  const getModuleLicenses = () => {
    if (!statusInfo) return null;
    const ml = (statusInfo.module_licenses as Record<string, string>) || {};
    const now = new Date().toISOString().split("T")[0];
    return Object.entries(MODULE_MAP).map(([id, name]) => {
      const date = ml[id];
      const active = date ? (date === "9999-12-31" || date >= now) : false;
      return { id, name, date, active };
    });
  };

  const moduleLicenses = getModuleLicenses();

  const cardClass = "bg-black/10 backdrop-blur-xl rounded-2xl border border-white/10 p-6 hover:bg-black/15 hover:border-[#fde68a]/30 transition-all duration-500";
  const cardShadow = { boxShadow: "0 0 30px rgba(255, 255, 255, 0.08)" };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
        <Image src="/background/1.png" alt="" fill className="object-cover blur-[3px]" priority />
        <div className="absolute inset-0 bg-black/50" />
        <div className={`relative z-10 w-full max-w-sm ${cardClass} p-8`} style={cardShadow} onMouseEnter={glowEnter} onMouseLeave={glowLeave}>
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white tracking-[0.3em]" style={{ textShadow: "0 0 40px rgba(253, 230, 138, 0.6), 0 0 80px rgba(253, 230, 138, 0.4)" }}>
              DLAS ADMIN
            </h1>
            <p className="text-white/40 text-sm mt-2">License Management System</p>
          </div>
          <div className="space-y-4">
            <input type="email" placeholder="Admin Email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-[#fde68a]/30 transition-all duration-300" />
            <input type="password" placeholder="Password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-[#fde68a]/30 transition-all duration-300" />
            {loginError && <p className="text-red-400/80 text-sm">{loginError}</p>}
            <button onClick={handleLogin} disabled={loginLoading}
              className="w-full py-3 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white border border-white/20 hover:border-[#fde68a]/40 rounded-lg font-medium transition-all duration-300"
              style={{ textShadow: "0 0 10px rgba(255,255,255,0.5)" }}>
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
        <div className="max-w-5xl mx-auto space-y-6">
          {/* 헤더 */}
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-2xl font-bold tracking-[0.3em]" style={{ textShadow: "0 0 40px rgba(253, 230, 138, 0.6), 0 0 80px rgba(253, 230, 138, 0.4)" }}>
                DLAS ADMIN
              </h1>
              <p className="text-white/40 text-sm mt-1">{adminEmail}</p>
            </div>
            <button onClick={() => { setIsLoggedIn(false); setToken(""); setAdminEmail(""); setAdminPassword(""); setStatusInfo(null); setMessage(null); localStorage.removeItem("DLAS_ADMIN_SESSION"); }}
              className="px-4 py-2 text-sm bg-black/10 hover:bg-black/20 border border-white/10 hover:border-[#fde68a]/30 rounded-lg transition-all duration-500 text-white/60 hover:text-white">
              LOGOUT
            </button>
          </div>

          {/* 타겟 이메일 + 상태확인 */}
          <div className={cardClass} style={cardShadow} onMouseEnter={glowEnter} onMouseLeave={glowLeave}>
            <label className="block text-white/50 text-sm mb-3" style={{ textShadow: "0 0 8px rgba(255,255,255,0.2)" }}>Target User Email</label>
            <div className="flex gap-3">
              <input type="email" placeholder="user@example.com" value={targetEmail} onChange={(e) => setTargetEmail(e.target.value)}
                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/20 focus:outline-none focus:border-[#fde68a]/30 transition-all duration-300" />
              <button onClick={handleCheckStatus} disabled={!!loading}
                className="px-6 py-3 bg-black/30 hover:bg-black/50 disabled:opacity-50 border border-white/10 hover:border-[#fde68a]/30 rounded-lg font-medium transition-all duration-500 whitespace-nowrap"
                style={{ textShadow: "0 0 10px rgba(255,255,255,0.5)" }}>
                {loading === "status" ? "..." : "STATUS"}
              </button>
              <button onClick={resetIPBlock} disabled={!!loading}
                className="px-4 py-3 bg-black/30 hover:bg-red-900/30 disabled:opacity-50 border border-white/10 hover:border-red-400/30 rounded-lg font-medium transition-all duration-500 whitespace-nowrap text-red-300/70 hover:text-red-300 text-sm">
                {loading === "ip-reset" ? "..." : "IP Block Reset"}
              </button>
            </div>
          </div>

          {/* 전체 모듈 라이센스 상태 */}
          {statusInfo && moduleLicenses && (
            <div className={cardClass} style={cardShadow} onMouseEnter={glowEnter} onMouseLeave={glowLeave}>
              <h2 className="text-lg font-semibold mb-4" style={{ textShadow: "0 0 20px rgba(253, 230, 138, 0.5)" }}>
                {String(statusInfo.email || targetEmail)} &mdash; All Modules
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {moduleLicenses.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/5">
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${m.active ? "bg-green-400" : "bg-red-400/50"}`}
                      style={{ boxShadow: m.active ? "0 0 6px rgba(74,222,128,0.6)" : "none" }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-white/50">#{m.id}</p>
                      <p className="text-sm text-white/80 truncate">{m.name}</p>
                    </div>
                    <span className={`text-xs ${m.active ? "text-green-300" : "text-white/20"}`}>
                      {m.date ? (m.date === "9999-12-31" ? "PERM" : m.date) : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 라이센스 관리 (모듈 선택) */}
          <div className={cardClass} style={cardShadow} onMouseEnter={glowEnter} onMouseLeave={glowLeave}>
            <h2 className="text-lg font-semibold mb-2" style={{ textShadow: "0 0 20px rgba(253, 230, 138, 0.5)" }}>
              License Control
            </h2>
            <div className="flex items-center gap-3 mb-5">
              <span className="text-white/40 text-sm">Module:</span>
              <select
                value={moduleId}
                onChange={(e) => setModuleId(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#fde68a]/30 transition-all duration-300"
              >
                {Object.entries(MODULE_MAP).map(([id, name]) => (
                  <option key={id} value={id} className="bg-[#1a1a24] text-white">
                    #{id} {name}
                  </option>
                ))}
              </select>
              <span className="text-white/30 text-xs">{MODULE_MAP[moduleId]}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <button onClick={() => grantLicense("3-Day", addDays(3))} disabled={!!loading}
                className="py-3 bg-black/30 hover:bg-black/50 disabled:opacity-50 border border-white/10 hover:border-[#fde68a]/30 rounded-xl font-medium transition-all duration-500 text-sm"
                style={{ textShadow: "0 0 8px rgba(255,255,255,0.3)" }}>
                {loading === "3-Day" ? "..." : "3-Day"}
              </button>
              <button onClick={() => grantLicense("1-Year", addDays(365))} disabled={!!loading}
                className="py-3 bg-black/30 hover:bg-black/50 disabled:opacity-50 border border-white/10 hover:border-[#fde68a]/30 rounded-xl font-medium transition-all duration-500 text-sm"
                style={{ textShadow: "0 0 8px rgba(255,255,255,0.3)" }}>
                {loading === "1-Year" ? "..." : "1-Year"}
              </button>
              <button onClick={() => grantLicense("3-Year", addDays(1095))} disabled={!!loading}
                className="py-3 bg-black/30 hover:bg-black/50 disabled:opacity-50 border border-white/10 hover:border-[#fde68a]/30 rounded-xl font-medium transition-all duration-500 text-sm"
                style={{ textShadow: "0 0 8px rgba(255,255,255,0.3)" }}>
                {loading === "3-Year" ? "..." : "3-Year"}
              </button>
              <button onClick={() => grantLicense("Permanent", "9999-12-31")} disabled={!!loading}
                className="py-3 bg-black/30 hover:bg-black/50 disabled:opacity-50 border border-white/10 hover:border-[#fde68a]/30 rounded-xl font-medium transition-all duration-500 text-sm"
                style={{ textShadow: "0 0 8px rgba(255,255,255,0.3)" }}>
                {loading === "Permanent" ? "..." : "Permanent"}
              </button>
              <button onClick={() => grantLicense("Revoke", "2000-01-01")} disabled={!!loading}
                className="py-3 bg-black/30 hover:bg-red-900/30 disabled:opacity-50 border border-white/10 hover:border-red-400/30 rounded-xl font-medium transition-all duration-500 text-sm text-red-300/70 hover:text-red-300">
                {loading === "Revoke" ? "..." : "Revoke"}
              </button>
            </div>
          </div>

          {/* 메시지 */}
          {message && (
            <div className={`p-4 rounded-xl backdrop-blur-sm border text-sm ${message.type === "success" ? "bg-green-500/5 border-green-400/20 text-green-300" : "bg-red-500/5 border-red-400/20 text-red-300"}`}>
              {message.text}
            </div>
          )}

          {/* 파트너 활동 로그 */}
          <div className={cardClass} style={cardShadow} onMouseEnter={glowEnter} onMouseLeave={glowLeave}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ textShadow: "0 0 20px rgba(253, 230, 138, 0.5)" }}>
                Partner Activity Logs
              </h2>
              <div className="flex gap-2">
                {showPartnerLogs && partnerLogs.length > 0 && (
                  <button onClick={downloadPartnerCSV}
                    className="px-3 py-1.5 text-xs bg-black/30 hover:bg-black/50 border border-white/10 hover:border-[#fde68a]/30 rounded-lg transition-all duration-500 text-white/50 hover:text-white">
                    EXCEL (CSV)
                  </button>
                )}
                <button onClick={fetchPartnerLogs} disabled={partnerLogLoading}
                  className="px-3 py-1.5 text-xs bg-black/30 hover:bg-black/50 disabled:opacity-50 border border-white/10 hover:border-[#fde68a]/30 rounded-lg transition-all duration-500 text-white/50 hover:text-white">
                  {partnerLogLoading ? "..." : showPartnerLogs ? "REFRESH" : "LOAD"}
                </button>
              </div>
            </div>

            {showPartnerLogs && partnerLogs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-white/40 border-b border-white/10">
                      <th className="text-left py-2 px-2 font-medium">Time</th>
                      <th className="text-left py-2 px-2 font-medium">Partner</th>
                      <th className="text-left py-2 px-2 font-medium">Action</th>
                      <th className="text-left py-2 px-2 font-medium">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partnerLogs.map((log) => (
                      <tr key={log.id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                        <td className="py-2 px-2 text-white/30 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString("ko-KR", { hour12: false })}
                        </td>
                        <td className="py-2 px-2">
                          <span className="text-white/70 font-medium">{log.partner_name}</span>
                          <span className="text-white/30 ml-1 text-[10px]">{log.partner_email}</span>
                        </td>
                        <td className="py-2 px-2 text-white/60 max-w-[300px]">{log.description}</td>
                        <td className="py-2 px-2 text-white/30">{log.ip_address || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-white/20 text-xs mt-3 text-center">{partnerLogs.length} records</p>
              </div>
            ) : showPartnerLogs ? (
              <p className="text-white/30 text-sm text-center py-4">No partner logs found</p>
            ) : (
              <p className="text-white/20 text-sm text-center py-4">Click LOAD to view partner activity logs</p>
            )}
          </div>

          {/* 어드민 활동 로그 */}
          <div className={cardClass} style={cardShadow} onMouseEnter={glowEnter} onMouseLeave={glowLeave}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ textShadow: "0 0 20px rgba(253, 230, 138, 0.5)" }}>
                Admin Activity Logs
              </h2>
              <div className="flex gap-2">
                {showAdminLogs && adminLogs.length > 0 && (
                  <button onClick={downloadAdminCSV}
                    className="px-3 py-1.5 text-xs bg-black/30 hover:bg-black/50 border border-white/10 hover:border-[#fde68a]/30 rounded-lg transition-all duration-500 text-white/50 hover:text-white">
                    EXCEL (CSV)
                  </button>
                )}
                <button onClick={fetchAdminLogs} disabled={adminLogLoading}
                  className="px-3 py-1.5 text-xs bg-black/30 hover:bg-black/50 disabled:opacity-50 border border-white/10 hover:border-[#fde68a]/30 rounded-lg transition-all duration-500 text-white/50 hover:text-white">
                  {adminLogLoading ? "..." : showAdminLogs ? "REFRESH" : "LOAD"}
                </button>
              </div>
            </div>

            {showAdminLogs && adminLogs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-white/40 border-b border-white/10">
                      <th className="text-left py-2 px-2 font-medium">Time</th>
                      <th className="text-left py-2 px-2 font-medium">Admin</th>
                      <th className="text-left py-2 px-2 font-medium">Action</th>
                      <th className="text-left py-2 px-2 font-medium">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminLogs.map((log) => (
                      <tr key={log.id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                        <td className="py-2 px-2 text-white/30 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString("ko-KR", { hour12: false })}
                        </td>
                        <td className="py-2 px-2 text-white/70">{log.user_email}</td>
                        <td className="py-2 px-2 text-white/60 max-w-[300px]">{log.description}</td>
                        <td className="py-2 px-2 text-white/30">{log.ip_address || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-white/20 text-xs mt-3 text-center">{adminLogs.length} records</p>
              </div>
            ) : showAdminLogs ? (
              <p className="text-white/30 text-sm text-center py-4">No admin logs found</p>
            ) : (
              <p className="text-white/20 text-sm text-center py-4">Click LOAD to view admin activity logs</p>
            )}
          </div>

          {/* 세션 로그 */}
          {logs.length > 0 && (
            <div className={cardClass} style={cardShadow} onMouseEnter={glowEnter} onMouseLeave={glowLeave}>
              <h2 className="text-lg font-semibold mb-4" style={{ textShadow: "0 0 20px rgba(253, 230, 138, 0.5)" }}>Session Log</h2>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {logs.map((log, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm p-3 rounded-lg bg-white/[0.02] border border-white/5">
                    <span className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${log.success ? "bg-green-400" : "bg-red-400"}`}
                      style={{ boxShadow: log.success ? "0 0 6px rgba(74,222,128,0.6)" : "0 0 6px rgba(248,113,113,0.6)" }} />
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
