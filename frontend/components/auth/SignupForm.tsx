"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { apiFetch } from "@/lib/api";
import type { AuthResponse } from "@/lib/types";

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
      router.replace("/");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create account.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <label className="block space-y-2 text-sm text-zinc-200">
        <span>Name</span>
        <input
          className="w-full rounded-2xl border border-white/10 bg-zinc-950/70 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Amit"
          required
        />
      </label>

      <label className="block space-y-2 text-sm text-zinc-200">
        <span>Email</span>
        <input
          className="w-full rounded-2xl border border-white/10 bg-zinc-950/70 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
        />
      </label>

      <label className="block space-y-2 text-sm text-zinc-200">
        <span>Password</span>
        <input
          className="w-full rounded-2xl border border-white/10 bg-zinc-950/70 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 6 characters"
          minLength={6}
          required
        />
      </label>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <button
        className="w-full rounded-2xl bg-cyan-400 px-4 py-3 font-medium text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
