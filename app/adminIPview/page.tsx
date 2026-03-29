"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";

const API_BASE = "https://license-server-697p.onrender.com";

const glowEnter = (e: React.MouseEvent<HTMLElement>) => {
  e.currentTarget.style.boxShadow = "0 0 40px rgba(253, 230, 138, 0.25), 0 0 80px rgba(253, 230, 138, 0.15)";
};
const glowLeave = (e: React.MouseEvent<HTMLElement>) => {
  e.currentTarget.style.boxShadow = "0 0 30px rgba(255, 255, 255, 0.08)";
};

interface Session {
  user_id: number; email: string; name: string; ip_address: string;
  current_session_id: string; last_heartbeat: string; is_active: boolean; created_at: string;
}
interface Activity {
  id: number; user_email: string; action: string; description: string;
  ip_address: string; user_agent: string; timestamp: string; success: boolean;
}
interface LoginRecord { ip: string; timestamp: string; }

const LOGIN_HISTORY_KEY = "dlas_login_history";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// 시간 포맷 (UTC → KST)
function formatTime(iso: string) {
  if (!iso) return "-";
  let s = iso;
  if (!s.endsWith("Z") && !s.includes("+")) s += "Z";
  return new Date(s).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
}
function relativeTime(iso: string) {
  if (!iso) return "";
  let s = iso;
  if (!s.endsWith("Z") && !s.includes("+")) s += "Z";
  const diff = Math.floor((Date.now() - new Date(s).getTime()) / 60000);
  if (diff < 1) return "just now";
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
}

