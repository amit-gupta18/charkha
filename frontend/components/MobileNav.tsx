"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavActive, MOBILE_NAV_LINKS } from "@/lib/nav-links";

export function MobileNav() {
  const pathname = usePathname();

  if (pathname === "/" || pathname === "/login" || pathname === "/signup") return null;

  return (
    <nav className="mobile-nav" aria-label="Main navigation">
      {MOBILE_NAV_LINKS.map((link) => {
        const active = isNavActive(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`mobile-nav-link${active ? " is-active" : ""}`}
          >
            <span className="mobile-nav-icon">{link.icon}</span>
            <span className="mobile-nav-label">{link.shortLabel}</span>
          </Link>
        );
      })}
    </nav>
  );
}
