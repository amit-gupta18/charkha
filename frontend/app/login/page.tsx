import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,_#020617_0%,_#111827_100%)] px-6 py-12">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/30 backdrop-blur">
        <div className="mb-8 space-y-2 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/80">Voice Expense Tracker</p>
          <h1 className="text-3xl font-semibold text-white">Log in</h1>
          <p className="text-sm text-zinc-300">Use your email and password to continue.</p>
        </div>

        <LoginForm />

        <p className="mt-6 text-center text-sm text-zinc-400">
          No account yet? {" "}
          <Link className="font-medium text-cyan-300 hover:text-cyan-200" href="/signup">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
