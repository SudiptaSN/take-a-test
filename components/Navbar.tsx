import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function Navbar() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  let role = null;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    role = profile?.role;
  }

  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-zinc-950/60 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-xl">🔥</span>
          <span className="text-lg font-black tracking-tight bg-gradient-to-r from-orange-400 to-red-600 bg-clip-text text-transparent">
            AssOnFire
          </span>
          <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 border border-red-500/20 ml-2">
            UR-COOKED
          </span>
        </Link>

        <nav className="flex items-center gap-6 text-sm font-medium">
          {user ? (
            <>
              {role === 'admin' && (
                <Link href="/admin" className="text-zinc-400 hover:text-zinc-100 transition-colors">
                  Admin Dashboard
                </Link>
              )}
              {role === 'candidate' && (
                <Link href="/dashboard" className="text-zinc-400 hover:text-zinc-100 transition-colors">
                  My Dashboard
                </Link>
              )}
              <form action="/auth/signout" method="post">
                <button type="submit" className="text-zinc-400 hover:text-zinc-100 transition-colors">
                  Sign Out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-zinc-400 hover:text-zinc-100 transition-colors">
                Sign in
              </Link>
              <Link href="/signup" className="btn px-4 py-2 rounded-lg">
                Get started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
