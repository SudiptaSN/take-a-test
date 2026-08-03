import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatIST } from "@/lib/time";
import AppealActions from "@/components/AppealActions";
import Link from "next/link";

export default async function AppealsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");

  const { data: appeals } = await supabase
    .from('appeals')
    .select('*, attempt:attempts(*, test:tests(title), candidate:profiles(email, full_name))')
    .order('created_at', { ascending: false });

  const pending = appeals?.filter(a => a.status === "pending") || [];
  const approved = appeals?.filter(a => a.status === "approved") || [];
  const rejected = appeals?.filter(a => a.status === "rejected") || [];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div>
        <div className="text-sm text-zinc-400 mb-2">
          <Link href="/admin" className="hover:text-orange-500 transition-colors">Admin</Link>
          {" > "} Appeals
        </div>
        <h1 className="text-3xl font-bold text-zinc-100">Appeals</h1>
      </div>

      <div className="space-y-6">
        <AppealSection title="Pending" appeals={pending} />
        <AppealSection title="Approved" appeals={approved} />
        <AppealSection title="Rejected" appeals={rejected} />
      </div>
    </div>
  );
}

function AppealSection({ title, appeals }: { title: string; appeals: any[] }) {
  if (appeals.length === 0) {
    return (
      <section>
        <h2 className="text-xl font-semibold text-zinc-200 mb-4">{title}</h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-center text-zinc-500">
          No {title.toLowerCase()} appeals.
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-xl font-semibold text-zinc-200 mb-4">{title}</h2>
      <div className="space-y-4">
        {appeals.map(appeal => (
          <div key={appeal.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-medium text-zinc-100">
                  {appeal.attempt?.candidate?.full_name || 'Unknown User'} ({appeal.attempt?.candidate?.email})
                </h3>
                <p className="text-sm text-zinc-400">
                  Test: {appeal.attempt?.test?.title || 'Unknown Test'}
                </p>
              </div>
              <Badge status={appeal.status} />
            </div>
            
            <div className="mt-3 bg-zinc-950 rounded p-3 text-sm text-zinc-300">
              <span className="font-semibold text-zinc-400 block mb-1">Reason:</span>
              {appeal.reason}
            </div>

            <div className="mt-3 text-xs text-zinc-500">
              Submitted: {formatIST(appeal.created_at)}
            </div>

            {appeal.status === 'pending' && (
              <AppealActions appealId={appeal.id} attemptId={appeal.attempt_id} />
            )}
            
            {appeal.admin_notes && (
              <div className="mt-3 text-sm text-zinc-400">
                <span className="font-semibold">Admin Notes: </span>
                {appeal.admin_notes}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function Badge({ status }: { status: string }) {
  const colors = {
    pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    approved: "bg-green-500/10 text-green-500 border-green-500/20",
    rejected: "bg-red-500/10 text-red-500 border-red-500/20",
  };
  const cls = colors[status as keyof typeof colors] || "bg-zinc-500/10 text-zinc-500 border-zinc-500/20";
  return (
    <span className={`px-2 py-1 text-xs rounded border ${cls} uppercase font-medium tracking-wider`}>
      {status}
    </span>
  );
}
