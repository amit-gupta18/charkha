"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getRefreshToken } from "@/lib/auth-session";
import { useAuthStore } from "@/stores/auth";
import { apiFetch } from "@/lib/api";
import { broadcastAuthEvent } from "@/lib/sessionSync";

export function LogoutButton() {
  const router = useRouter();
  const clearSession = useAuthStore((s) => s.clearSession);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogout() {
    setIsSubmitting(true);

    try {
      const refreshToken = getRefreshToken();
      await apiFetch("/api/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      });
    } finally {
      broadcastAuthEvent("logout");
      clearSession();
      router.replace("/login");
      router.refresh();
      setIsSubmitting(false);
    }
  }

  return (
    <button
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "8px 12px",
        borderRadius: 9,
        background: "transparent",
        border: "1.5px solid var(--border)",
        color: "var(--text-muted)",
        fontSize: "0.8rem",
        fontWeight: 500,
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "background 0.15s",
      }}
      type="button"
      onClick={handleLogout}
      disabled={isSubmitting}
      onMouseEnter={e => (e.currentTarget.style.background = "var(--parchment)")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
    >
      <span>↩</span>{isSubmitting ? "Signing out..." : "Log out"}
    </button>
  );
}
