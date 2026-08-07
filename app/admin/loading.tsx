import React from "react";
import Navbar from "@/components/Navbar";
import TestCardSkeleton from "@/components/skeletons/TestCardSkeleton";

export default function AdminLoading() {
  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-10 animate-fade-up">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="h-8 w-44 bg-zinc-800/80 rounded-md animate-pulse" />
          <div className="flex gap-2">
            <div className="h-9 w-24 bg-zinc-800/60 rounded-md animate-pulse" />
            <div className="h-9 w-24 bg-zinc-800/60 rounded-md animate-pulse" />
          </div>
        </div>

        {/* Settings Box Placeholder */}
        <div className="my-6 card h-24 animate-pulse flex items-center justify-between px-6">
          <div className="space-y-2">
            <div className="h-5 w-56 bg-zinc-800/80 rounded" />
            <div className="h-4 w-80 bg-zinc-800/40 rounded" />
          </div>
          <div className="h-9 w-28 bg-zinc-800/60 rounded-md" />
        </div>

        {/* Test Cards Placeholder */}
        <div className="mt-8 space-y-6">
          <div className="h-6 w-32 bg-zinc-800/60 rounded animate-pulse" />
          <TestCardSkeleton count={4} buttonCount={5} />
        </div>
      </main>
    </>
  );
}
