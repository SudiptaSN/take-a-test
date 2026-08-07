"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export interface ResultsCountdownClockProps {
  targetDate: string;
  testTitle: string;
  onComplete: () => void;
}

export default function ResultsCountdownClock({
  targetDate,
  testTitle,
  onComplete,
}: ResultsCountdownClockProps) {
  const [timeLeft, setTimeLeft] = useState<{
    d: number;
    h: number;
    m: number;
    s: number;
  } | null>(null);

  useEffect(() => {
    const target = new Date(targetDate).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const distance = target - now;

      if (distance <= 0) {
        setTimeLeft({ d: 0, h: 0, m: 0, s: 0 });
        onComplete();
      } else {
        setTimeLeft({
          d: Math.floor(distance / (1000 * 60 * 60 * 24)),
          h: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          m: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          s: Math.floor((distance % (1000 * 60)) / 1000),
        });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [targetDate, onComplete]);

  if (!timeLeft) return null;

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center animate-fade-in relative overflow-hidden">
      {/* Navigation Header Link & Badge */}
      <div className="w-full max-w-3xl flex items-center justify-between mb-8">
        <Link href="/dashboard" className="btn-secondary text-sm flex items-center gap-2">
          ← Back to Dashboard
        </Link>
        <span className="text-xs px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 animate-pulse font-medium flex items-center gap-1.5">
          <span>⏳</span> Scheduled Results Reveal
        </span>
      </div>

      <div className="card max-w-3xl w-full p-8 sm:p-12 border-orange-500/20 bg-zinc-900/90 backdrop-blur-xl shadow-2xl relative z-10">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-400 mb-2">
          Results Countdown
        </h2>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white mb-8">
          {testTitle}
        </h1>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 my-6">
          <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-inner">
            <div className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-orange-400 to-red-500 font-mono">
              {timeLeft.d.toString().padStart(2, "0")}
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mt-2">
              Days
            </div>
          </div>

          <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-inner">
            <div className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-orange-400 to-red-500 font-mono">
              {timeLeft.h.toString().padStart(2, "0")}
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mt-2">
              Hours
            </div>
          </div>

          <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-inner">
            <div className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-orange-400 to-red-500 font-mono">
              {timeLeft.m.toString().padStart(2, "0")}
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mt-2">
              Minutes
            </div>
          </div>

          <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-inner">
            <div className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-orange-400 to-red-500 font-mono animate-pulse">
              {timeLeft.s.toString().padStart(2, "0")}
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mt-2">
              Seconds
            </div>
          </div>
        </div>

        <p className="text-sm text-zinc-400 mt-6 max-w-md mx-auto">
          Scores and detailed performance breakdown are currently locked. Results will automatically reveal the instant countdown finishes!
        </p>
      </div>
    </div>
  );
}
