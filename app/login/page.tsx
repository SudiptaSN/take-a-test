"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
function LoginInner() {
  const supabase = createClient();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setErr(error.message);
    router.push(next);
    router.refresh();
  };

  return (
    <main className="max-w-md mx-auto px-6 py-16">
      <h1 className="text-2xl font-bold">Sign in</h1>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Email</label>
          <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Password</label>
          <input className="input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {err && <p className="text-sm text-red-400 bg-red-950/50 border border-red-800/50 rounded-lg px-3 py-2">{err}</p>}
        <button className="btn w-full justify-center" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
      </form>
      <p className="mt-4 text-sm text-zinc-400">No account? <Link href="/signup" className="underline">Sign up</Link></p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <>
      <header className="sticky top-0 z-30 backdrop-blur bg-zinc-950/60 border-b border-white/5">
        <nav className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-xl">
            <span>🔥</span>
            <span className="bg-gradient-to-r from-orange-400 to-red-600 bg-clip-text text-transparent">AssOnFire</span>
          </Link>
          <Link href="/signup" className="text-sm text-zinc-400 hover:text-white transition">Sign up</Link>
        </nav>
      </header>
      <Suspense fallback={<main className="p-10">Loading…</main>}>
        <LoginInner />
      </Suspense>
    </>
  );
}
