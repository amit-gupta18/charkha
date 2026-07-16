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
  const completeLogin = useAuthStore((s) => s.completeLogin);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await apiFetch<AuthResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      await completeLogin();
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
