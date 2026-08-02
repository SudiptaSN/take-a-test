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

  return (
    <>
    <Navbar />
    <main className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin · Tests</h1>
        <div className="flex gap-2">
          <Link href="/admin/new" className="btn">New test</Link>
        </div>
      </div>

      <div className="my-6">
        <LandingPageSettingsForm initialTitle={profile?.sprint_title} initialDate={profile?.sprint_target_date} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AiSettingsForm initialKey={profile?.gemini_key} initialShared={profile?.gemini_key_shared || false} />
        <DiscordSettingsForm initialUrl={profile?.discord_webhook_url} initialHofUrl={profile?.discord_hall_of_fame_url} />
      </div>

      <div className="mt-6 space-y-3">
        {(!tests || tests.length === 0) && (
          <div className="card text-center py-12">
            <div className="text-4xl mb-3">🔥</div>
            <p className="text-zinc-400 font-medium">No tests created yet</p>
            <p className="text-sm text-zinc-500 mt-1">Create your first exam to get started.</p>
            <Link href="/admin/new" className="btn mt-4 inline-flex">Create test</Link>
          </div>
        )}
        {(tests || []).map((t) => (
          <div key={t.id} className="card flex items-center justify-between">
            <div>
              <div className="font-semibold">{t.title} {t.is_published ? <span className="text-xs text-green-700 ml-2">published</span> : <span className="text-xs text-zinc-500 ml-2">draft</span>}</div>
              <div className="text-sm text-zinc-400">{t.description}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <PingDiscordButton test={t} webhookUrl={profile?.discord_webhook_url} />
              <Link href={`/admin/tests/${t.id}`} className="btn-secondary">Edit</Link>
              <Link href={`/admin/tests/${t.id}/invites`} className="btn-secondary">Invites</Link>
              <Link href={`/admin/tests/${t.id}/attempts`} className="btn-secondary">Attempts</Link>
              <DeleteTestButton id={t.id} title={t.title} />
            </div>
          </div>
        ))}
      </div>
    </main>
    </>
  );
}