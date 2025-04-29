
import { useState, useEffect } from "react";

export function useUser() {
  const [user, setUser] = useState<{ email: string, isAdmin: boolean } | null>(null);

  useEffect(() => {
    const email = localStorage.getItem('email');
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    if (email) {
      setUser({ email, isAdmin });
    }
  }, []);

  return { user, setUser };
}
