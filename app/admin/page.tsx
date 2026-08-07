import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import DeleteTestButton from "@/components/DeleteTestButton";
import AiSettingsForm from "@/components/AiSettingsForm";
import DiscordSettingsForm from "@/components/DiscordSettingsForm";
import PingDiscordButton from "@/components/PingDiscordButton";
import LandingPageSettingsForm from "@/components/LandingPageSettingsForm";

export default async function AdminHome() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile, error } = await supabase.from("profiles").select("role, gemini_key, gemini_key_shared, discord_webhook_url, discord_hall_of_fame_url, sprint_target_date, sprint_title").eq("id", user.id).single();

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  const { data: tests } = await supabase.from("tests").select("*").order("created_at", { ascending: false });

  const { data: activeAttemptsData } = await supabase.from("attempts").select("test_id").eq("status", "in_progress");
  const activeAttemptCounts = (activeAttemptsData || []).reduce((acc: any, curr: any) => {
    acc[curr.test_id] = (acc[curr.test_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const TestCard = ({ t, profile }: { t: any, profile: any }) => {
    const isEnded = t.is_published && (t.is_manually_ended || (t.available_until && new Date() >= new Date(t.available_until)));
    const activeCount = activeAttemptCounts[t.id] || 0;

    return (
      <div className="card flex items-center justify-between">
        <div>
          <div className="font-semibold flex items-center gap-2">
            {t.title} 
            {isEnded && <span className="text-xs text-red-500 border border-red-500/20 bg-red-500/10 px-1.5 py-0.5 rounded">ended</span>}
            {isEnded && activeCount > 0 && (
              <span className="text-xs text-orange-400 border border-orange-400/20 bg-orange-400/10 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                {activeCount} candidate{activeCount === 1 ? '' : 's'} finishing
              </span>
            )}
          </div>
          <div className="text-sm text-zinc-400 mt-1">{t.description}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <PingDiscordButton test={t} webhookUrl={profile?.discord_webhook_url} />
          <Link href={`/admin/tests/${t.id}`} className="btn-secondary">Edit</Link>
          <Link href={`/admin/tests/${t.id}/invites`} className="btn-secondary">Invites</Link>
          <Link href={`/admin/tests/${t.id}/attempts`} className="btn-secondary">Attempts</Link>
          <DeleteTestButton id={t.id} title={t.title} />
        </div>
      </div>
    );
  };

  return (
    <>
    <Navbar />
    <main className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin · Tests</h1>
        <div className="flex gap-2">
          <Link href="/admin/appeals" className="btn-secondary">Appeals</Link>
          <Link href="/admin/new" className="btn">New test</Link>
        </div>
      </div>

      <div className="my-6 relative z-50">
        <LandingPageSettingsForm initialTitle={profile?.sprint_title} initialDate={profile?.sprint_target_date} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
        <AiSettingsForm initialKey={profile?.gemini_key} initialShared={profile?.gemini_key_shared || false} />
        <DiscordSettingsForm initialUrl={profile?.discord_webhook_url} initialHofUrl={profile?.discord_hall_of_fame_url} />
      </div>

      <div className="mt-6 space-y-8">
        {(!tests || tests.length === 0) && (
          <div className="card text-center py-12">
            <div className="text-4xl mb-3">🔥</div>
            <p className="text-zinc-400 font-medium">No tests created yet</p>
            <p className="text-sm text-zinc-500 mt-1">Create your first exam to get started.</p>
            <Link href="/admin/new" className="btn mt-4 inline-flex">Create test</Link>
          </div>
        )}

        {/* Draft Tests */}
        {tests?.filter(t => !t.is_published).length > 0 && (
          <section>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><span className="text-zinc-500">📝</span> Drafts</h2>
            <div className="space-y-3">
              {tests.filter(t => !t.is_published).map(t => (
                <TestCard key={t.id} t={t} profile={profile} />
              ))}
            </div>
          </section>
        )}

        {/* Active Tests */}
        {tests?.filter(t => t.is_published && !t.is_manually_ended && (!t.available_until || new Date() < new Date(t.available_until))).length > 0 && (
          <section>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><span className="text-green-500">🟢</span> Active</h2>
            <div className="space-y-3">
              {tests.filter(t => t.is_published && !t.is_manually_ended && (!t.available_until || new Date() < new Date(t.available_until))).map(t => (
                <TestCard key={t.id} t={t} profile={profile} />
              ))}
            </div>
          </section>
        )}

        {/* Ended Tests */}
        {tests?.filter(t => t.is_published && (t.is_manually_ended || (t.available_until && new Date() >= new Date(t.available_until)))).length > 0 && (
          <section>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><span className="text-red-500">🔴</span> Ended</h2>
            <div className="space-y-3 opacity-75">
              {tests.filter(t => t.is_published && (t.is_manually_ended || (t.available_until && new Date() >= new Date(t.available_until)))).map(t => (
                <TestCard key={t.id} t={t} profile={profile} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
    </>
  );
}