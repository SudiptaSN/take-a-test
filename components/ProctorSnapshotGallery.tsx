"use client";

import React, { useState } from "react";
import { ProctorLightboxModal, SnapshotItem } from "./ProctorLightboxModal";
import { formatTimeIST } from "@/lib/time";

interface ProctorSnapshotGalleryProps {
  snapshots: (SnapshotItem | string)[];
  variant?: "grid" | "horizontal";
  title?: string;
}

export default function ProctorSnapshotGallery({
  snapshots,
  variant = "grid",
  title,
}: ProctorSnapshotGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (!snapshots || snapshots.length === 0) return null;

  // Normalize snapshots to SnapshotItem objects
  const items: SnapshotItem[] = snapshots.map((s) => {
    if (typeof s === "string") return { url: s };
    return s;
  });

  return (
    <>
      {title && <h2 className="font-semibold mt-8">{title}</h2>}

      {variant === "grid" ? (
        <div className="mt-2 grid grid-cols-3 md:grid-cols-6 gap-2">
          {items.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedIndex(i)}
              className="block text-left group focus:outline-none focus:ring-2 focus:ring-orange-500 rounded-lg active:scale-95 transition-all"
            >
              <div className="relative aspect-square overflow-hidden rounded-md border border-zinc-800 group-hover:border-orange-500/50 group-hover:shadow-lg transition-all">
                <img
                  src={s.url}
                  alt={s.label || `Webcam snapshot ${i + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                    />
                  </svg>
                </div>
              </div>
              {s.ts && (
                <div className="text-[10px] text-zinc-500 mt-0.5 font-mono truncate">
                  {formatTimeIST(s.ts)}
                </div>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {items.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedIndex(i)}
              className="flex-shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 rounded active:scale-95 transition-all"
            >
              <img
                src={s.url}
                alt="Proctor Snapshot"
                className="h-20 w-auto rounded border border-zinc-700/50 hover:border-orange-500/60 hover:scale-105 relative z-10 transition-transform origin-left object-cover"
              />
            </button>
          ))}
        </div>
      )}

      <ProctorLightboxModal
        snapshots={items}
        currentIndex={selectedIndex}
        onClose={() => setSelectedIndex(null)}
        onNavigate={(idx) => setSelectedIndex(idx)}
      />
    </>
  );
}
