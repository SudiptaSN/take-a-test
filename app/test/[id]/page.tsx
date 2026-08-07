import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ExamRoom from "@/components/ExamRoom";
import { SEB_ENFORCEMENT_ENABLED, verifySebRequest } from "@/lib/seb";
import UnlockForm from "@/components/UnlockForm";
import RoastButton from "@/components/RoastButton";
import AppealForm from "@/components/AppealForm";
import { formatIST } from "@/lib/time";

export default async function TakeTest({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/test/${id}`);

  const { data: test } = await supabase.from("tests").select("*").eq("id", id).single();
  if (!test || !test.is_published) return <main className="p-10">Test not available.</main>;

  const now = new Date();
  if (test.available_from && now < new Date(test.available_from)) {
    return (
      <main className="max-w-xl mx-auto p-10 text-center">
        <h1 className="text-2xl font-bold">Exam not started yet</h1>
        <p className="mt-2 text-zinc-400">This test will be available starting {formatIST(test.available_from)}.</p>
      </main>
    );
  }
  if (test.available_until && now > new Date(test.available_until)) {
    return (
      <main className="max-w-xl mx-auto p-10 text-center">
        <h1 className="text-2xl font-bold">Exam has ended</h1>
        <p className="mt-2 text-zinc-400">This test closed on {formatIST(test.available_until)}.</p>
      </main>
    );
  }

  // Invite-only allowlist gate (checked BEFORE creating an attempt)
  if (test.invite_only) {
    const { data: inv } = await supabase
      .from("invites").select("id").eq("test_id", id).ilike("email", user.email || "").maybeSingle();
    if (!inv) {
      return (
        <main className="max-w-xl mx-auto p-10 text-center">
          <h1 className="text-2xl font-bold">You're not on the invite list</h1>
          <p className="text-zinc-400 mt-3">
            This exam is restricted to invited candidates. The email on your account
            (<code>{user.email}</code>) isn't on the list.
          </p>
          <p className="text-zinc-400 mt-2">
            If you were invited, sign out and sign back in with the exact email
            your administrator used.
          </p>
          <div className="mt-6"><a href="/dashboard" className="btn-secondary">Back to dashboard</a></div>
        </main>
      );
    }
  }

  // SEB gate (global flag OR per-test require_seb)
  const sebRequired = SEB_ENFORCEMENT_ENABLED || test.require_seb;
  if (sebRequired) {
    const h = await headers();
    const host = h.get("host");
    const proto = h.get("x-forwarded-proto") || "https";
    const fullUrl = `${proto}://${host}/test/${id}`;
    const hash = h.get("x-safeexambrowser-requesthash");
    const ok = SEB_ENFORCEMENT_ENABLED
      ? await verifySebRequest(fullUrl, hash)
      : !!hash; // per-test mode: presence-only check (BEK not configured)
    if (!ok) {
      return (
        <main className="max-w-xl mx-auto p-10 text-center">
          <h1 className="text-2xl font-bold">Open this test in Safe Exam Browser</h1>
          <p className="text-zinc-400 mt-3">
            This exam is locked to Safe Exam Browser (SEB). Install SEB, then open
            the <code className="mx-1 px-1 bg-zinc-800 text-zinc-300 rounded">.seb</code> config file
            your administrator sent you. SEB will load this page automatically.
          </p>
          <div className="mt-6 flex gap-3 justify-center">
            <Link href="https://safeexambrowser.org/download_en.html" className="btn" target="_blank">Download SEB</Link>
            <Link href={`/api/seb/${id}`} className="btn-secondary">Get .seb config</Link>
          </div>
        </main>
      );
    }
  }

  const { data: questions } = await supabase
    .from("questions").select("id, type, prompt, section_title, options, points, position, image_url")
    .eq("test_id", id).order("position");

  let { data: attempt } = await supabase
    .from("attempts").select("*").eq("test_id", id).eq("candidate_id", user.id).maybeSingle();
  if (!attempt) {
    const { data: created } = await supabase
      .from("attempts").insert({ test_id: id, candidate_id: user.id }).select().single();
    attempt = created;
  }
  if (!attempt) return <main className="p-10">Could not start attempt.</main>;
   if (attempt.status !== "in_progress") {
    const isTerminated = attempt.status === "terminated";
    return (
      <main className="max-w-xl mx-auto p-10 text-center">
        <h1 className="text-3xl font-bold mb-2">{isTerminated ? "Exam Terminated" : "Test submitted"}</h1>
        
        {isTerminated ? (
          <>
            <p className="text-red-400 mt-2 mb-6 bg-red-950/30 border border-red-900/50 p-4 rounded-lg">
              Your exam was terminated due to violation of proctoring rules. If you believe this was an error, you may submit an appeal below.
            </p>
            <AppealForm attemptId={attempt.id} testTitle={test.title} />
          </>
        ) : (test.results_published || test.auto_publish_results) ? (
          <div className="bg-red-950/20 border border-red-900/50 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-zinc-400 mb-1">Your Score</h2>
            <div className="text-6xl font-bold text-orange-500">{attempt.score ?? 0} pts</div>
          </div>
        ) : (
          <p className="text-zinc-400 mt-2 mb-8 bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg">
            Your response has been recorded. Results are currently hidden and will be pushed to the Discord Hall of Fame by the admin.
          </p>
        )}

        <div className="mt-6 flex justify-center gap-3">
          <a href="/dashboard" className="btn-secondary">Back to Dashboard</a>
          {test.is_leaderboard_public && (test.results_published || test.auto_publish_results) && (
            <a href={`/test/${id}/leaderboard`} className="btn bg-orange-600 hover:bg-orange-500 border-none text-white shadow-[0_0_15px_rgba(234,88,12,0.3)]">View Wall of Flame 🔥</a>
          )}
        </div>
        
        {(test.results_published || test.auto_publish_results) && !isTerminated && (
          <div className="mt-8 pt-8 border-t border-zinc-800">
            <RoastButton attemptId={attempt.id} />
          </div>
        )}
      </main>
    );
  }

  // Access-code gate: required if test has a global code OR this candidate has a pending invite
  const { data: invite } = await supabase
    .from("invites").select("id, used_at")
    .eq("test_id", id).ilike("email", user.email || "").maybeSingle();
  const codeRequired = !!test.access_code || (!!invite && !invite.used_at);
  if (codeRequired && !attempt.unlocked) {
    return (
      <main className="max-w-md mx-auto p-10">
        <h1 className="text-2xl font-bold">{test.title}</h1>
        <p className="text-zinc-400 mt-2">Enter the access code your administrator sent you to start.</p>
        <UnlockForm testId={id} />
      </main>
    );
  }

  let existingAnswers: any[] = [];
  let initialViolations = 0;
  
  if (attempt.status === "in_progress") {
    // 1. Fetch existing answers so they don't start from scratch
    const { data: ans } = await supabase.from("answers").select("*").eq("attempt_id", attempt.id);
    if (ans) existingAnswers = ans;
    
    // 2. Fetch existing violations so they can't refresh to clear their strike counter
    const { data: events } = await supabase.from("proctor_events").select("kind").eq("attempt_id", attempt.id);
    if (events) {
      initialViolations = events.filter(e => 
        !["reference_face", "exam_started", "fullscreen_unavailable", "snapshot", "snapshot_sprite"].includes(e.kind) &&
        !e.kind.startsWith("warning_")
      ).length;
    }
  }

  return <ExamRoom test={test} questions={questions || []} attempt={attempt} existingAnswers={existingAnswers} initialViolations={initialViolations} />;
}
