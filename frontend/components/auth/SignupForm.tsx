"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { apiFetch } from "@/lib/api";
import { broadcastAuthEvent } from "@/lib/sessionSync";
import type { AuthResponse } from "@/lib/types";
import { Alert, FieldLabel } from "@/components/ui/PageShell";

export function SignupForm() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const data = await apiFetch<AuthResponse>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });

      setUser(data.user);
      broadcastAuthEvent("login");
      router.replace("/dashboard");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create account.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <FieldLabel>Name</FieldLabel>
        <input
          className="cream-input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          required
        />
      </div>
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
          placeholder="At least 6 characters"
          minLength={6}
          required
        />
      </div>
      {error ? <Alert type="error">{error}</Alert> : null}
      <button className="btn-accent" type="submit" disabled={isSubmitting} style={{ width: "100%" }}>
        {isSubmitting ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
