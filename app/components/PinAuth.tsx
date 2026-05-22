"use client";
import { useState } from "react";
import Image from "next/image";

export type PinUser = {
  firstName: string;
  lastName:  string;
  email:     string;
  pin:       string;
};

const HARDCODED_USERS: PinUser[] = [
  { pin: "5522", firstName: "Jesse", lastName: "Zelazny", email: "jdzelazny@gmail.com" },
];

function getStoredUsers(): PinUser[] {
  try {
    const raw = sessionStorage.getItem("pin_users");
    return raw ? (JSON.parse(raw) as PinUser[]) : HARDCODED_USERS;
  } catch { return HARDCODED_USERS; }
}

function saveUser(user: PinUser) {
  const users = getStoredUsers();
  const exists = users.find((u) => u.pin === user.pin);
  if (!exists) {
    users.push(user);
    sessionStorage.setItem("pin_users", JSON.stringify(users));
  }
}

export function getCurrentUser(): PinUser | null {
  try {
    const raw = sessionStorage.getItem("pin_current_user");
    return raw ? (JSON.parse(raw) as PinUser) : null;
  } catch { return null; }
}

function setCurrentUser(user: PinUser) {
  sessionStorage.setItem("pin_current_user", JSON.stringify(user));
  // Cookie lets server-side requireUser() identify the caller so practice
  // data is scoped per-user rather than shared under the "guest" fallback.
  const uid = user.email.toLowerCase().trim();
  document.cookie = `pin_uid=${encodeURIComponent(uid)}; path=/; SameSite=Lax; max-age=${60 * 60 * 24 * 30}`;
}

export function clearCurrentUser() {
  sessionStorage.removeItem("pin_current_user");
  document.cookie = "pin_uid=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
}

type Mode = "login" | "signup" | "welcome";

type Props = { onAuth: (user: PinUser) => void };

export default function PinAuth({ onAuth }: Props) {
  const [mode, setMode]         = useState<Mode>("login");
  const [pin, setPin]           = useState("");
  const [firstName, setFirst]   = useState("");
  const [lastName, setLast]     = useState("");
  const [email, setEmail]       = useState("");
  const [pinConfirm, setConfirm]= useState("");
  const [error, setError]       = useState("");
  const [shake, setShake]       = useState(false);
  const [welcome, setWelcome]   = useState<PinUser | null>(null);

  function triggerShake(msg: string) {
    setError(msg);
    setShake(true);
    setTimeout(() => setShake(false), 400);
  }

  function handleLogin() {
    const users = getStoredUsers();
    const user = users.find((u) => u.pin === pin);
    if (!user) { triggerShake("Incorrect PIN. Try again."); setPin(""); return; }
    setCurrentUser(user);
    setWelcome(user);
    setMode("welcome");
    setTimeout(() => onAuth(user), 1800);
  }

  function handleSignup() {
    if (!firstName.trim() || !lastName.trim()) { triggerShake("Enter your full name."); return; }
    if (!/^\S+@\S+\.\S+$/.test(email))         { triggerShake("Enter a valid email."); return; }
    if (pin.length < 4)                          { triggerShake("PIN must be 4 digits."); return; }
    if (pin !== pinConfirm)                      { triggerShake("PINs do not match."); return; }
    const users = getStoredUsers();
    if (users.find((u) => u.pin === pin))        { triggerShake("That PIN is already taken."); return; }
    const user: PinUser = { firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), pin };
    saveUser(user);
    setCurrentUser(user);
    setWelcome(user);
    setMode("welcome");
    setTimeout(() => onAuth(user), 2200);
  }

  // Welcome screen
  if (mode === "welcome" && welcome) {
    const isNew = !HARDCODED_USERS.find((u) => u.pin === welcome.pin);
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
          {isNew ? (
            <>
              <p className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                Thank you for registering!
              </p>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Welcome, {welcome.firstName} {welcome.lastName}.
              </p>
            </>
          ) : (
            <>
              <p className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                Welcome back,
              </p>
              <p className="text-2xl font-bold" style={{ color: "var(--accent-blue)" }}>
                {welcome.firstName} {welcome.lastName}
              </p>
              <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>{welcome.email}</p>
            </>
          )}
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
        {/* Tab toggle */}
        <div className="flex rounded-lg overflow-hidden mb-1" style={{ border: "1px solid var(--border)" }}>
          {(["login", "signup"] as const).map((m) => (
            <button key={m} onClick={() => { setMode(m); setError(""); setPin(""); }}
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
            <button onClick={handleLogin}
              className="w-full py-3 rounded-xl text-sm font-semibold"
              style={{ background: "var(--accent-blue)", color: "#fff" }}>
              Enter
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
                placeholder="Choose a PIN" className="w-full px-3 py-2.5 rounded-xl text-sm"
                style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" }} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Re-enter PIN</label>
              <input type="password" inputMode="numeric" maxLength={6} value={pinConfirm}
                onChange={(e) => { setConfirm(e.target.value.replace(/\D/g, "")); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleSignup()}
                placeholder="Confirm PIN" className="w-full px-3 py-2.5 rounded-xl text-sm"
                style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" }} />
            </div>
            <button onClick={handleSignup}
              className="w-full py-3 rounded-xl text-sm font-semibold"
              style={{ background: "var(--accent-blue)", color: "#fff" }}>
              Create Account
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
