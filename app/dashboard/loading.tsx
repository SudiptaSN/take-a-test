import React from "react";
import Navbar from "@/components/Navbar";
import TestCardSkeleton from "@/components/skeletons/TestCardSkeleton";

export default function DashboardLoading() {
  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-10 animate-fade-up">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="h-8 w-52 bg-zinc-800/80 rounded-md animate-pulse" />
        </div>

        {/* AI Settings Skeleton */}
        <div className="card mb-10 border border-red-900/30 bg-red-950/10 animate-pulse space-y-3 p-6">
          <div className="h-6 w-60 bg-zinc-800/80 rounded" />
          <div className="space-y-1.5">
            <div className="h-4 w-full bg-zinc-800/40 rounded" />
            <div className="h-4 w-3/4 bg-zinc-800/40 rounded" />
          </div>
          <div className="pt-2 space-y-2">
            <div className="h-4 w-28 bg-zinc-800/60 rounded" />
            <div className="h-10 w-full bg-zinc-800/50 rounded-lg" />
          </div>
          <div className="h-4 w-80 bg-zinc-800/40 rounded" />
          <div className="h-9 w-36 bg-zinc-800/80 rounded-lg mt-4" />
        </div>

        {/* Available Tests Title */}
        <div className="h-6 w-36 bg-zinc-800/60 rounded mb-6 animate-pulse" />

        {/* Test Cards Placeholder */}
        <TestCardSkeleton count={3} buttonCount={2} />
      </main>
    </>
  );
}
