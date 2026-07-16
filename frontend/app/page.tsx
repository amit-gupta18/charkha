import Link from "next/link";

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--surface)", fontFamily: "'Inter', system-ui, sans-serif" }}>

      <header className="landing-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.95rem" }}>🎤</div>
          <span style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>Expense Tracker</span>
        </div>
        <nav className="landing-nav">
          <Link href="/login" className="btn-ghost" style={{ padding: "8px 18px", fontSize: "0.875rem", textDecoration: "none" }}>Log in</Link>
          <Link href="/signup" className="btn-accent" style={{ padding: "8px 20px", fontSize: "0.875rem", textDecoration: "none" }}>Get started →</Link>
        </nav>
      </header>

      <section style={{ textAlign: "center", padding: "80px 24px 60px", background: "var(--cream)" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--parchment)", border: "1px solid var(--border)", borderRadius: 99, padding: "5px 14px", marginBottom: 24 }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Voice-first personal finance</span>
        </div>
        <h1 style={{ fontSize: "clamp(2.2rem, 5vw, 3.6rem)", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.15, maxWidth: 700, margin: "0 auto 20px" }}>
          Track money the<br />way you talk.
        </h1>
        <p style={{ fontSize: "1.1rem", color: "var(--text-muted)", maxWidth: 520, margin: "0 auto 36px", lineHeight: 1.6 }}>
          Just speak — <em>&quot;I spent ₹249 on Swiggy UPI&quot;</em> — and your AI agent logs it instantly. No forms. No friction. Just your voice.
        </p>

        <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 18, padding: "28px 40px", marginBottom: 36, boxShadow: "var(--shadow-md)", maxWidth: "calc(100vw - 32px)" }}>
          <div className="landing-hero-stats">
            {[{ label: "Today", val: "₹249" }, { label: "This week", val: "₹1,840" }, { label: "This month", val: "₹8,420" }].map((s) => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</p>
                <p style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text-primary)" }}>{s.val}</p>
              </div>
            ))}
          </div>
          <div className="mic-btn" style={{ width: 68, height: 68, fontSize: "1.6rem", boxShadow: "0 0 0 12px rgba(200,98,42,0.12)" }}>🎤</div>
          <p style={{ marginTop: 14, fontSize: "0.82rem", color: "var(--text-muted)" }}>Tap and speak your expense</p>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
          <Link href="/signup" className="btn-accent" style={{ padding: "12px 28px", fontSize: "1rem", textDecoration: "none" }}>Start tracking free →</Link>
          <Link href="/login" className="btn-ghost" style={{ padding: "12px 24px", fontSize: "1rem", textDecoration: "none" }}>Log in</Link>
        </div>
      </section>

      <section className="landing-section">
        <p style={{ textAlign: "center", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 40 }}>Everything you need</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18 }}>
          {[
            { icon: "🎤", title: "Voice Logging", desc: "Speak any expense in natural language. Your AI agent parses it, you just confirm." },
            { icon: "📊", title: "Need / Want / Saving", desc: "Every expense maps to Ankur Warikoo's framework. See exactly how you spend." },
            { icon: "📅", title: "Weekly & Monthly", desc: "Week-by-week spend rhythm and monthly category breakdowns." },
            { icon: "🧠", title: "Knowledge Base", desc: "Save finance lessons and build your own money brain over time." },
            { icon: "🪙", title: "Coin Score", desc: "Spend on wants = lose coins. Log knowledge = earn coins." },
            { icon: "⚡", title: "Live Dashboard", desc: "Stats update the moment you confirm a log." },
          ].map((f) => (
            <div key={f.title} className="card" style={{ padding: "22px 24px" }}>
              <div style={{ fontSize: "1.6rem", marginBottom: 12 }}>{f.icon}</div>
              <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)", marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ background: "var(--cream)", borderTop: "1px solid var(--border)", padding: "60px 24px", textAlign: "center" }}>
        <h2 style={{ fontSize: "clamp(1.4rem, 4vw, 1.8rem)", fontWeight: 800, color: "var(--text-primary)", marginBottom: 14 }}>Ready to take control of your money?</h2>
        <p style={{ fontSize: "1rem", color: "var(--text-muted)", marginBottom: 28 }}>Free forever for personal use.</p>
        <Link href="/signup" className="btn-accent" style={{ padding: "13px 32px", fontSize: "1rem", textDecoration: "none" }}>Get started →</Link>
      </section>

      <footer className="landing-footer">
        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>© 2026 Voice Expense Tracker</span>
      </footer>
    </div>
  );
}
