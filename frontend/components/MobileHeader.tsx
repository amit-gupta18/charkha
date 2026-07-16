"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { isNavActive, NAV_LINKS } from "@/lib/nav-links";

export function MobileHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (pathname === "/" || pathname === "/login" || pathname === "/signup") return null;

  return (
    <>
      <header className="mobile-header">
        <div className="mobile-header-brand">
          <div className="sidebar-logo">🎤</div>
          <div>
            <p className="sidebar-brand-kicker">VOICE</p>
            <p className="sidebar-brand-title">Expense Tracker</p>
          </div>
        </div>
        <button
          type="button"
          className="mobile-menu-btn"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="mobile-menu-icon" aria-hidden />
        </button>
      </header>

      {open && (
        <div className="mobile-drawer-backdrop" onClick={() => setOpen(false)} aria-hidden />
      )}

      <aside className={`mobile-drawer${open ? " is-open" : ""}`} aria-hidden={!open}>
        <div className="mobile-drawer-head">
          <p className="mobile-drawer-title">Menu</p>
          <button type="button" className="mobile-drawer-close" onClick={() => setOpen(false)} aria-label="Close menu">
            ×
          </button>
        </div>
        <nav className="mobile-drawer-nav" aria-label="All pages">
          {NAV_LINKS.map((link) => {
            const active = isNavActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`mobile-drawer-link${active ? " is-active" : ""}`}
                onClick={() => setOpen(false)}
              >
                <span className="mobile-drawer-link-icon">{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="mobile-drawer-footer">
          <LogoutButton />
        </div>
      </aside>
    </>
  );
}
