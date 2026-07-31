"use client";

import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [mode, setMode]         = useState<"login" | "signup">("login");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]         = useState("");
  const [loading, setLoading]   = useState(false);
  const [notice, setNotice]     = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Auth backend not wired yet — show a clear notice
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setNotice(
      mode === "login"
        ? "Auth backend coming soon. For the demo, continue as guest →"
        : "Account created! Auth backend coming soon. Continue as guest →"
    );
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center p-8" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-[380px]">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 border-2 rounded-xl flex items-center justify-center" style={{ borderColor: "#f5c842" }}>
            <span className="text-base font-black" style={{ color: "#f5c842" }}>B</span>
          </div>
          <div>
            <div className="text-base font-bold" style={{ color: "var(--ink)" }}>Bob Comic Studio</div>
            <div className="text-[11px]" style={{ color: "var(--ink-muted)" }}>The AI OS for Visual Storytelling</div>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          {/* Tab toggle */}
          <div className="flex rounded-lg p-1 mb-6 gap-1" style={{ background: "var(--panel)" }}>
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setNotice(null); }}
                className="flex-1 py-1.5 text-[13px] font-semibold rounded-md transition-all"
                style={{
                  cursor: "pointer",
                  background: mode === m ? "var(--surface)" : "transparent",
                  color: mode === m ? "var(--ink)" : "var(--ink-muted)",
                  border: mode === m ? "1px solid var(--border)" : "1px solid transparent",
                }}
              >
                {m === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === "signup" && (
              <div>
                <label className="text-[12px] block mb-1.5 font-medium" style={{ color: "var(--ink-muted)" }}>Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                  className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none transition-colors"
                  style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--ink)" }}
                />
              </div>
            )}
            <div>
              <label className="text-[12px] block mb-1.5 font-medium" style={{ color: "var(--ink-muted)" }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none transition-colors"
                style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--ink)" }}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[12px] font-medium" style={{ color: "var(--ink-muted)" }}>Password</label>
                {mode === "login" && (
                  <button type="button" className="text-[11px] hover:opacity-70" style={{ color: "#f5c842", cursor: "pointer" }}>
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none transition-colors"
                style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--ink)" }}
              />
            </div>

            {notice && (
              <div className="rounded-lg px-3 py-2.5 text-[12px]" style={{ background: "rgba(245,200,66,0.1)", border: "1px solid rgba(245,200,66,0.3)", color: "#f5c842" }}>
                {notice}
                <Link href="/" className="block mt-1 font-bold underline underline-offset-2" style={{ cursor: "pointer" }}>
                  Go to Dashboard →
                </Link>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-sm font-bold rounded-lg transition-all disabled:opacity-50 mt-1"
              style={{ background: "#f5c842", color: "#0d0d0f", cursor: "pointer" }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-[#0d0d0f] border-t-transparent rounded-full animate-spin" />
                  {mode === "login" ? "Signing in…" : "Creating account…"}
                </span>
              ) : mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <span className="text-[11px]" style={{ color: "var(--ink-faint)" }}>or</span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>

          <Link
            href="/"
            className="mt-4 w-full flex items-center justify-center py-2.5 text-sm font-medium rounded-lg transition-all hover:opacity-80"
            style={{ border: "1px solid var(--border)", color: "var(--ink-muted)", cursor: "pointer" }}
          >
            Continue as Guest
          </Link>
        </div>

        <p className="text-center text-[11px] mt-4" style={{ color: "var(--ink-faint)" }}>
          Built for the IBM AI Builders Challenge · July 2025
        </p>
      </div>
    </div>
  );
}
