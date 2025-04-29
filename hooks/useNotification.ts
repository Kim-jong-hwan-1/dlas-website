// hooks/useNotification.ts

import { useEffect, useState } from "react";

export function useNotification() {
  const [notifications, setNotifications] = useState<string[]>([]);

  useEffect(() => {
    const ws = new WebSocket('ws://127.0.0.1:8000/ws/notifications');
    ws.onmessage = (event) => {
      setNotifications(prev => [...prev, event.data]);
    };
    return () => ws.close();
  }, []);

  return notifications;
}
