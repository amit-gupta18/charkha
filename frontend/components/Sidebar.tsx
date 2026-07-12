"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: "⊞" },
  { href: "/expenses",  label: "Expenses",  icon: "📋" },
  { href: "/weekly",    label: "Weekly",    icon: "📅" },
  { href: "/monthly",   label: "Monthly",   icon: "📈" },
  { href: "/income",    label: "Income",    icon: "💰" },
  { href: "/splits",    label: "Splits",    icon: "🤝" },
  { href: "/lending",   label: "Lending",   icon: "📤" },
  { href: "/knowledge", label: "Knowledge", icon: "🧠" },
  { href: "/settings",  label: "Settings",  icon: "⚙️" },
];

export function Sidebar() {
  const pathname = usePathname();

  if (pathname === "/" || pathname === "/login" || pathname === "/signup") return null;

  return (
    <aside className="app-sidebar">
      {/* Logo */}
      <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: "var(--accent)", display: "flex",
            alignItems: "center", justifyContent: "center",
            fontSize: "1rem", color: "#fff", flexShrink: 0,
          }}>🎤</div>
          <div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500, lineHeight: 1 }}>VOICE</p>
            <p style={{ fontSize: "0.85rem", color: "var(--text-primary)", fontWeight: 700, lineHeight: 1.2 }}>Expense Tracker</p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
        {LINKS.map((link) => {
          const active = link.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 12px",
                borderRadius: 9,
                fontSize: "0.875rem",
                fontWeight: active ? 600 : 500,
                color: active ? "var(--accent)" : "var(--text-secondary)",
                background: active ? "var(--parchment)" : "transparent",
                borderLeft: active ? "3px solid var(--accent)" : "3px solid transparent",
                transition: "all 0.15s",
                textDecoration: "none",
              }}
            >
              <span style={{ fontSize: "1rem", width: 20, textAlign: "center" }}>{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: "16px 14px", borderTop: "1px solid var(--border)" }}>
        <LogoutButton />
      </div>
    </aside>
  );
}