export default function AdminIPViewPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [token, setToken] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [tab, setTab] = useState<"sessions" | "logs" | "history">("sessions");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const [actionFilter, setActionFilter] = useState("all");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 로그인 히스토리 (localStorage 7일)
  const [loginHistory, setLoginHistory] = useState<Record<string, LoginRecord[]>>({});

  // 유저 상세 모달
  const [modalUser, setModalUser] = useState<string | null>(null);
  const [modalHistory, setModalHistory] = useState<Activity[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  // 세션 복원
  useEffect(() => {
    const saved = localStorage.getItem("DLAS_ADMIN_SESSION");
    if (saved) {
      const s = JSON.parse(saved);
      if (Date.now() - s.time < 24 * 60 * 60 * 1000) {
        setToken(s.token); setAdminEmail(s.email); setIsLoggedIn(true);
      } else localStorage.removeItem("DLAS_ADMIN_SESSION");
    }
    // 로그인 히스토리 로드
    try {
      const stored = localStorage.getItem(LOGIN_HISTORY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const now = Date.now();
        const filtered: Record<string, LoginRecord[]> = {};
        Object.keys(parsed).forEach((email) => {
          const records = (parsed[email] as LoginRecord[]).filter((r) => now - new Date(r.timestamp).getTime() < SEVEN_DAYS_MS);
          if (records.length > 0) filtered[email] = records;
        });
        setLoginHistory(filtered);
        localStorage.setItem(LOGIN_HISTORY_KEY, JSON.stringify(filtered));
      }
    } catch { /* ignore */ }
  }, []);

  // 세션 로드 시 로그인 히스토리에 추가
  useEffect(() => {
    if (sessions.length === 0) return;
    setLoginHistory((prev) => {
      const updated = { ...prev };
      sessions.forEach((s) => {
        if (!s.email || !s.ip_address) return;
        if (!updated[s.email]) updated[s.email] = [];
        const exists = updated[s.email].some((r) => r.ip === s.ip_address && r.timestamp === s.last_heartbeat);
        if (!exists) {
          updated[s.email].push({ ip: s.ip_address, timestamp: s.last_heartbeat });
          updated[s.email] = updated[s.email].filter((r) => Date.now() - new Date(r.timestamp).getTime() < SEVEN_DAYS_MS);
        }
      });
      localStorage.setItem(LOGIN_HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  }, [sessions]);

  const getUniqueIPs = (email: string) => {
    const h = loginHistory[email];
    if (!h) return [];
    return [...new Set(h.map((r) => r.ip))];
  };
  const getIPCount = (email: string) => getUniqueIPs(email).length;

  const handleLogin = async () => {
    if (!adminEmail || !adminPassword) return;
    setLoginLoading(true); setLoginError("");
    try {
      const res = await fetch(`${API_BASE}/auth/admin-login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Login failed");
      setToken(data.access_token); setIsLoggedIn(true);
      localStorage.setItem("DLAS_ADMIN_SESSION", JSON.stringify({ token: data.access_token, email: adminEmail, time: Date.now() }));
    } catch (err: unknown) { setLoginError(err instanceof Error ? err.message : "Login failed"); }
    finally { setLoginLoading(false); }
  };

  const loadSessions = useCallback(async () => {
    if (!token) return; setSessionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/user-sessions?limit=200`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setSessions(data.sessions || []);
    } catch { /* */ } finally { setSessionLoading(false); }
  }, [token]);

  const loadActivities = useCallback(async () => {
    if (!token) return; setActivityLoading(true);
    try {
      const url = actionFilter === "all" ? `${API_BASE}/admin/activity-logs?limit=200` : `${API_BASE}/admin/activity-logs?action=${actionFilter}&limit=200`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setActivities(data.activities || []);
    } catch { /* */ } finally { setActivityLoading(false); }
  }, [token, actionFilter]);

  // 유저 상세 모달
  const openUserModal = async (email: string) => {
    setModalUser(email); setModalLoading(true); setModalHistory([]);
    try {
      const res = await fetch(`${API_BASE}/admin/activity-logs?limit=1000`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      const all = data.activities || [];
      setModalHistory(all.filter((a: Activity) => a.user_email === email));
    } catch { /* */ } finally { setModalLoading(false); }
  };

  // 자동 새로고침
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (autoRefresh && isLoggedIn) {
      intervalRef.current = setInterval(() => { loadSessions(); loadActivities(); }, refreshInterval * 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, refreshInterval, isLoggedIn, loadSessions, loadActivities]);

  // 다중 IP 유저
  const multiIPUsers = Object.keys(loginHistory).filter((e) => getIPCount(e) > 1).sort((a, b) => getIPCount(b) - getIPCount(a));

  // CSV
  const downloadCSV = (filename: string, header: string, rows: string) => {
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`; a.click();
  };

  const cardClass = "bg-black/10 backdrop-blur-xl rounded-2xl border border-white/10 p-6 hover:bg-black/15 hover:border-[#fde68a]/30 transition-all duration-500";
  const cardShadow = { boxShadow: "0 0 30px rgba(255, 255, 255, 0.08)" };
  const btnClass = "px-3 py-1.5 text-xs bg-black/30 hover:bg-black/50 border border-white/10 hover:border-[#fde68a]/30 rounded-lg transition-all duration-500 text-white/50 hover:text-white";
  const tabClass = (active: boolean) => `px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-500 border ${active ? "bg-white/10 border-[#fde68a]/30 text-white" : "bg-black/10 border-white/10 text-white/40 hover:text-white/70"}`;

  // 로그인 화면
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
        <Image src="/background/1.png" alt="" fill className="object-cover blur-[3px]" priority />
        <div className="absolute inset-0 bg-black/50" />
        <div className={`relative z-10 w-full max-w-sm ${cardClass} p-8`} style={cardShadow} onMouseEnter={glowEnter} onMouseLeave={glowLeave}>
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white tracking-[0.3em]" style={{ textShadow: "0 0 40px rgba(253, 230, 138, 0.6), 0 0 80px rgba(253, 230, 138, 0.4)" }}>DLAS MONITOR</h1>
            <p className="text-white/40 text-sm mt-2">IP & Session Monitoring</p>
          </div>
          <div className="space-y-4">
            <input type="email" placeholder="Admin Email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-[#fde68a]/30 transition-all duration-300" />
            <input type="password" placeholder="Password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-[#fde68a]/30 transition-all duration-300" />
            {loginError && <p className="text-red-400/80 text-sm">{loginError}</p>}
            <button onClick={handleLogin} disabled={loginLoading}
              className="w-full py-3 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white border border-white/20 hover:border-[#fde68a]/40 rounded-lg font-medium transition-all duration-300"
              style={{ textShadow: "0 0 10px rgba(255,255,255,0.5)" }}>{loginLoading ? "..." : "LOGIN"}</button>
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
        <div className="max-w-6xl mx-auto space-y-6">
          {/* 헤더 */}
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-2xl font-bold tracking-[0.3em]" style={{ textShadow: "0 0 40px rgba(253, 230, 138, 0.6), 0 0 80px rgba(253, 230, 138, 0.4)" }}>DLAS MONITOR</h1>
              <p className="text-white/40 text-sm mt-1">{adminEmail}</p>
            </div>
            <div className="flex items-center gap-3">
              {autoRefresh && <span className="flex items-center gap-1.5 text-xs text-green-400"><span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" style={{ boxShadow: "0 0 8px rgba(74,222,128,0.6)" }} />Live</span>}
              <button onClick={() => { setIsLoggedIn(false); setToken(""); localStorage.removeItem("DLAS_ADMIN_SESSION"); }}
                className="px-4 py-2 text-sm bg-black/10 hover:bg-black/20 border border-white/10 hover:border-[#fde68a]/30 rounded-lg transition-all duration-500 text-white/60 hover:text-white">LOGOUT</button>
            </div>
          </div>

          {/* 다중 IP 경고 */}
          {multiIPUsers.length > 0 && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-400/20 backdrop-blur-sm" style={{ boxShadow: "0 0 20px rgba(248,113,113,0.1)" }}>
              <p className="text-red-300 text-sm font-medium mb-2" style={{ textShadow: "0 0 8px rgba(248,113,113,0.4)" }}>
                Multi-IP Warning &mdash; {multiIPUsers.length} user(s) detected
              </p>
              {multiIPUsers.map((email) => (
                <div key={email} className="text-xs flex items-center gap-2 mt-1.5">
                  <button onClick={() => openUserModal(email)} className="text-white/70 hover:text-white underline">{email}</button>
                  <span className="text-red-400 font-mono">{getUniqueIPs(email).join(", ")}</span>
                  <span className="text-red-300/50 border border-red-400/20 rounded px-1.5 py-0.5 text-[10px]">{getIPCount(email)} IPs</span>
                </div>
              ))}
            </div>
          )}

          {/* 탭 */}
          <div className="flex gap-2">
            <button onClick={() => { setTab("sessions"); loadSessions(); }} className={tabClass(tab === "sessions")} style={tab === "sessions" ? { textShadow: "0 0 10px rgba(255,255,255,0.5)" } : {}}>
              Sessions ({sessions.length})
            </button>
            <button onClick={() => { setTab("logs"); loadActivities(); }} className={tabClass(tab === "logs")} style={tab === "logs" ? { textShadow: "0 0 10px rgba(255,255,255,0.5)" } : {}}>
              Activity Logs ({activities.length})
            </button>
            <button onClick={() => setTab("history")} className={tabClass(tab === "history")} style={tab === "history" ? { textShadow: "0 0 10px rgba(255,255,255,0.5)" } : {}}>
              Login History (7d)
              {multiIPUsers.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-red-500/80 text-white rounded-full text-[10px]" style={{ boxShadow: "0 0 8px rgba(248,113,113,0.5)" }}>{multiIPUsers.length}</span>
              )}
            </button>
          </div>

          {/* 컨트롤 바 */}
          <div className={cardClass} style={cardShadow} onMouseEnter={glowEnter} onMouseLeave={glowLeave}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <button onClick={() => { loadSessions(); loadActivities(); }} disabled={sessionLoading || activityLoading} className={btnClass}>
                  {sessionLoading || activityLoading ? "..." : "REFRESH"}
                </button>
                <button onClick={() => setAutoRefresh(!autoRefresh)} className={`${btnClass} ${autoRefresh ? "!border-green-400/30 !text-green-300" : ""}`}>
                  AUTO {autoRefresh ? "ON" : "OFF"}
                </button>
                {autoRefresh && (
                  <select value={refreshInterval} onChange={(e) => setRefreshInterval(Number(e.target.value))} className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white/70 focus:outline-none">
                    <option value={10} className="bg-[#1a1a24]">10s</option><option value={30} className="bg-[#1a1a24]">30s</option>
                    <option value={60} className="bg-[#1a1a24]">1m</option><option value={120} className="bg-[#1a1a24]">2m</option>
                  </select>
                )}
                {tab === "logs" && (
                  <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white/70 focus:outline-none">
                    <option value="all" className="bg-[#1a1a24]">All</option><option value="login" className="bg-[#1a1a24]">Login</option>
                    <option value="register" className="bg-[#1a1a24]">Register</option><option value="partner_license" className="bg-[#1a1a24]">Partner</option>
                    <option value="partner_auth" className="bg-[#1a1a24]">Partner Auth</option><option value="admin_action" className="bg-[#1a1a24]">Admin</option>
                  </select>
                )}
              </div>
              <button onClick={() => {
                if (tab === "sessions") downloadCSV("sessions", "Email,Name,IP,Last Heartbeat,Active\n", sessions.map(s => `"${s.email}","${s.name || ""}","${s.ip_address || ""}","${formatTime(s.last_heartbeat)}","${s.is_active ? "Y" : "N"}"`).join("\n"));
                else downloadCSV("activity-logs", "Time,Email,Action,Description,IP,Success\n", activities.map(a => `"${formatTime(a.timestamp)}","${a.user_email || ""}","${a.action}","${(a.description || "").replace(/"/g, '""')}","${a.ip_address || ""}","${a.success ? "Y" : "N"}"`).join("\n"));
              }} className={btnClass}>CSV</button>
            </div>
          </div>

          {/* ===== 세션 탭 ===== */}
          {tab === "sessions" && (
            <div className={cardClass} style={cardShadow} onMouseEnter={glowEnter} onMouseLeave={glowLeave}>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="text-white/40 border-b border-white/10">
                    <th className="text-left py-2 px-2 font-medium">Email</th><th className="text-left py-2 px-2 font-medium">Name</th>
                    <th className="text-left py-2 px-2 font-medium">IP Address</th><th className="text-left py-2 px-2 font-medium">Last Heartbeat</th>
                    <th className="text-center py-2 px-2 font-medium">Active</th>
                  </tr></thead>
                  <tbody>
                    {sessions.length === 0 ? (
                      <tr><td colSpan={5} className="text-center text-white/20 py-8">Click REFRESH to load</td></tr>
                    ) : sessions.map((s) => {
                      const ips = getUniqueIPs(s.email);
                      const isMulti = ips.length > 1;
                      return (
                        <tr key={s.user_id} className={`border-b border-white/5 hover:bg-white/[0.03] ${isMulti ? "bg-red-500/[0.05]" : ""}`}>
                          <td className="py-2.5 px-2">
                            <button onClick={() => openUserModal(s.email)} className="text-white/70 hover:text-[#fde68a] transition-colors">{s.email}</button>
                            {isMulti && <span className="ml-1.5 text-[10px] text-red-400 border border-red-400/20 rounded px-1" style={{ boxShadow: "0 0 6px rgba(248,113,113,0.2)" }}>{ips.length} IPs</span>}
                          </td>
                          <td className="py-2.5 px-2 text-white/50">{s.name || "-"}</td>
                          <td className="py-2.5 px-2 font-mono">
                            {isMulti ? (
                              <div className="flex flex-col gap-0.5">
                                {ips.map((ip, i) => (
                                  <span key={i} className={ip === s.ip_address ? "text-red-300 font-medium" : "text-white/30"}>
                                    {ip === s.ip_address ? `▶ ${ip}` : ip}
                                  </span>
                                ))}
                              </div>
                            ) : <span className="text-white/50">{s.ip_address || "-"}</span>}
                          </td>
                          <td className="py-2.5 px-2">
                            <div className="text-white/40">{formatTime(s.last_heartbeat)}</div>
                            <div className="text-white/20 text-[10px]">{relativeTime(s.last_heartbeat)}</div>
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <span className={`inline-block w-2 h-2 rounded-full ${s.is_active ? "bg-green-400" : "bg-white/20"}`}
                              style={s.is_active ? { boxShadow: "0 0 6px rgba(74,222,128,0.6)" } : {}} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===== 활동 로그 탭 ===== */}
          {tab === "logs" && (
            <div className={cardClass} style={cardShadow} onMouseEnter={glowEnter} onMouseLeave={glowLeave}>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="text-white/40 border-b border-white/10">
                    <th className="text-left py-2 px-2 font-medium">Time</th><th className="text-left py-2 px-2 font-medium">Email</th>
                    <th className="text-left py-2 px-2 font-medium">Action</th><th className="text-left py-2 px-2 font-medium">Description</th>
                    <th className="text-left py-2 px-2 font-medium">IP</th><th className="text-center py-2 px-2 font-medium">OK</th>
                  </tr></thead>
                  <tbody>
                    {activities.length === 0 ? (
                      <tr><td colSpan={6} className="text-center text-white/20 py-8">Click REFRESH to load</td></tr>
                    ) : activities.map((a) => (
                      <tr key={a.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                        <td className="py-2.5 px-2 text-white/30 whitespace-nowrap">
                          <div>{formatTime(a.timestamp)}</div><div className="text-white/15 text-[10px]">{relativeTime(a.timestamp)}</div>
                        </td>
                        <td className="py-2.5 px-2">
                          {a.user_email ? <button onClick={() => openUserModal(a.user_email)} className="text-white/70 hover:text-[#fde68a] transition-colors">{a.user_email}</button> : "-"}
                        </td>
                        <td className="py-2.5 px-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                            a.action === "login" ? "text-blue-300 border-blue-400/20 bg-blue-400/10" :
                            a.action === "register" ? "text-green-300 border-green-400/20 bg-green-400/10" :
                            a.action === "partner_license" ? "text-amber-300 border-amber-400/20 bg-amber-400/10" :
                            a.action === "partner_auth" ? "text-purple-300 border-purple-400/20 bg-purple-400/10" :
                            a.action === "admin_action" ? "text-red-300 border-red-400/20 bg-red-400/10" :
                            "text-white/40 border-white/10 bg-white/5"
                          }`}>{a.action}</span>
                        </td>
                        <td className="py-2.5 px-2 text-white/40 max-w-[250px] truncate">{a.description || "-"}</td>
                        <td className="py-2.5 px-2 text-white/30 font-mono">{a.ip_address || "-"}</td>
                        <td className="py-2.5 px-2 text-center">
                          <span className={`inline-block w-1.5 h-1.5 rounded-full ${a.success ? "bg-green-400" : "bg-red-400"}`}
                            style={{ boxShadow: a.success ? "0 0 6px rgba(74,222,128,0.6)" : "0 0 6px rgba(248,113,113,0.6)" }} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===== 로그인 히스토리 탭 (7일) ===== */}
          {tab === "history" && (
            <div className={cardClass} style={cardShadow} onMouseEnter={glowEnter} onMouseLeave={glowLeave}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-white/30 text-xs">7-day login IP history (browser local storage)</p>
                <button onClick={() => { if (confirm("Clear all login history?")) { localStorage.removeItem(LOGIN_HISTORY_KEY); setLoginHistory({}); } }}
                  className={`${btnClass} !text-red-300/70 hover:!text-red-300 hover:!border-red-400/30`}>CLEAR</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="text-white/40 border-b border-white/10">
                    <th className="text-left py-2 px-2 font-medium">Email</th><th className="text-left py-2 px-2 font-medium">IP Addresses</th>
                    <th className="text-center py-2 px-2 font-medium">IPs</th><th className="text-left py-2 px-2 font-medium">Last Access</th>
                    <th className="text-center py-2 px-2 font-medium">Status</th>
                  </tr></thead>
                  <tbody>
                    {Object.keys(loginHistory).length === 0 ? (
                      <tr><td colSpan={5} className="text-center text-white/20 py-8">No login history recorded yet</td></tr>
                    ) : Object.keys(loginHistory).sort((a, b) => getIPCount(b) - getIPCount(a)).map((email) => {
                      const ips = getUniqueIPs(email);
                      const isMulti = ips.length > 1;
                      const records = loginHistory[email] || [];
                      const latest = records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
                      return (
                        <tr key={email} className={`border-b border-white/5 hover:bg-white/[0.03] ${isMulti ? "bg-red-500/[0.05]" : ""}`}>
                          <td className="py-2.5 px-2">
                            <button onClick={() => openUserModal(email)} className="text-white/70 hover:text-[#fde68a] transition-colors">{email}</button>
                          </td>
                          <td className="py-2.5 px-2 font-mono">
                            <div className="flex flex-wrap gap-1">
                              {ips.map((ip, i) => (
                                <span key={i} className={`px-1.5 py-0.5 rounded text-[10px] ${isMulti ? "bg-red-500/15 text-red-300 border border-red-400/20" : "bg-white/5 text-white/50 border border-white/10"}`}>{ip}</span>
                              ))}
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${isMulti ? "bg-red-500/20 text-red-300" : "bg-green-400/10 text-green-300"}`}
                              style={isMulti ? { boxShadow: "0 0 8px rgba(248,113,113,0.3)" } : {}}>{ips.length}</span>
                          </td>
                          <td className="py-2.5 px-2">
                            {latest && <><div className="text-white/40">{formatTime(latest.timestamp)}</div><div className="text-white/20 text-[10px]">{relativeTime(latest.timestamp)}</div></>}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${isMulti ? "text-red-300 border-red-400/20 bg-red-500/10" : "text-green-300 border-green-400/20 bg-green-400/10"}`}
                              style={{ boxShadow: isMulti ? "0 0 6px rgba(248,113,113,0.2)" : "0 0 6px rgba(74,222,128,0.2)" }}>
                              {isMulti ? "SUSPECT" : "OK"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== 유저 상세 히스토리 모달 ===== */}
      {modalUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setModalUser(null)}>
          <div className="bg-[#12121a]/95 backdrop-blur-xl border border-white/10 rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden"
            style={{ boxShadow: "0 0 60px rgba(253, 230, 138, 0.1)" }} onClick={(e) => e.stopPropagation()}>
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div>
                <h3 className="text-lg font-semibold text-white" style={{ textShadow: "0 0 15px rgba(253, 230, 138, 0.4)" }}>User Detail</h3>
                <p className="text-white/40 text-sm">{modalUser}</p>
              </div>
              <button onClick={() => setModalUser(null)} className="text-white/40 hover:text-white text-xl transition-colors">x</button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(85vh-70px)]">
              {modalLoading ? <p className="text-white/30 text-center py-8">Loading...</p> : (
                <>
                  {/* 요약 */}
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                      <p className="text-white/40 text-xs mb-1">Total Records</p>
                      <p className="text-2xl font-bold text-white">{modalHistory.length}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                      <p className="text-white/40 text-xs mb-1">Success</p>
                      <p className="text-2xl font-bold text-green-300">{modalHistory.filter((h) => h.success).length}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                      <p className="text-white/40 text-xs mb-1">Unique IPs</p>
                      <p className="text-2xl font-bold text-purple-300">{new Set(modalHistory.filter((h) => h.ip_address).map((h) => h.ip_address)).size}</p>
                    </div>
                  </div>

                  {/* IP 태그 */}
                  <div className="mb-6">
                    <p className="text-white/50 text-xs mb-2">IP Addresses Used</p>
                    <div className="flex flex-wrap gap-1.5">
                      {[...new Set(modalHistory.filter((h) => h.ip_address).map((h) => h.ip_address))].map((ip, i) => (
                        <span key={i} className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-white/60 text-xs font-mono">{ip}</span>
                      ))}
                    </div>
                  </div>

                  {/* 활동 테이블 */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="text-white/40 border-b border-white/10">
                        <th className="text-left py-2 px-2 font-medium">Time</th><th className="text-left py-2 px-2 font-medium">Action</th>
                        <th className="text-left py-2 px-2 font-medium">Description</th><th className="text-left py-2 px-2 font-medium">IP</th>
                        <th className="text-center py-2 px-2 font-medium">OK</th>
                      </tr></thead>
                      <tbody>
                        {modalHistory.length === 0 ? (
                          <tr><td colSpan={5} className="text-center text-white/20 py-6">No records</td></tr>
                        ) : modalHistory.map((h) => (
                          <tr key={h.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                            <td className="py-2 px-2 text-white/30 whitespace-nowrap">
                              <div>{formatTime(h.timestamp)}</div><div className="text-white/15 text-[10px]">{relativeTime(h.timestamp)}</div>
                            </td>
                            <td className="py-2 px-2">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] border ${
                                h.action === "login" ? "text-blue-300 border-blue-400/20 bg-blue-400/10" :
                                h.action === "register" ? "text-green-300 border-green-400/20 bg-green-400/10" :
                                "text-white/40 border-white/10 bg-white/5"
                              }`}>{h.action}</span>
                            </td>
                            <td className="py-2 px-2 text-white/40 max-w-[200px] truncate">{h.description || "-"}</td>
                            <td className="py-2 px-2 text-white/30 font-mono">{h.ip_address || "-"}</td>
                            <td className="py-2 px-2 text-center">
                              <span className={`inline-block w-1.5 h-1.5 rounded-full ${h.success ? "bg-green-400" : "bg-red-400"}`} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
