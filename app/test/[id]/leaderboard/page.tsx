import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Leaderboard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: test } = await supabase.from("tests").select("*").eq("id", id).single();
  if (!test || !test.is_published) return <main className="p-10">Test not available.</main>;

  if (!test.is_leaderboard_public) {
    return (
      <main className="max-w-xl mx-auto p-10 text-center">
        <h1 className="text-2xl font-bold">Leaderboard is disabled</h1>
        <p className="mt-2 text-zinc-400">The administrator has not enabled the Wall of Flame for this exam.</p>
        <a href="/dashboard" className="btn mt-6 inline-flex">Back to Dashboard</a>
      </main>
    );
  }

  // Fetch attempts with non-null scores
  const { data: attempts } = await supabase
    .from("attempts")
    .select("id, score, started_at, submitted_at, profiles!inner ( full_name )")
    .eq("test_id", id)
    .not("score", "is", null);

  // Sort by score DESC, then duration ASC
  const sorted = (attempts || []).sort((a, b) => {
    if (b.score !== a.score) return (b.score || 0) - (a.score || 0);
    const durA = new Date(a.submitted_at).getTime() - new Date(a.started_at).getTime();
    const durB = new Date(b.submitted_at).getTime() - new Date(b.started_at).getTime();
    return durA - durB;
  }).slice(0, 10);

  // Fetch snapshot events using service role so peers can view them
  const { createClient: createSupabaseJs } = await import("@supabase/supabase-js");
  const adminDb = createSupabaseJs(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  const attemptIds = sorted.map((a: any) => a.id);
  const { data: snapshotEvents } = await adminDb
    .from("proctor_events")
    .select("attempt_id, detail")
    .eq("kind", "snapshot")
    .in("attempt_id", attemptIds);

  const snapshotPaths = (snapshotEvents || []).map(e => e.detail?.path).filter(Boolean);
  let signedUrls = new Map();
  
  if (snapshotPaths.length > 0 && test.results_published) {
    const { data: signed } = await adminDb.storage.from("snapshots").createSignedUrls(snapshotPaths, 3600);
    if (signed) {
      signed.forEach((s, idx) => {
        if (s.signedUrl) signedUrls.set(snapshotPaths[idx], s.signedUrl);
      });
    }
  }

  return (
    <main className="max-w-4xl mx-auto p-6 py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-red-500 to-rose-600">Wall of Flame</span> 🔥
        </h1>
        <p className="mt-3 text-lg text-zinc-400">{test.title} — Top 10 Scores</p>
      </div>

      <div className="card space-y-4 !p-4">
        {sorted.length === 0 ? (
          <p className="p-6 text-center text-zinc-500">No attempts have been graded yet.</p>
        ) : (
          sorted.map((att: any, idx: number) => {
            const durMs = new Date(att.submitted_at).getTime() - new Date(att.started_at).getTime();
            const mins = Math.floor(durMs / 60000);
            const secs = Math.floor((durMs % 60000) / 1000);
            
            // Get up to 4 snapshots for this attempt
            const attemptSnapshots = (snapshotEvents || [])
              .filter(e => e.attempt_id === att.id && e.detail?.path)
              .map(e => signedUrls.get(e.detail.path))
              .filter(Boolean)
              .slice(0, 4);
            
            return (
              <div key={att.id} className="p-4 rounded-lg bg-zinc-900 border border-zinc-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-bold text-zinc-600 w-8 text-right">
                      {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                    </div>
                    <div className="font-semibold text-lg text-zinc-200">
                      {att.profiles?.full_name || "Anonymous User"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-orange-500">{att.score} pts</div>
                    <div className="text-xs text-zinc-500 font-mono">{mins}m {secs}s</div>
                  </div>
                </div>
                
                {test.results_published && attemptSnapshots.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-zinc-800/50">
                    <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Webcam Proof (Peer Review)</p>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {attemptSnapshots.map((url, i) => (
                        <img key={i} src={url} alt="Proctor Snapshot" className="h-20 w-auto rounded border border-zinc-700/50 hover:scale-150 transition-transform origin-left" />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      
      <div className="mt-8 text-center">
        <a href="/dashboard" className="btn-secondary">Back to Dashboard</a>
      </div>
    </main>
  );
}
