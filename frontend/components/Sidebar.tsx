"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { isNavActive, NAV_LINKS } from "@/lib/nav-links";

export function Sidebar() {
  const pathname = usePathname();

  if (pathname === "/" || pathname === "/login" || pathname === "/signup") return null;

  return (
    <aside className="app-sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-inner">
          <div className="sidebar-logo">🎤</div>
          <div>
            <p className="sidebar-brand-kicker">VOICE</p>
            <p className="sidebar-brand-title">Expense Tracker</p>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV_LINKS.map((link) => {
          const active = isNavActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`sidebar-link${active ? " is-active" : ""}`}
            >
              <span className="sidebar-link-icon">{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <LogoutButton />
      </div>
    </aside>
  );
}
