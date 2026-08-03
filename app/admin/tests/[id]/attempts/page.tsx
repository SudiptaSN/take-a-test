import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import { formatIST } from "@/lib/time";

export default async function Attempts({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");

  const { data: attempts } = await supabase
    .from("attempts")
    .select("id, status, score, submitted_at, started_at, candidate:profiles(email, full_name)")
    .eq("test_id", id)
    .order("started_at", { ascending: false });

  const { data: test } = await supabase.from("tests").select("title").eq("id", id).single();

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: test?.title || 'Test', href: `/admin/tests/${id}` }, { label: 'Attempts' }]} />
      <h1 className="text-2xl font-bold mt-2">Attempts</h1>
      {(!attempts || attempts.length === 0) ? (
        <div className="card text-center py-12 mt-6">
          <div className="text-4xl mb-3">📝</div>
          <p className="text-zinc-400 font-medium">No attempts yet</p>
          <p className="text-sm text-zinc-500 mt-1">Candidates haven't started this test.</p>
        </div>
      ) : (
      <table className="mt-6 w-full text-sm">
        <thead className="text-left text-zinc-400">
          <tr><th className="py-2">Candidate</th><th>Status</th><th>Score</th><th>Started</th><th>Submitted</th><th></th></tr>
        </thead>
        <tbody>
          {(attempts || []).map((a: any) => (
            <tr key={a.id} className="border-t">
              <td className="py-2">{a.candidate?.full_name || a.candidate?.email}</td>
              <td>{a.status}</td>
              <td>{a.score ?? "-"}</td>
              <td>{formatIST(a.started_at)}</td>
              <td>{formatIST(a.submitted_at)}</td>
              <td><a className="underline" href={`/admin/attempts/${a.id}`}>View</a></td>
            </tr>
          ))}
        </tbody>
      </table>
      )}
    </main>
  );
}
