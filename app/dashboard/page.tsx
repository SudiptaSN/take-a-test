import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AiSettingsForm from "@/components/AiSettingsForm";
import Navbar from "@/components/Navbar";
export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (profile?.role === "admin") redirect("/admin");

  const { data: allTests } = await supabase
    .from("tests").select("id, title, description, duration_minutes, invite_only, is_leaderboard_public")
    .eq("is_published", true).order("created_at", { ascending: false });
  // For invite_only tests, candidate must have an invite row matching their email
  const { data: myInvites } = await supabase
    .from("invites").select("test_id").ilike("email", user.email || "");
  const allowedTestIds = new Set((myInvites || []).map((i: any) => i.test_id));
  const tests = (allTests || []).filter((t: any) => !t.invite_only || allowedTestIds.has(t.id));
  const { data: attempts } = await supabase
    .from("attempts").select("id, test_id, status, score, submitted_at").eq("candidate_id", user.id);

  const attemptByTest = new Map((attempts || []).map((a) => [a.test_id, a]));

  const completedAttempts = attempts?.filter((a) => a.status === "submitted") || [];
  const completedCount = completedAttempts.length;
  const avgScore = completedCount > 0 ? Math.round(completedAttempts.reduce((acc, a) => acc + (a.score || 0), 0) / completedCount) : 0;
  const bestScore = completedCount > 0 ? Math.max(...completedAttempts.map(a => a.score || 0)) : 0;

  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Candidate Dashboard</h1>
        </div>
      
      <AiSettingsForm initialKey={profile?.gemini_key} initialShared={profile?.gemini_key_shared || false} />

      {completedCount > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="card text-center">
            <div className="text-2xl font-bold text-orange-400">{completedCount}</div>
            <div className="text-xs text-zinc-400 mt-1">Tests Taken</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-orange-400">{avgScore}</div>
            <div className="text-xs text-zinc-400 mt-1">Avg Score</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-orange-400">{bestScore}</div>
            <div className="text-xs text-zinc-400 mt-1">Best Score</div>
          </div>
        </div>
      )}

      <h2 className="text-xl font-bold">Available tests</h2>
      <div className="mt-6 space-y-3">
        {(tests || []).length === 0 && (
          <div className="card text-center py-12">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-zinc-400 font-medium">No tests available yet</p>
            <p className="text-sm text-zinc-500 mt-1">Your administrator hasn't published any tests, or you haven't been invited.</p>
          </div>
        )}
        {(tests || []).map((t) => {
          const a = attemptByTest.get(t.id);
          return (
            <div key={t.id} className="card flex items-center justify-between">
              <div>
                <div className="font-semibold">{t.title}</div>
                <div className="text-sm text-zinc-400">{t.description}</div>
                <div className="text-xs text-zinc-500 mt-1 flex items-center gap-2">
                  <span>Duration: {t.duration_minutes} min</span>
                  {a?.status === 'submitted' && <span className='text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20'>✓ Completed</span>}
                  {a?.status === 'in_progress' && <span className='text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'>⏳ In Progress</span>}
                  {a?.status === 'terminated' && <span className='text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20'>✗ Terminated</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {t.is_leaderboard_public && (
                  <Link href={`/test/${t.id}/leaderboard`} className="btn-secondary !text-orange-400 !border-orange-500/20 hover:!bg-orange-500/10">🏆 Leaderboard</Link>
                )}
                {a?.status === "submitted" || a?.status === "terminated" ? (
                  <Link href={`/test/${t.id}`} className="btn-secondary">View Results</Link>
                ) : (
                  <Link href={`/test/${t.id}`} className="btn">{a ? "Resume" : "Start"}</Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
      </main>
    </>
  );
}
