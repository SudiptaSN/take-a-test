import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DeleteTestButton from "@/components/DeleteTestButton";
import AiSettingsForm from "@/components/AiSettingsForm";

export default async function AdminHome() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  console.log("--- DEBUG 1: User ID ---", user?.id);

  if (!user) redirect("/login");

  const { data: profile, error } = await supabase.from("profiles").select("role, gemini_key, gemini_key_shared").eq("id", user.id).single();

  console.log("--- DEBUG 2: Profile DB Result ---", profile);
  console.log("--- DEBUG 3: DB Error? ---", error);

  if (profile?.role !== "admin") {
    console.log("--- DEBUG 4: Bouncing user! Role found was:", profile?.role);
    redirect("/dashboard");
  }

  const { data: tests } = await supabase.from("tests").select("*").order("created_at", { ascending: false });

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin · Tests</h1>
        <div className="flex gap-2">
          <Link href="/admin/new" className="btn">New test</Link>
          <form action="/auth/signout" method="post"><button className="btn-secondary">Sign out</button></form>
        </div>
      </div>

      <AiSettingsForm initialKey={profile?.gemini_key} initialShared={profile?.gemini_key_shared || false} />

      <div className="mt-6 space-y-3">
        {(tests || []).length === 0 && <p className="text-zinc-600">No tests yet.</p>}
        {(tests || []).map((t) => (
          <div key={t.id} className="card flex items-center justify-between">
            <div>
              <div className="font-semibold">{t.title} {t.is_published ? <span className="text-xs text-green-700 ml-2">published</span> : <span className="text-xs text-zinc-500 ml-2">draft</span>}</div>
              <div className="text-sm text-zinc-600">{t.description}</div>
            </div>
            <div className="flex gap-2">
              <Link href={`/admin/tests/${t.id}`} className="btn-secondary">Edit</Link>
              <Link href={`/admin/tests/${t.id}/invites`} className="btn-secondary">Invites</Link>
              <Link href={`/admin/tests/${t.id}/attempts`} className="btn-secondary">Attempts</Link>
              <DeleteTestButton id={t.id} title={t.title} />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}