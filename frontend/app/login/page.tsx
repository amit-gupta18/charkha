import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
      {/* ── Left panel — branding ── */}
      <div style={{ background: "var(--cream)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "60px 48px" }}>
        <div style={{ maxWidth: 380, width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 48 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>🎤</div>
            <span style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>Expense Tracker</span>
          </div>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.2, marginBottom: 14 }}>
            Track money<br />the way you talk.
          </h2>
          <p style={{ fontSize: "0.95rem", color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 36 }}>
            Just speak your expense. Your AI agent parses it, you confirm. No forms, no friction.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {["🎤 Voice logging — just say it", "📊 Need / Want / Saving split", "🪙 Coin system to stay sharp"].map(f => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.875rem", color: "var(--text-secondary)", fontWeight: 500 }}>{f}</div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "60px 48px", background: "var(--surface)" }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: 6 }}>Welcome back</h1>
          <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: 28 }}>Use your email and password to continue.</p>
          <LoginForm />
          <p style={{ marginTop: 20, textAlign: "center", fontSize: "0.85rem", color: "var(--text-muted)" }}>
            No account?{" "}
            <Link href="/signup" style={{ color: "var(--accent)", fontWeight: 600 }}>Create one →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
