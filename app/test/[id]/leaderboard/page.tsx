import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AnimatedLeaderboard, { LeaderboardItem } from "./AnimatedLeaderboard";

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
  const sorted = (attempts || []).sort((a: any, b: any) => {
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
  
  if (snapshotPaths.length > 0 && (test.results_published || test.auto_publish_results)) {
    const { data: signed } = await adminDb.storage.from("snapshots").createSignedUrls(snapshotPaths, 3600);
    if (signed) {
      signed.forEach((s, idx) => {
        if (s.signedUrl) signedUrls.set(snapshotPaths[idx], s.signedUrl);
      });
    }
  }

  const leaderboardItems: LeaderboardItem[] = sorted.map((att: any) => {
    const attemptSnapshots = (snapshotEvents || [])
      .filter(e => e.attempt_id === att.id && e.detail?.path)
      .map(e => signedUrls.get(e.detail.path))
      .filter(Boolean)
      .slice(0, 4);

    return {
      id: att.id,
      score: att.score,
      started_at: att.started_at,
      submitted_at: att.submitted_at,
      profiles: att.profiles,
      snapshots: attemptSnapshots,
    };
  });

  const showSnapshots = Boolean(test.results_published || test.auto_publish_results);

  return (
    <main className="max-w-4xl mx-auto p-6 py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-red-500 to-rose-600">Wall of Flame</span> 🔥
        </h1>
        <p className="mt-3 text-lg text-zinc-400">{test.title} — Top 10 Scores</p>
      </div>

      <div className="card space-y-4 !p-4">
        <AnimatedLeaderboard items={leaderboardItems} showSnapshots={showSnapshots} />
      </div>
      
      <div className="mt-8 text-center">
        <a href="/dashboard" className="btn-secondary">Back to Dashboard</a>
      </div>
    </main>
  );
}
