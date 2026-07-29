import Link from "next/link";

const features = [
  {
    title: "Hardcore Proctoring",
    body: "Forced fullscreen, clipboard block, tab-switch detection, periodic webcam snapshots, auto-submit on violations. We catch everything.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.5h16.5v9.75H3.75zM8.25 19.5h7.5M12 14.25v5.25" />
    ),
  },
  {
    title: "Absolute Lockdown",
    body: "One-click Safe Exam Browser config. Server verifies the BEK hash so only SEB can load the exam. Zero workarounds.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75M5.25 10.5h13.5v9.75H5.25z" />
    ),
  },
  {
    title: "Wall of Flame",
    body: "Gamify your exams with public leaderboards. Ranked by score, tie-broken by speed. Make your candidates sweat.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
    ),
  },
  {
    title: "Bulletproof Grading",
    body: "Correct answers live in an admin-only RLS-isolated table. Candidates can't query them — even with crafted API calls.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    ),
  },
  {
    title: "AI Import Ready",
    body: "Generate bulk questions using NotebookLM or ChatGPT and paste them right in using our built-in CSV parser.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    ),
  },
  {
    title: "AI Roasts",
    body: "Finish the exam and get utterly destroyed by our AI. It reads your wrong answers and roasts you mercilessly before explaining what you missed.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
    ),
  },
];

const Icon = ({ d }: { d: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
    {d}
  </svg>
);

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
      {/* Background: dotted grid + radial glow */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-grid [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[700px] bg-radial-glow" />

      {/* Nav */}
      <header className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/60 border-b border-white/5">
        <nav className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-xl">
            <span>🔥</span>
            <span className="bg-gradient-to-r from-orange-400 to-red-600 bg-clip-text text-transparent">AssOnFire</span>
            <span className="ml-1.5 text-[10px] uppercase tracking-wider text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded bg-red-500/10">v1.0</span>
          </Link>
          <div className="flex items-center gap-1 text-sm">
            <Link href="/login" className="px-3 py-1.5 rounded-md hover:bg-white/5 text-zinc-300 hover:text-white transition">Sign in</Link>
            <Link href="/signup" className="ml-2 px-3 py-1.5 rounded-md bg-white text-zinc-900 font-medium hover:bg-zinc-200 transition">
              Get started
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <main className="max-w-6xl mx-auto px-6">
        <section className="pt-24 pb-20 text-center">
          <h1 className="mt-6 text-5xl md:text-7xl font-bold tracking-tight leading-[1.05]">
            Proctored exams,
            <br />
            <span className="bg-gradient-to-r from-orange-400 via-red-500 to-rose-600 bg-clip-text text-transparent">
              that don't mess around.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl mx-auto text-lg text-zinc-400 leading-relaxed">
            The definitive battleground. Survive the hardcore proctoring, climb the Wall of Flame, and try not to get absolutely roasted by the AI.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link href="/signup"
                  className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold px-6 py-3 hover:scale-105 transition-transform shadow-[0_0_20px_rgba(239,68,68,0.4)]">
              Ignite a test
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </section>

        {/* Visual Break instead of terminal code */}
        <section className="pb-24">
          <div className="mx-auto max-w-5xl rounded-3xl border border-red-500/20 bg-zinc-900/50 backdrop-blur-md p-10 flex flex-col items-center text-center shadow-[0_0_80px_rgba(220,38,38,0.1)] relative overflow-hidden">
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-orange-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
            
            <h2 className="text-3xl font-bold tracking-tight text-white mb-4">Rankings that spark competition.</h2>
            <p className="text-zinc-400 max-w-xl mb-8">
              Enable the "Wall of Flame" to let candidates fight for the top spot. Fast times and perfect scores rule the leaderboard.
            </p>
            
            <div className="w-full max-w-2xl bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 shadow-2xl relative z-10">
              <div className="flex justify-between items-center px-4 py-3 border-b border-zinc-800">
                <span className="font-bold text-zinc-500">Rank</span>
                <span className="font-bold text-zinc-500 text-right">Score</span>
              </div>
              <div className="flex justify-between items-center px-4 py-4 border-b border-zinc-800/50 bg-zinc-900/50 rounded-lg mt-2">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🥇</span>
                  <span className="font-bold text-white">SudiptaSN</span>
                </div>
                <div className="text-right">
                  <span className="block font-bold text-orange-500">100 pts</span>
                  <span className="text-xs text-zinc-500">12m 04s</span>
                </div>
              </div>
              <div className="flex justify-between items-center px-4 py-4 border-b border-zinc-800/50">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🥈</span>
                  <span className="font-bold text-zinc-200">Anonymous</span>
                </div>
                <div className="text-right">
                  <span className="block font-bold text-orange-500">95 pts</span>
                  <span className="text-xs text-zinc-500">14m 12s</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="pb-24">
          <div className="text-center mb-12">
            <p className="text-sm font-bold text-red-500 uppercase tracking-wider">Features</p>
            <h2 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight">What's in the box.</h2>
            <p className="mt-3 text-zinc-400 max-w-xl mx-auto">No cheating. No excuses.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <div key={f.title}
                   className="group rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 hover:bg-zinc-800 hover:border-red-500/50 transition-all hover:shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20 text-orange-500 ring-1 ring-inset ring-red-500/30 group-hover:bg-red-500 group-hover:text-white transition-colors">
                  <Icon d={f.icon} />
                </div>
                <h3 className="mt-4 font-semibold text-zinc-100">{f.title}</h3>
                <p className="mt-1.5 text-sm text-zinc-400 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </section>


      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 mt-8 bg-zinc-950">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-zinc-500">
          <div>
            © {new Date().getFullYear()} AssOnFire 🔥 · Hardcore Exams
          </div>
          <div className="flex items-center gap-5">
            <a href="https://safeexambrowser.org" target="_blank" rel="noreferrer"
               className="hover:text-zinc-300 transition">SEB</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
