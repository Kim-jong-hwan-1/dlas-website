"use client";

import { useState, useEffect } from "react";

interface Session {
  user_id: number;
  email: string;
  name: string | null;
  ip_address: string | null;
  current_session_id: string | null;
  last_heartbeat: string | null;
  is_active: boolean;
  created_at: string | null;
}

interface ActivityLog {
  id: number;
  user_id: number | null;
  user_email: string | null;
  action: string;
  description: string | null;
  ip_address: string | null;
  user_agent: string | null;
  timestamp: string | null;
  success: boolean;
}

export default function AdminPanel() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"sessions" | "logs">("sessions");
  const [actionFilter, setActionFilter] = useState("");

  // 세션 데이터 로드
  const loadSessions = async () => {
    try {
      const response = await fetch(
        "https://license-server-697p.onrender.com/admin/user-sessions?limit=100"
      );
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error("Failed to load sessions:", error);
    }
  };

  // 활동 로그 데이터 로드
  const loadActivityLogs = async () => {
    try {
      const url = actionFilter
        ? `https://license-server-697p.onrender.com/admin/activity-logs?action=${actionFilter}&limit=100`
        : "https://license-server-697p.onrender.com/admin/activity-logs?limit=100";

      const response = await fetch(url);
      const data = await response.json();
      setActivities(data.activities || []);
    } catch (error) {
      console.error("Failed to load activity logs:", error);
    }
  };

  // 초기 로드
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadSessions(), loadActivityLogs()]);
      setLoading(false);
    };
    loadData();
  }, []);

  // 필터 변경시 재로드
  useEffect(() => {
    loadActivityLogs();
  }, [actionFilter]);

  // CSV 다운로드
  const downloadSessionsCSV = () => {
    window.open(
      "https://license-server-697p.onrender.com/admin/export-user-sessions",
      "_blank"
    );
  };

  const downloadActivityLogsCSV = () => {
    const url = actionFilter
      ? `https://license-server-697p.onrender.com/admin/export-activity-logs?action=${actionFilter}`
      : "https://license-server-697p.onrender.com/admin/export-activity-logs";
    window.open(url, "_blank");
  };

  // 시간 포맷팅
  const formatTime = (isoString: string | null) => {
    if (!isoString) return "N/A";
    const date = new Date(isoString);
    return date.toLocaleString("ko-KR");
  };

  // 상대 시간 표시
  const getRelativeTime = (isoString: string | null) => {
    if (!isoString) return "N/A";
    const now = new Date();
    const then = new Date(isoString);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "방금 전";
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}시간 전`;
    return `${Math.floor(diffMins / 1440)}일 전`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <section id="admin" className="scroll-mt-[180px] py-20 px-6 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-8">
          사용자 모니터링
        </h2>

        {/* 탭 선택 */}
        <div className="flex gap-4 mb-6 border-b border-gray-300">
          <button
            onClick={() => setActiveTab("sessions")}
            className={`px-6 py-3 font-semibold transition ${
              activeTab === "sessions"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-blue-600"
            }`}
          >
            세션 및 하트비트 ({sessions.length})
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`px-6 py-3 font-semibold transition ${
              activeTab === "logs"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-blue-600"
            }`}
          >
            활동 로그 ({activities.length})
          </button>
        </div>

        {/* 세션 테이블 */}
        {activeTab === "sessions" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <button
                onClick={loadSessions}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                새로고침
              </button>
              <button
                onClick={downloadSessionsCSV}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
              >
                📥 CSV 다운로드
              </button>
            </div>

            <div className="overflow-x-auto bg-white rounded-lg shadow">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left">User ID</th>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">IP Address</th>
                    <th className="px-4 py-3 text-left">Session ID</th>
                    <th className="px-4 py-3 text-left">Last Heartbeat</th>
                    <th className="px-4 py-3 text-center">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr key={session.user_id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">{session.user_id}</td>
                      <td className="px-4 py-3">{session.email}</td>
                      <td className="px-4 py-3">{session.name || "-"}</td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {session.ip_address || "-"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {session.current_session_id
                          ? session.current_session_id.substring(0, 8) + "..."
                          : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div>{formatTime(session.last_heartbeat)}</div>
                        <div className="text-xs text-gray-500">
                          {getRelativeTime(session.last_heartbeat)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {session.is_active ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                            Inactive
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 활동 로그 테이블 */}
        {activeTab === "logs" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <div className="flex gap-2 items-center">
                <button
                  onClick={loadActivityLogs}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                  새로고침
                </button>
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">전체 활동</option>
                  <option value="login">로그인</option>
                  <option value="register">회원가입</option>
                  <option value="logout">로그아웃</option>
                  <option value="heartbeat">하트비트</option>
                </select>
              </div>
              <button
                onClick={downloadActivityLogsCSV}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
              >
                📥 CSV 다운로드
              </button>
            </div>

            <div className="overflow-x-auto bg-white rounded-lg shadow">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left">ID</th>
                    <th className="px-4 py-3 text-left">User Email</th>
                    <th className="px-4 py-3 text-left">Action</th>
                    <th className="px-4 py-3 text-left">Description</th>
                    <th className="px-4 py-3 text-left">IP Address</th>
                    <th className="px-4 py-3 text-left">Timestamp</th>
                    <th className="px-4 py-3 text-center">Success</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">{log.id}</td>
                      <td className="px-4 py-3">{log.user_email || "-"}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">{log.description || "-"}</td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {log.ip_address || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div>{formatTime(log.timestamp)}</div>
                        <div className="text-xs text-gray-500">
                          {getRelativeTime(log.timestamp)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {log.success ? (
                          <span className="text-green-600">✓</span>
                        ) : (
                          <span className="text-red-600">✗</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
