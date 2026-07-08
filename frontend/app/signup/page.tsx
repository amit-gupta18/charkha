import Link from "next/link";
import { SignupForm } from "@/components/auth/SignupForm";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,_#0f172a_0%,_#111827_100%)] px-6 py-12">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/30 backdrop-blur">
        <div className="mb-8 space-y-2 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/80">Voice Expense Tracker</p>
          <h1 className="text-3xl font-semibold text-white">Create account</h1>
          <p className="text-sm text-zinc-300">Start with a secure cookie-based session.</p>
        </div>

        <SignupForm />

        <p className="mt-6 text-center text-sm text-zinc-400">
          Already registered? {" "}
          <Link className="font-medium text-cyan-300 hover:text-cyan-200" href="/login">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
