import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Voice Expense Tracker",
  description: "Track money the way you talk.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full" style={{ background: "var(--surface)", color: "var(--text-primary)" }}>
        <AuthProvider>
          <div className="app-shell">
            <Sidebar />
            <main className="app-main">
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
