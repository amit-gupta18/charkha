"use client";

import type { ReactNode } from "react";

type PageShellProps = {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  maxWidth?: number;
};

export function PageShell({ title, subtitle, badge, actions, children, maxWidth = 960 }: PageShellProps) {
  return (
    <div style={{ padding: "28px 32px", maxWidth, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, gap: 16, flexWrap: "wrap" }}>
        <div>
          {subtitle && (
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {subtitle}
            </p>
          )}
          <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--text-primary)", margin: subtitle ? "4px 0 0" : 0 }}>
            {title}
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {badge}
          {actions}
        </div>
      </div>
      {children}
    </div>
  );
}

export function PageCard({ children, style, id }: { children: ReactNode; style?: React.CSSProperties; id?: string }) {
  return (
    <div
      id={id}
      className="card"
      style={{ padding: "18px 22px", marginBottom: 20, boxShadow: "var(--shadow-sm)", ...style }}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
      <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>{children}</p>
      {action}
    </div>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
      {children}
    </p>
  );
}

export function Alert({ type, children }: { type: "error" | "success"; children: ReactNode }) {
  const colors =
    type === "error"
      ? { bg: "var(--red-light)", border: "var(--red)", text: "var(--red)" }
      : { bg: "var(--green-light)", border: "var(--green)", text: "var(--green)" };
  return (
    <div
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: "var(--radius-sm)",
        padding: "10px 14px",
        fontSize: "0.85rem",
        color: colors.text,
        marginBottom: 16,
      }}
    >
      {children}
    </div>
  );
}

export function PageLoading({ message = "Loading..." }: { message?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
      <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>{message}</p>
    </div>
  );
}
