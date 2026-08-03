"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface AppealFormProps {
  attemptId: string;
  testTitle: string;
}

export default function AppealForm({ attemptId, testTitle }: AppealFormProps) {
  const [loading, setLoading] = useState(true);
  const [appeal, setAppeal] = useState<any>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchAppeal = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("appeals")
        .select("*")
        .eq("attempt_id", attemptId)
        .maybeSingle();
      
      if (!error && data) {
        setAppeal(data);
      }
      setLoading(false);
    };
    fetchAppeal();
  }, [attemptId, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.length < 50) {
      setError("Please provide at least 50 characters explaining your reason.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("You must be logged in to submit an appeal.");
      setSubmitting(false);
      return;
    }

    const { data, error } = await supabase
      .from("appeals")
      .insert({
        attempt_id: attemptId,
        candidate_id: user.id,
        reason,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      setError("Failed to submit appeal. Please try again.");
    } else {
      setAppeal(data);
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="card p-6 bg-zinc-900 border-zinc-800 rounded-lg">
        <div className="animate-pulse h-20 bg-zinc-800 rounded"></div>
      </div>
    );
  }

  if (appeal) {
    if (appeal.status === "pending") {
      return (
        <div className="card p-6 border border-yellow-500/50 bg-yellow-500/10 rounded-lg">
          <h3 className="text-lg font-semibold text-yellow-400 mb-2">Appeal Pending</h3>
          <p className="text-zinc-300">Your appeal has been submitted and is awaiting admin review.</p>
        </div>
      );
    }
    if (appeal.status === "approved") {
      return (
        <div className="card p-6 border border-green-500/50 bg-green-500/10 rounded-lg">
          <h3 className="text-lg font-semibold text-green-400 mb-2">Appeal Approved</h3>
          <p className="text-zinc-300 mb-4">Your appeal has been approved! You may retake this exam.</p>
          <button onClick={() => router.refresh()} className="text-green-400 hover:underline">
            Refresh page to continue
          </button>
        </div>
      );
    }
    if (appeal.status === "rejected") {
      return (
        <div className="card p-6 border border-red-500/50 bg-red-500/10 rounded-lg">
          <h3 className="text-lg font-semibold text-red-400 mb-2">Appeal Rejected</h3>
          <p className="text-zinc-300 mb-2">Your appeal was rejected.</p>
          {appeal.admin_notes && (
            <div className="mt-4 p-3 bg-red-900/20 rounded border border-red-800/50">
              <p className="text-sm text-red-200"><strong>Admin Notes:</strong> {appeal.admin_notes}</p>
            </div>
          )}
        </div>
      );
    }
  }

  return (
    <div className="card p-6 bg-zinc-900 border border-zinc-800 rounded-lg">
      <h2 className="text-xl font-bold text-zinc-100 mb-4">Appeal Termination</h2>
      <p className="text-sm text-zinc-400 mb-4">
        If you believe your test was terminated by mistake, you can submit an appeal explaining the situation for {testTitle}.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-zinc-300 mb-1">
            Reason for Appeal
          </label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="input min-h-[120px] w-full bg-zinc-950 border border-zinc-800 text-zinc-100 p-3 rounded focus:outline-none focus:border-orange-500"
            placeholder="Please explain in detail (min 50 characters)..."
            required
            minLength={50}
          />
          <div className="text-xs text-zinc-500 mt-1 flex justify-between">
            <span>Minimum 50 characters</span>
            <span className={reason.length < 50 ? "text-red-400" : "text-green-400"}>
              {reason.length} / 50
            </span>
          </div>
        </div>

        {error && <div className="text-red-400 text-sm p-3 bg-red-500/10 rounded border border-red-500/20">{error}</div>}

        <button
          type="submit"
          disabled={submitting || reason.length < 50}
          className="btn w-full bg-orange-500 hover:bg-orange-600 text-white p-3 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? "Submitting..." : "Submit Appeal"}
        </button>
      </form>
    </div>
  );
}
