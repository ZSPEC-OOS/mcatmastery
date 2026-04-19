"use client";
import { useState, useEffect } from "react";
import PinAuth, { getCurrentUser, type PinUser } from "./PinAuth";

export default function PinGate({ children }: { children: React.ReactNode }) {
  const [user, setUser]   = useState<PinUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUser(getCurrentUser());
    setReady(true);
  }, []);

  if (!ready) return null;
  if (!user)  return <PinAuth onAuth={(u) => setUser(u)} />;
  return <>{children}</>;
}
