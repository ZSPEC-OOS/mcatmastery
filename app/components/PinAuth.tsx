"use client";
import { useState } from "react";
import Image from "next/image";

export type PinUser = {
  firstName: string;
  lastName:  string;
  email:     string;
};

export function getCurrentUser(): PinUser | null {
  try {
    const raw = sessionStorage.getItem("pin_current_user");
    return raw ? (JSON.parse(raw) as PinUser) : null;
  } catch { return null; }
}

export function setCurrentUser(user: PinUser) {
  sessionStorage.setItem("pin_current_user", JSON.stringify(user));
}

export function clearCurrentUser() {
  sessionStorage.removeItem("pin_current_user");
  fetch("/api/auth/signout", { method: "POST" }).catch(() => {});
}

type Mode = "login" | "signup" | "welcome";
type Props = { onAuth: (user: PinUser) => void };

export default function PinAuth({ onAuth }: Props) {
  const [mode, setMode]       = useState<Mode>("login");
  const [pin, setPin]         = useState("");
  const [firstName, setFirst] = useState("");
  const [lastName, setLast]   = useState("");
  const [email, setEmail]     = useState("");
  const [pinConfirm, setConfirm] = useState("");
  const [error, setError]     = useState("");
  const [shake, setShake]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [welcome, setWelcome] = useState<PinUser | null>(null);

  function triggerShake(msg: string) {
    setError(msg);
    setShake(true);
    setTimeout(() => setShake(false), 400);
  }

  async function handleLogin() {
    if (!pin) { triggerShake("Enter your PIN."); return; }
    setLoading(true);
    try {
      const res  = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json() as { ok?: boolean; user?: PinUser; error?: string };
      if (!res.ok || !data.user) { triggerShake(data.error ?? "Incorrect PIN. Try again."); setPin(""); return; }
      setCurrentUser(data.user);
      setWelcome(data.user);
      setMode("welcome");
      setTimeout(() => onAuth(data.user!), 1800);
    } catch {
      triggerShake("Connection error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup() {
    if (!firstName.trim() || !lastName.trim()) { triggerShake("Enter your full name."); return; }
    if (!/^\S+@\S+\.\S+$/.test(email))         { triggerShake("Enter a valid email."); return; }
    if (pin.length < 4)                          { triggerShake("PIN must be at least 4 digits."); return; }
    if (pin !== pinConfirm)                      { triggerShake("PINs do not match."); return; }
    setLoading(true);
    try {
      const res  = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, pin }),
      });
      const data = await res.json() as { ok?: boolean; user?: PinUser; error?: string };
      if (!res.ok || !data.user) { triggerShake(data.error ?? "Signup failed. Try again."); return; }
      setCurrentUser(data.user);
      setWelcome(data.user);
      setMode("welcome");
      setTimeout(() => onAuth(data.user!), 2200);
    } catch {
      triggerShake("Connection error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (mode === "welcome" && welcome) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center px-6"
        style={{ background: "var(--bg-primary)" }}>
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: "rgba(27,58,107,0.12)", border: "2px solid var(--accent-blue)" }}>
            <span className="text-2xl font-bold" style={{ color: "var(--accent-blue)" }}>
              {welcome.firstName[0]}{welcome.lastName[0]}
            </span>
          </div>
          <p className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
            {mode === "welcome" && !welcome ? "" : "Welcome back,"}
          </p>
          <p className="text-2xl font-bold" style={{ color: "var(--accent-blue)" }}>
            {welcome.firstName} {welcome.lastName}
          </p>
          <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>{welcome.email}</p>
          <p className="text-xs mt-4" style={{ color: "var(--text-muted)" }}>Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen items-center justify-center px-4"
      style={{ background: "var(--bg-primary)" }}>

      <div className="mb-8">
        <Image src="/logolight.PNG" alt="MCAT Mastery" width={260} height={90} className="logo-light" style={{ objectFit: "contain" }} />
        <Image src="/logodark.PNG"  alt="MCAT Mastery" width={260} height={90} className="logo-dark"  style={{ objectFit: "contain" }} />
      </div>

      <div
        className={`w-full max-w-sm rounded-2xl p-7 space-y-4 ${shake ? "animate-shake" : ""}`}
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <div className="flex rounded-lg overflow-hidden mb-1" style={{ border: "1px solid var(--border)" }}>
          {(["login", "signup"] as const).map((m) => (
            <button key={m} onClick={() => { setMode(m); setError(""); setPin(""); setConfirm(""); }}
              className="flex-1 py-2 text-sm font-semibold"
              style={{
                background: mode === m ? "var(--accent-blue)" : "transparent",
                color: mode === m ? "#fff" : "var(--text-secondary)",
              }}
            >
              {m === "login" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        {error && (
          <p className="text-xs text-center" style={{ color: "#e05c5c" }}>{error}</p>
        )}

        {mode === "login" && (
          <>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="••••"
                className="w-full px-4 py-3 rounded-xl text-lg text-center font-bold tracking-widest"
                style={{ background: "var(--bg-input)", border: `1px solid ${error ? "rgba(224,92,92,0.6)" : "var(--border)"}`, color: "var(--text-primary)", outline: "none" }}
              />
            </div>
            <button onClick={handleLogin} disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold"
              style={{ background: "var(--accent-blue)", color: "#fff", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Signing in…" : "Enter"}
            </button>
          </>
        )}

        {mode === "signup" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>First Name</label>
                <input type="text" value={firstName} onChange={(e) => { setFirst(e.target.value); setError(""); }}
                  placeholder="Jesse" className="w-full px-3 py-2.5 rounded-xl text-sm"
                  style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Last Name</label>
                <input type="text" value={lastName} onChange={(e) => { setLast(e.target.value); setError(""); }}
                  placeholder="Smith" className="w-full px-3 py-2.5 rounded-xl text-sm"
                  style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" }} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Email</label>
              <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }}
                placeholder="you@example.com" className="w-full px-3 py-2.5 rounded-xl text-sm"
                style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" }} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>PIN</label>
              <input type="password" inputMode="numeric" maxLength={6} value={pin}
                onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setError(""); }}
                placeholder="Choose a 4–6 digit PIN" className="w-full px-3 py-2.5 rounded-xl text-sm"
                style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" }} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Confirm PIN</label>
              <input type="password" inputMode="numeric" maxLength={6} value={pinConfirm}
                onChange={(e) => { setConfirm(e.target.value.replace(/\D/g, "")); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleSignup()}
                placeholder="Re-enter PIN" className="w-full px-3 py-2.5 rounded-xl text-sm"
                style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" }} />
            </div>
            <button onClick={handleSignup} disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold"
              style={{ background: "var(--accent-blue)", color: "#fff", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)}
        }
        .animate-shake{animation:shake 0.4s ease}
      `}</style>
    </div>
  );
}
