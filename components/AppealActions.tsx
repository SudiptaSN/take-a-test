"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function AppealActions({ appealId, attemptId }: { appealId: string; attemptId: string }) {
  const [loading, setLoading] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [notes, setNotes] = useState("");
  const supabase = createClient();
  const router = useRouter();

  const handleApprove = async () => {
    if (!confirm("Approve this appeal? The candidate's old attempt will be deleted and they can retake the exam.")) return;
    setLoading(true);
    // Update appeal status
    await supabase.from("appeals").update({ status: "approved", reviewed_at: new Date().toISOString() }).eq("id", appealId);
    // Delete the old attempt so they get a fresh one
    await supabase.from("attempts").delete().eq("id", attemptId);
    router.refresh();
    setLoading(false);
  };

  const handleReject = async () => {
    setLoading(true);
    await supabase.from("appeals").update({ status: "rejected", admin_notes: notes || null, reviewed_at: new Date().toISOString() }).eq("id", appealId);
    router.refresh();
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-2 mt-3">
      <div className="flex gap-2">
        <button onClick={handleApprove} disabled={loading} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded font-medium transition disabled:opacity-50">
          {loading ? "..." : "✓ Approve & Allow Retest"}
        </button>
        <button onClick={() => setShowReject(!showReject)} disabled={loading} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded font-medium transition disabled:opacity-50">
          ✗ Reject
        </button>
      </div>
      {showReject && (
        <div className="flex gap-2 mt-1">
          <input 
            value={notes} 
            onChange={(e) => setNotes(e.target.value)} 
            placeholder="Admin notes (optional)" 
            className="bg-zinc-800 border border-zinc-700 text-zinc-100 rounded px-3 py-1.5 text-sm flex-1 outline-none focus:border-orange-500 transition-colors" 
          />
          <button onClick={handleReject} disabled={loading} className="px-3 py-1.5 bg-red-700 hover:bg-red-800 transition-colors text-white text-sm rounded font-medium disabled:opacity-50">
            Confirm Reject
          </button>
        </div>
      )}
    </div>
  );
}
