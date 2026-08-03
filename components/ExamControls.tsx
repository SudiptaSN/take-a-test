"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatTimeIST } from "@/lib/time";

interface ExamControlsProps {
  attemptId: string;
  initialExtraMinutes: number;
  initialPausedAt: string | null;
  attemptStatus: string;
}

export default function ExamControls({
  attemptId,
  initialExtraMinutes,
  initialPausedAt,
  attemptStatus,
}: ExamControlsProps) {
  const router = useRouter();
  
  const [extraMinutes, setExtraMinutes] = useState(initialExtraMinutes);
  const [pausedAt, setPausedAt] = useState<string | null>(initialPausedAt);
  const [minutesInput, setMinutesInput] = useState<number>(5);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  useEffect(() => {
    setExtraMinutes(initialExtraMinutes);
    setPausedAt(initialPausedAt);
  }, [initialExtraMinutes, initialPausedAt]);

  if (attemptStatus !== "in_progress") {
    return null;
  }

  const handleAction = async (action: string, data: any = {}) => {
    setLoadingAction(action);
    try {
      const response = await fetch(`/api/admin/attempt/${attemptId}/controls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...data }),
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.extra_minutes !== undefined) setExtraMinutes(result.extra_minutes);
        if (result.paused_at !== undefined) setPausedAt(result.paused_at);
        router.refresh();
      } else {
        console.error(`Failed to perform action: ${action}`);
      }
    } catch (error) {
      console.error(`Error performing action ${action}`, error);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="card p-6 bg-zinc-900 border border-zinc-800 rounded-lg">
      <h2 className="text-lg font-bold text-zinc-100 mb-4 border-b border-zinc-800 pb-2">Exam Controls</h2>
      
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium text-zinc-400 mb-2">Time Management</h3>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={60}
              value={minutesInput}
              onChange={(e) => setMinutesInput(parseInt(e.target.value) || 0)}
              className="w-20 p-2 bg-zinc-950 border border-zinc-800 rounded text-zinc-100 focus:outline-none focus:border-orange-500"
            />
            <span className="text-sm text-zinc-300">mins</span>
            
            <button
              onClick={() => handleAction("add_time", { minutes: minutesInput })}
              disabled={loadingAction !== null || minutesInput <= 0}
              className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm disabled:opacity-50 transition-colors"
            >
              {loadingAction === "add_time" ? "..." : "+ Add Time"}
            </button>
            
            <button
              onClick={() => handleAction("remove_time", { minutes: minutesInput })}
              disabled={loadingAction !== null || minutesInput <= 0}
              className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm disabled:opacity-50 transition-colors"
            >
              {loadingAction === "remove_time" ? "..." : "- Remove Time"}
            </button>
          </div>
          <p className="text-xs text-zinc-500 mt-2">
            Current extra time granted: <span className="font-mono text-zinc-300">{extraMinutes} min</span>
          </p>
        </div>

        <div className="border-t border-zinc-800 pt-4">
          <h3 className="text-sm font-medium text-zinc-400 mb-2">Session Control</h3>
          
          {!pausedAt ? (
            <button
              onClick={() => handleAction("pause")}
              disabled={loadingAction !== null}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded text-sm disabled:opacity-50 transition-colors"
            >
              {loadingAction === "pause" ? "Pausing..." : "Pause Exam"}
            </button>
          ) : (
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleAction("resume")}
                disabled={loadingAction !== null}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm disabled:opacity-50 transition-colors"
              >
                {loadingAction === "resume" ? "Resuming..." : "Resume Exam"}
              </button>
              <div className="text-sm text-zinc-400">
                Paused since: <span className="font-mono text-amber-400">{formatTimeIST(new Date(pausedAt))}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
