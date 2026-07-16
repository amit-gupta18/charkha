export const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: "⊞", shortLabel: "Home" },
  { href: "/expenses", label: "Expenses", icon: "📋", shortLabel: "Spend" },
  { href: "/weekly", label: "Weekly", icon: "📅", shortLabel: "Week" },
  { href: "/monthly", label: "Monthly", icon: "📈", shortLabel: "Month" },
  { href: "/income", label: "Income", icon: "💰", shortLabel: "Income" },
  { href: "/savings", label: "Savings", icon: "🏦", shortLabel: "Save" },
  { href: "/splits", label: "Splits", icon: "🤝", shortLabel: "Split" },
  { href: "/lending", label: "Lending", icon: "📤", shortLabel: "Lend" },
  { href: "/knowledge", label: "Knowledge", icon: "🧠", shortLabel: "Learn" },
  { href: "/settings", label: "Settings", icon: "⚙️", shortLabel: "Settings" },
] as const;

export const MOBILE_NAV_LINKS = NAV_LINKS.filter((link) =>
  ["/dashboard", "/expenses", "/weekly", "/savings", "/settings"].includes(link.href),
);

export function isNavActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
}
