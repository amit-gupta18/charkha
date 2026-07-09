import Link from "next/link";

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--surface)", fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Top nav ── */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 48px", borderBottom: "1px solid var(--border)", background: "var(--cream)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.95rem" }}>🎤</div>
          <span style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>Expense Tracker</span>
        </div>
        <nav style={{ display: "flex", gap: 8 }}>
          <Link href="/login" style={{ padding: "8px 18px", borderRadius: 8, border: "1.5px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontWeight: 500, fontSize: "0.875rem", cursor: "pointer" }}>Log in</Link>
          <Link href="/signup" style={{ padding: "8px 20px", borderRadius: 8, background: "var(--accent)", color: "#fff", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer" }}>Get started →</Link>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section style={{ textAlign: "center", padding: "80px 24px 60px", background: "var(--cream)" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--parchment)", border: "1px solid var(--border)", borderRadius: 99, padding: "5px 14px", marginBottom: 24 }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Voice-first personal finance</span>
        </div>
        <h1 style={{ fontSize: "clamp(2.2rem, 5vw, 3.6rem)", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.15, maxWidth: 700, margin: "0 auto 20px" }}>
          Track money the<br />way you talk.
        </h1>
        <p style={{ fontSize: "1.1rem", color: "var(--text-muted)", maxWidth: 520, margin: "0 auto 36px", lineHeight: 1.6 }}>
          Just speak — <em>"I spent ₹249 on Swiggy UPI"</em> — and your AI agent logs it instantly. No forms. No friction. Just your voice.
        </p>

        {/* Fake mic UI demo */}
        <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 18, padding: "28px 40px", marginBottom: 36, boxShadow: "0 4px 20px rgba(90,70,50,0.10)" }}>
          <div style={{ display: "flex", gap: 28, marginBottom: 24 }}>
            {[{ label: "Today", val: "₹24" }, { label: "This week", val: "₹312" }, { label: "This month", val: "₹1,248" }].map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</p>
                <p style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text-primary)" }}>{s.val}</p>
              </div>
            ))}
          </div>
          <div style={{ width: 68, height: 68, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem", boxShadow: "0 0 0 12px rgba(200,98,42,0.12)", cursor: "pointer" }}>🎤</div>
          <p style={{ marginTop: 14, fontSize: "0.82rem", color: "var(--text-muted)" }}>Tap and speak your expense</p>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 14 }}>
          <Link href="/signup" style={{ padding: "12px 28px", borderRadius: 10, background: "var(--accent)", color: "#fff", fontWeight: 700, fontSize: "1rem", display: "inline-block" }}>Start tracking free →</Link>
          <Link href="/login"  style={{ padding: "12px 24px", borderRadius: 10, border: "1.5px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontWeight: 500, fontSize: "1rem", display: "inline-block" }}>Log in</Link>
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ padding: "64px 48px", maxWidth: 1000, margin: "0 auto" }}>
        <p style={{ textAlign: "center", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 40 }}>EVERYTHING YOU NEED</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18 }}>
          {[
            { icon: "🎤", title: "Voice Logging",            desc: "Speak any expense in natural language. Your AI agent parses it, you just confirm." },
            { icon: "📊", title: "Need / Want / Saving Split", desc: "Every expense maps to Ankur Warikoo's framework. See exactly how you spend." },
            { icon: "📅", title: "Weekly & Monthly Insights", desc: "Week-by-week spend rhythm and monthly category breakdowns with beautiful charts." },
            { icon: "🧠", title: "Knowledge Base",           desc: "Save finance lessons from videos, articles or your own thinking. Build your money brain." },
            { icon: "🪙", title: "Coin Score",               desc: "Spend on wants = lose coins. Log knowledge = earn coins. Gamify your financial literacy." },
            { icon: "⚡", title: "Instant Dashboard",        desc: "Stats update the moment you confirm a log. Watch your numbers move in real time." },
          ].map(f => (
            <div key={f.title} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: "22px 24px", boxShadow: "var(--shadow-sm)" }}>
              <div style={{ fontSize: "1.6rem", marginBottom: 12 }}>{f.icon}</div>
              <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)", marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: "var(--cream)", borderTop: "1px solid var(--border)", padding: "60px 24px", textAlign: "center" }}>
        <h2 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: 14 }}>Ready to take money tracking further?</h2>
        <p style={{ fontSize: "1rem", color: "var(--text-muted)", marginBottom: 28 }}>Free forever for personal use.</p>
        <Link href="/signup" style={{ padding: "13px 32px", borderRadius: 10, background: "var(--accent)", color: "#fff", fontWeight: 700, fontSize: "1rem", display: "inline-block" }}>Get started →</Link>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: "1px solid var(--border)", padding: "20px 48px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--surface)" }}>
        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>© 2025 Voice Expense Tracker</span>
        <div style={{ display: "flex", gap: 20 }}>
          {["Privacy", "Terms", "Contact"].map(t => <a key={t} href="#" style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{t}</a>)}
        </div>
      </footer>
    </div>
  );
}
