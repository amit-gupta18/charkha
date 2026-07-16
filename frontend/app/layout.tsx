import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthBootstrap } from "@/components/AuthBootstrap";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Voice Expense Tracker",
  description: "Track money the way you talk.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full" style={{ background: "var(--surface)", color: "var(--text-primary)" }}>
        <QueryProvider>
          <AuthBootstrap />
          <AppShell>{children}</AppShell>
        </QueryProvider>
      </body>
    </html>
  );
}
