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
  user_id: number;
  email: string;
  name: string;
  ip_address: string;
  current_session_id: string;
  last_heartbeat: string;
  is_active: boolean;
  created_at: string;
}

interface Activity {
  id: number;
  user_email: string;
  action: string;
  description: string;
  ip_address: string;
  user_agent: string;
  timestamp: string;
  success: boolean;
}

export default function AdminIPViewPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [token, setToken] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // 탭
  const [tab, setTab] = useState<"sessions" | "logs">("sessions");

  // 세션
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionLoading, setSessionLoading] = useState(false);

  // 활동 로그
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [actionFilter, setActionFilter] = useState("all");

  // 자동 새로고침
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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
      if (!res.ok) throw new Error(data.detail || "Login failed");
      setToken(data.access_token);
      setIsLoggedIn(true);
      localStorage.setItem("DLAS_ADMIN_SESSION", JSON.stringify({ token: data.access_token, email: adminEmail, time: Date.now() }));
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoginLoading(false);
    }
  };

  // 세션 조회
  const loadSessions = useCallback(async () => {
    if (!token) return;
    setSessionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/user-sessions?limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setSessions(data.sessions || []);
    } catch { /* ignore */ }
    finally { setSessionLoading(false); }
  }, [token]);

  // 활동 로그 조회
  const loadActivities = useCallback(async () => {
    if (!token) return;
    setActivityLoading(true);
    try {
      const url = actionFilter === "all"
        ? `${API_BASE}/admin/activity-logs?limit=200`
        : `${API_BASE}/admin/activity-logs?action=${actionFilter}&limit=200`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setActivities(data.activities || []);
    } catch { /* ignore */ }
    finally { setActivityLoading(false); }
  }, [token, actionFilter]);

  // 자동 새로고침
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (autoRefresh && isLoggedIn) {
      const load = () => { if (tab === "sessions") loadSessions(); else loadActivities(); };
      intervalRef.current = setInterval(load, refreshInterval * 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, refreshInterval, tab, isLoggedIn, loadSessions, loadActivities]);

  // 다중 IP 감지
  const getMultiIPUsers = () => {
    const ipMap: Record<string, Set<string>> = {};
    sessions.forEach((s) => {
      if (s.ip_address && s.email) {
        if (!ipMap[s.email]) ipMap[s.email] = new Set();
        ipMap[s.email].add(s.ip_address);
      }
    });
    return Object.entries(ipMap).filter(([, ips]) => ips.size > 1).map(([email, ips]) => ({ email, ips: Array.from(ips) }));
  };

  const multiIPUsers = isLoggedIn ? getMultiIPUsers() : [];

  // CSV 다운로드
  const downloadSessionCSV = () => {
    const BOM = "\uFEFF";
    const header = "User ID,Email,Name,IP,Session ID,Last Heartbeat,Active,Created At\n";
    const rows = sessions.map((s) =>
      `${s.user_id},"${s.email}","${s.name || ""}","${s.ip_address || ""}","${s.current_session_id || ""}","${s.last_heartbeat || ""}","${s.is_active ? "Y" : "N"}","${s.created_at || ""}"`
    ).join("\n");
    const blob = new Blob([BOM + header + rows], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sessions-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const downloadActivityCSV = () => {
    const BOM = "\uFEFF";
    const header = "ID,Email,Action,Description,IP,User Agent,Timestamp,Success\n";
    const rows = activities.map((a) =>
      `${a.id},"${a.user_email || ""}","${a.action}","${(a.description || "").replace(/"/g, '""')}","${a.ip_address || ""}","${(a.user_agent || "").replace(/"/g, '""')}","${a.timestamp || ""}","${a.success ? "Y" : "N"}"`
    ).join("\n");
    const blob = new Blob([BOM + header + rows], { type: "text/csv;charset=utf-8;" });
    const el = document.createElement("a");
    el.href = URL.createObjectURL(blob);
    el.download = `activity-logs-${new Date().toISOString().split("T")[0]}.csv`;
    el.click();
  };

  const formatTime = (ts: string) => {
    if (!ts) return "-";
    return new Date(ts).toLocaleString("ko-KR", { hour12: false });
  };

  const cardClass = "bg-black/10 backdrop-blur-xl rounded-2xl border border-white/10 p-6 hover:bg-black/15 hover:border-[#fde68a]/30 transition-all duration-500";
  const cardShadow = { boxShadow: "0 0 30px rgba(255, 255, 255, 0.08)" };
  const btnClass = "px-3 py-1.5 text-xs bg-black/30 hover:bg-black/50 border border-white/10 hover:border-[#fde68a]/30 rounded-lg transition-all duration-500 text-white/50 hover:text-white";

  // 로그인
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
        <Image src="/background/1.png" alt="" fill className="object-cover blur-[3px]" priority />
        <div className="absolute inset-0 bg-black/50" />
        <div className={`relative z-10 w-full max-w-sm ${cardClass} p-8`} style={cardShadow} onMouseEnter={glowEnter} onMouseLeave={glowLeave}>
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white tracking-[0.3em]" style={{ textShadow: "0 0 40px rgba(253, 230, 138, 0.6), 0 0 80px rgba(253, 230, 138, 0.4)" }}>
              DLAS MONITOR
            </h1>
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
        <div className="max-w-6xl mx-auto space-y-6">
          {/* 헤더 */}
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-2xl font-bold tracking-[0.3em]" style={{ textShadow: "0 0 40px rgba(253, 230, 138, 0.6), 0 0 80px rgba(253, 230, 138, 0.4)" }}>
                DLAS MONITOR
              </h1>
              <p className="text-white/40 text-sm mt-1">{adminEmail}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-xs text-green-400">
                <span className="w-2 h-2 rounded-full bg-green-400" style={{ boxShadow: "0 0 8px rgba(74,222,128,0.6)" }} />
                Connected
              </span>
              <button onClick={() => { setIsLoggedIn(false); setToken(""); localStorage.removeItem("DLAS_ADMIN_SESSION"); }}
                className="px-4 py-2 text-sm bg-black/10 hover:bg-black/20 border border-white/10 hover:border-[#fde68a]/30 rounded-lg transition-all duration-500 text-white/60 hover:text-white">
                LOGOUT
              </button>
            </div>
          </div>

          {/* 다중 IP 경고 */}
          {multiIPUsers.length > 0 && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-400/20 backdrop-blur-sm">
              <p className="text-red-300 text-sm font-medium mb-2" style={{ textShadow: "0 0 8px rgba(248,113,113,0.4)" }}>
                Multi-IP Warning &mdash; {multiIPUsers.length} user(s)
              </p>
              {multiIPUsers.map((u) => (
                <div key={u.email} className="text-xs text-red-300/70 flex items-center gap-2 mt-1">
                  <span className="text-white/70">{u.email}</span>
                  <span className="text-red-400">{u.ips.join(", ")}</span>
                </div>
              ))}
            </div>
          )}

          {/* 탭 */}
          <div className="flex gap-2">
            <button onClick={() => { setTab("sessions"); loadSessions(); }}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-500 border ${tab === "sessions" ? "bg-white/10 border-[#fde68a]/30 text-white" : "bg-black/10 border-white/10 text-white/40 hover:text-white/70"}`}
              style={tab === "sessions" ? { textShadow: "0 0 10px rgba(255,255,255,0.5)" } : {}}>
              Sessions & Heartbeat
            </button>
            <button onClick={() => { setTab("logs"); loadActivities(); }}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-500 border ${tab === "logs" ? "bg-white/10 border-[#fde68a]/30 text-white" : "bg-black/10 border-white/10 text-white/40 hover:text-white/70"}`}
              style={tab === "logs" ? { textShadow: "0 0 10px rgba(255,255,255,0.5)" } : {}}>
              Activity Logs
            </button>
          </div>

          {/* 컨트롤 바 */}
          <div className={cardClass} style={cardShadow} onMouseEnter={glowEnter} onMouseLeave={glowLeave}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <button onClick={() => tab === "sessions" ? loadSessions() : loadActivities()} disabled={sessionLoading || activityLoading} className={btnClass}>
                  {sessionLoading || activityLoading ? "..." : "REFRESH"}
                </button>
                <button onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`${btnClass} ${autoRefresh ? "!border-green-400/30 !text-green-300" : ""}`}>
                  AUTO {autoRefresh ? "ON" : "OFF"}
                </button>
                {autoRefresh && (
                  <select value={refreshInterval} onChange={(e) => setRefreshInterval(Number(e.target.value))}
                    className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white/70 focus:outline-none">
                    <option value={10} className="bg-[#1a1a24]">10s</option>
                    <option value={30} className="bg-[#1a1a24]">30s</option>
                    <option value={60} className="bg-[#1a1a24]">1m</option>
                    <option value={120} className="bg-[#1a1a24]">2m</option>
                  </select>
                )}
                {tab === "logs" && (
                  <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white/70 focus:outline-none">
                    <option value="all" className="bg-[#1a1a24]">All</option>
                    <option value="login" className="bg-[#1a1a24]">Login</option>
                    <option value="register" className="bg-[#1a1a24]">Register</option>
                    <option value="partner_license" className="bg-[#1a1a24]">Partner</option>
                    <option value="partner_auth" className="bg-[#1a1a24]">Partner Auth</option>
                    <option value="admin_action" className="bg-[#1a1a24]">Admin</option>
                  </select>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/30 text-xs">
                  {tab === "sessions" ? `${sessions.length} sessions` : `${activities.length} records`}
                </span>
                <button onClick={tab === "sessions" ? downloadSessionCSV : downloadActivityCSV} className={btnClass}>
                  CSV
                </button>
              </div>
            </div>
          </div>

          {/* 세션 테이블 */}
          {tab === "sessions" && (
            <div className={cardClass} style={cardShadow} onMouseEnter={glowEnter} onMouseLeave={glowLeave}>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-white/40 border-b border-white/10">
                      <th className="text-left py-2 px-2 font-medium">Email</th>
                      <th className="text-left py-2 px-2 font-medium">Name</th>
                      <th className="text-left py-2 px-2 font-medium">IP</th>
                      <th className="text-left py-2 px-2 font-medium">Last Heartbeat</th>
                      <th className="text-center py-2 px-2 font-medium">Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.length === 0 ? (
                      <tr><td colSpan={5} className="text-center text-white/20 py-8">Click REFRESH to load sessions</td></tr>
                    ) : sessions.map((s) => {
                      const isMultiIP = multiIPUsers.some((u) => u.email === s.email);
                      return (
                        <tr key={s.user_id} className={`border-b border-white/5 hover:bg-white/[0.03] transition-colors ${isMultiIP ? "bg-red-500/[0.05]" : ""}`}>
                          <td className="py-2.5 px-2 text-white/70">{s.email}</td>
                          <td className="py-2.5 px-2 text-white/50">{s.name || "-"}</td>
                          <td className="py-2.5 px-2">
                            <span className={isMultiIP ? "text-red-300 font-medium" : "text-white/50"}>
                              {s.ip_address || "-"}
                            </span>
                            {isMultiIP && (
                              <span className="ml-1.5 text-[10px] text-red-400/70 border border-red-400/20 rounded px-1" style={{ boxShadow: "0 0 6px rgba(248,113,113,0.2)" }}>
                                MULTI
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-white/40">{formatTime(s.last_heartbeat)}</td>
                          <td className="py-2.5 px-2 text-center">
                            <span
                              className={`inline-block w-2 h-2 rounded-full ${s.is_active ? "bg-green-400" : "bg-white/20"}`}
                              style={s.is_active ? { boxShadow: "0 0 6px rgba(74,222,128,0.6)" } : {}}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 활동 로그 테이블 */}
          {tab === "logs" && (
            <div className={cardClass} style={cardShadow} onMouseEnter={glowEnter} onMouseLeave={glowLeave}>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-white/40 border-b border-white/10">
                      <th className="text-left py-2 px-2 font-medium">Time</th>
                      <th className="text-left py-2 px-2 font-medium">Email</th>
                      <th className="text-left py-2 px-2 font-medium">Action</th>
                      <th className="text-left py-2 px-2 font-medium">Description</th>
                      <th className="text-left py-2 px-2 font-medium">IP</th>
                      <th className="text-center py-2 px-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activities.length === 0 ? (
                      <tr><td colSpan={6} className="text-center text-white/20 py-8">Click REFRESH to load activity logs</td></tr>
                    ) : activities.map((a) => (
                      <tr key={a.id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                        <td className="py-2.5 px-2 text-white/30 whitespace-nowrap">{formatTime(a.timestamp)}</td>
                        <td className="py-2.5 px-2 text-white/70 max-w-[150px] truncate">{a.user_email || "-"}</td>
                        <td className="py-2.5 px-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                            a.action === "login" ? "text-blue-300 border-blue-400/20 bg-blue-400/10" :
                            a.action === "register" ? "text-green-300 border-green-400/20 bg-green-400/10" :
                            a.action === "partner_license" ? "text-amber-300 border-amber-400/20 bg-amber-400/10" :
                            a.action === "partner_auth" ? "text-purple-300 border-purple-400/20 bg-purple-400/10" :
                            a.action === "admin_action" ? "text-red-300 border-red-400/20 bg-red-400/10" :
                            "text-white/40 border-white/10 bg-white/5"
                          }`}>
                            {a.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-white/40 max-w-[250px] truncate">{a.description || "-"}</td>
                        <td className="py-2.5 px-2 text-white/30">{a.ip_address || "-"}</td>
                        <td className="py-2.5 px-2 text-center">
                          <span
                            className={`inline-block w-1.5 h-1.5 rounded-full ${a.success ? "bg-green-400" : "bg-red-400"}`}
                            style={{ boxShadow: a.success ? "0 0 6px rgba(74,222,128,0.6)" : "0 0 6px rgba(248,113,113,0.6)" }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
