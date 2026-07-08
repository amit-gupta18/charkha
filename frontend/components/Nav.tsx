"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/log", label: "Log" },
  { href: "/expenses", label: "Expenses" },
  { href: "/weekly", label: "Weekly" },
  { href: "/monthly", label: "Monthly" },
  { href: "/income", label: "Income" },
  { href: "/knowledge", label: "Knowledge" },
  { href: "/settings", label: "Settings" },
];

export function Nav() {
  const pathname = usePathname();

  if (pathname === "/login" || pathname === "/signup") {
    return null;
  }

  return (
    <nav className="sticky top-0 z-20 border-b border-white/10 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-2 overflow-x-auto px-4 py-3">
        {LINKS.map((link) => {
          const active =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition ${
                active
                  ? "bg-cyan-400/20 text-cyan-200"
                  : "text-zinc-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
        <div className="ml-auto pl-2">
          <LogoutButton />
        </div>
      </div>
    </nav>
  );
}
