"use client";
import { useState } from "react";

export default function RoastButton({ attemptId }: { attemptId: string }) {
  const [loading, setLoading] = useState(false);
  const [roast, setRoast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getRoasted = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/roast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attempt_id: attemptId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setRoast(data.roast);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  if (roast) {
    return (
      <div className="mt-8 p-6 text-left border border-red-500/30 bg-red-950/20 rounded-xl shadow-[0_0_30px_rgba(220,38,38,0.1)]">
        <h3 className="text-xl font-bold text-red-500 mb-4 uppercase tracking-wider">🔥 AI Roast Results</h3>
        <div className="text-zinc-300 whitespace-pre-wrap leading-relaxed text-sm ">
          {roast}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 flex flex-col items-center">
      <button 
        onClick={getRoasted} 
        disabled={loading}
        className="btn bg-gradient-to-r from-red-600 to-rose-700 border-none shadow-[0_0_15px_rgba(225,29,72,0.4)] hover:scale-105 transition-transform"
      >
        {loading ? "Summoning the AI..." : "Get Roasted by AI 🤖🔥"}
      </button>
      {error && <p className="text-red-500 text-sm mt-2 font-medium">{error}</p>}
    </div>
  );
}
