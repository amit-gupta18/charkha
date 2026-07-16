"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { broadcastAuthEvent } from "@/lib/sessionSync";
import { useAuthStore } from "@/stores/auth";
import type { AuthResponse } from "@/lib/types";
import { Alert, FieldLabel } from "@/components/ui/PageShell";

export function LoginForm() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const data = await apiFetch<AuthResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      setSession({
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
      broadcastAuthEvent("login");
      router.replace("/dashboard");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to log in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <FieldLabel>Email</FieldLabel>
        <input
          className="cream-input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />
      </div>
      <div>
        <FieldLabel>Password</FieldLabel>
        <input
          className="cream-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          required
        />
      </div>
      {error ? <Alert type="error">{error}</Alert> : null}
      <button className="btn-accent" type="submit" disabled={isSubmitting} style={{ width: "100%" }}>
        {isSubmitting ? "Logging in..." : "Log in"}
      </button>
    </form>
  );
}
