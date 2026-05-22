"use client";
import { useState, useEffect } from "react";
import PinAuth, { getCurrentUser, setCurrentUser, type PinUser } from "./PinAuth";

export default function PinGate({ children }: { children: React.ReactNode }) {
  const [user, setUser]   = useState<PinUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = getCurrentUser();
    if (stored) {
      setUser(stored);
      setReady(true);
      return;
    }
    // sessionStorage is empty (new tab, cleared cache, etc.) but the
    // pin_uid cookie may still be valid — check the server.
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d: { user: PinUser | null }) => {
        if (d.user) {
          setCurrentUser(d.user);
          setUser(d.user);
        }
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  if (!ready) return null;
  if (!user)  return <PinAuth onAuth={(u) => setUser(u)} />;
  return <>{children}</>;
}
