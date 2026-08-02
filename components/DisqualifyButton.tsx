"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function DisqualifyButton({ attemptId, initialStatus }: { attemptId: string; initialStatus: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  if (initialStatus === "terminated") {
    return <span className="px-3 py-1.5 bg-red-950 text-red-500 border border-red-900 rounded font-bold text-sm uppercase tracking-widest select-none">Disqualified</span>;
  }
  
  if (initialStatus === "submitted") {
    return <span className="px-3 py-1.5 bg-zinc-800 text-zinc-400 rounded font-bold text-sm uppercase tracking-widest select-none">Completed</span>;
  }

  const handleDisqualify = async () => {
    if (!confirm("Are you sure you want to permanently disqualify this candidate? This will instantly terminate their exam and they cannot resume.")) return;
    setLoading(true);
    await supabase.from("attempts").update({ status: "terminated" }).eq("id", attemptId);
    await supabase.from("proctor_events").insert({ attempt_id: attemptId, kind: "terminated", detail: { reason: "admin_manual_disqualification" } });
    router.refresh();
  };

  return (
    <button onClick={handleDisqualify} disabled={loading} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold transition">
      {loading ? "Processing..." : "Disqualify Candidate"}
    </button>
  );
}
