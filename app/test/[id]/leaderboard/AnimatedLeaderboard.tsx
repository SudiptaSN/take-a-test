"use client";

import { useEffect, useState } from "react";
import ProctorSnapshotGallery from "@/components/ProctorSnapshotGallery";

export interface LeaderboardItem {
  id: string;
  score: number;
  started_at: string;
  submitted_at: string;
  profiles?: {
    full_name?: string | null;
  } | null;
  snapshots: string[];
}

interface AnimatedLeaderboardProps {
  items: LeaderboardItem[];
  showSnapshots: boolean;
}

export default function AnimatedLeaderboard({ items, showSnapshots }: AnimatedLeaderboardProps) {
  const [lockedRanks, setLockedRanks] = useState<Set<number>>(new Set());
  const total = items.length;

  useEffect(() => {
    setLockedRanks(new Set());
    const timers: NodeJS.Timeout[] = [];
    const staggerDelay = 180;

    items.forEach((_, idx) => {
      const delay = (total - 1 - idx) * staggerDelay;
      const timer = setTimeout(() => {
        setLockedRanks((prev) => {
          const next = new Set(prev);
          next.add(idx);
          return next;
        });
      }, delay);
      timers.push(timer);
    });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [items, total]);

  if (items.length === 0) {
    return (
      <div className="p-12 text-center text-zinc-500 bg-zinc-900/50 rounded-lg border border-dashed border-zinc-800">
        <div className="text-4xl mb-4">🏆</div>
        <p className="text-lg font-medium text-zinc-400">No one has conquered this yet.</p>
        <p className="text-sm mt-1">Be the first to get on the Wall of Flame!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 min-h-[500px]">
      {items.map((att, idx) => {
        const isLocked = lockedRanks.has(idx);
        const durMs = new Date(att.submitted_at).getTime() - new Date(att.started_at).getTime();
        const mins = Math.floor(durMs / 60000);
        const secs = Math.floor((durMs % 60000) / 1000);
        const isTopRank = idx === 0;

        return (
          <div
            key={att.id}
            className={`p-4 rounded-lg bg-zinc-900 border transition-all duration-500 ease-out transform ${
              isLocked
                ? isTopRank
                  ? "opacity-100 translate-y-0 scale-100 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.3)] bg-gradient-to-r from-zinc-900 via-zinc-900 to-amber-950/20"
                  : "opacity-100 translate-y-0 scale-100 border-orange-500/40 shadow-[0_0_15px_rgba(249,115,22,0.15)]"
                : "opacity-0 translate-y-8 scale-95 border-zinc-800 pointer-events-none"
            } motion-reduce:transition-none motion-reduce:transform-none motion-reduce:opacity-100`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`text-2xl font-bold w-8 text-right ${isTopRank ? "text-amber-400 animate-bounce" : "text-zinc-400"}`}>
                  {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                </div>
                <div className="font-semibold text-lg text-zinc-200">
                  {att.profiles?.full_name || "Anonymous User"}
                </div>
              </div>
              <div className="text-right">
                <div className={`text-xl font-bold ${isTopRank ? "text-amber-400" : "text-orange-500"}`}>
                  {att.score} pts
                </div>
                <div className="text-xs text-zinc-500 font-mono">{mins}m {secs}s</div>
              </div>
            </div>

            {showSnapshots && att.snapshots && att.snapshots.length > 0 && (
              <div className="mt-4 pt-4 border-t border-zinc-800/50">
                <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Webcam Proof (Peer Review)</p>
                <ProctorSnapshotGallery
                  snapshots={att.snapshots}
                  variant="horizontal"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
