import React from "react";

interface QuestionSkeletonProps {
  count?: number;
}

export default function QuestionSkeleton({ count = 1 }: QuestionSkeletonProps) {
  const items = Array.from({ length: count });

  return (
    <div
      className="space-y-4"
      role="status"
      aria-busy="true"
    >
      <span className="sr-only">Loading content...</span>
      {items.map((_, i) => (
        <div key={i} className="card p-6 space-y-4 animate-pulse">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-4 w-20 bg-zinc-800/80 rounded" />
              <div className="h-4 w-16 bg-zinc-800/40 rounded" />
            </div>
            <div className="h-4 w-12 bg-zinc-800/60 rounded" />
          </div>

          {/* Question Prompt */}
          <div className="space-y-2 py-1">
            <div className="h-5 w-4/5 bg-zinc-800/80 rounded" />
            <div className="h-4 w-2/3 bg-zinc-800/50 rounded" />
          </div>

          {/* MCQ Options Placeholder */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {Array.from({ length: 4 }).map((_, optIdx) => (
              <div
                key={optIdx}
                className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/60"
              >
                <div className="w-4 h-4 rounded-full bg-zinc-800 shrink-0" />
                <div className="h-4 w-3/4 bg-zinc-800/60 rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
