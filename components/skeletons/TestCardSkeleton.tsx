import React from "react";

interface TestCardSkeletonProps {
  count?: number;
  buttonCount?: number;
}

export default function TestCardSkeleton({ count = 1, buttonCount = 2 }: TestCardSkeletonProps) {
  const items = Array.from({ length: count });
  const buttons = Array.from({ length: buttonCount });

  return (
    <div
      className="space-y-3"
      role="status"
      aria-busy="true"
    >
      <span className="sr-only">Loading content...</span>
      {items.map((_, i) => (
        <div
          key={i}
          className="card flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse"
        >
          <div className="space-y-2.5 flex-1">
            <div className="flex items-center gap-2">
              <div className="h-5 w-48 bg-zinc-800/80 rounded-md" />
              <div className="h-4 w-12 bg-zinc-800/40 rounded" />
            </div>
            <div className="h-4 w-3/4 max-w-md bg-zinc-800/50 rounded" />
            <div className="flex items-center gap-3 pt-1">
              <div className="h-3 w-28 bg-zinc-800/30 rounded" />
              <div className="h-3 w-20 bg-zinc-800/30 rounded" />
            </div>
          </div>
          <div className="flex items-center flex-wrap gap-2 pt-2 sm:pt-0">
            {buttons.map((_, bIdx) => (
              <div key={bIdx} className="h-9 w-20 bg-zinc-800/60 rounded-md" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
