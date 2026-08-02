"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const supabase = createClient();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setErr(null);
    // Role is hard-locked to candidate. Admins are provisioned via SQL/dashboard.
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName, role: "candidate" } },
    });
    if (error) { setLoading(false); return setErr(error.message); }
    setLoading(false);
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <>
      <header className="sticky top-0 z-30 backdrop-blur bg-zinc-950/60 border-b border-white/5">
        <nav className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-xl">
            <span>🔥</span>
            <span className="bg-gradient-to-r from-orange-400 to-red-600 bg-clip-text text-transparent">AssOnFire</span>
          </Link>
          <Link href="/login" className="text-sm text-zinc-400 hover:text-white transition">Sign in</Link>
        </nav>
      </header>
      <main className="max-w-md mx-auto px-6 py-16">
        <h1 className="text-2xl font-bold">Create candidate account</h1>
        <p className="text-sm text-zinc-400 mt-1">Already invited? Use the email your administrator sent invites to.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Full name</label>
            <input className="input" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Email</label>
            <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Password</label>
            <input className="input" type="password" placeholder="Password (min 6)" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
          </div>
          {err && <p className="text-sm text-red-400 bg-red-950/50 border border-red-800/50 rounded-lg px-3 py-2">{err}</p>}
          <button className="btn w-full justify-center" disabled={loading}>{loading ? "Creating…" : "Sign up"}</button>
        </form>
        <p className="mt-4 text-sm text-zinc-400">Already have an account? <Link href="/login" className="underline">Sign in</Link></p>
      </main>
    </>
  );
}
