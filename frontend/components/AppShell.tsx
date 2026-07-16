"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { MobileHeader } from "@/components/MobileHeader";

const PUBLIC_PATHS = new Set(["/", "/login", "/signup"]);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.has(pathname);

  return (
    <div className="app-shell">
      {!isPublic && <Sidebar />}
      <div className={isPublic ? "app-main-public" : "app-main-column"}>
        {!isPublic && <MobileHeader />}
        <main className={isPublic ? "app-main-public" : "app-main"}>{children}</main>
      </div>
      {!isPublic && <MobileNav />}
    </div>
  );
}
