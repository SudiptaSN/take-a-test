"use client";

import { useState, useEffect } from "react";

export default function CountdownTimer({ targetDate, title }: { targetDate: string, title: string }) {
  const [timeLeft, setTimeLeft] = useState<{ d: number, h: number, m: number, s: number } | null>(null);

  useEffect(() => {
    const target = new Date(targetDate).getTime();
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = target - now;

      if (distance < 0) {
        clearInterval(interval);
        setTimeLeft({ d: 0, h: 0, m: 0, s: 0 });
      } else {
        setTimeLeft({
          d: Math.floor(distance / (1000 * 60 * 60 * 24)),
          h: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          m: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          s: Math.floor((distance % (1000 * 60)) / 1000)
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  if (!timeLeft) return null;

  return (
    <div className="w-full max-w-4xl mx-auto my-16 text-center px-4">
      <h2 className="text-xl md:text-3xl font-bold uppercase tracking-widest text-zinc-400 mb-8">{title}</h2>
      <div className="flex justify-center gap-4 md:gap-8">
        <div className="flex flex-col items-center">
          <div className="text-5xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-orange-400 to-red-600 drop-shadow-[0_0_20px_rgba(239,68,68,0.3)]">
            {timeLeft.d.toString().padStart(2, '0')}
          </div>
          <div className="text-xs md:text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500 mt-2">Days</div>
        </div>
        <div className="text-4xl md:text-7xl font-bold text-zinc-800 mt-2">:</div>
        <div className="flex flex-col items-center">
          <div className="text-5xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-orange-400 to-red-600 drop-shadow-[0_0_20px_rgba(239,68,68,0.3)]">
            {timeLeft.h.toString().padStart(2, '0')}
          </div>
          <div className="text-xs md:text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500 mt-2">Hours</div>
        </div>
        <div className="text-4xl md:text-7xl font-bold text-zinc-800 mt-2">:</div>
        <div className="flex flex-col items-center">
          <div className="text-5xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-orange-400 to-red-600 drop-shadow-[0_0_20px_rgba(239,68,68,0.3)]">
            {timeLeft.m.toString().padStart(2, '0')}
          </div>
          <div className="text-xs md:text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500 mt-2">Mins</div>
        </div>
        <div className="text-4xl md:text-7xl font-bold text-zinc-800 mt-2 hidden md:block">:</div>
        <div className="flex flex-col items-center hidden md:flex">
          <div className="text-5xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-orange-400 to-red-600 drop-shadow-[0_0_20px_rgba(239,68,68,0.3)]">
            {timeLeft.s.toString().padStart(2, '0')}
          </div>
          <div className="text-xs md:text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500 mt-2">Secs</div>
        </div>
      </div>
    </div>
  );
}
