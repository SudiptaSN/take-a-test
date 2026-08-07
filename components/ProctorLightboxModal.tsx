"use client";

import React, { useState, useEffect, useCallback } from "react";
import { formatTimeIST } from "@/lib/time";

export interface SnapshotItem {
  url: string;
  ts?: string;
  label?: string;
}

interface ProctorLightboxModalProps {
  snapshots: SnapshotItem[];
  currentIndex: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export function ProctorLightboxModal({
  snapshots,
  currentIndex,
  onClose,
  onNavigate,
}: ProctorLightboxModalProps) {
  const [imageError, setImageError] = useState(false);
  const isOpen = currentIndex !== null && currentIndex >= 0 && currentIndex < snapshots.length;

  useEffect(() => {
    setImageError(false);
  }, [currentIndex]);

  const handlePrev = useCallback(() => {
    if (currentIndex === null || snapshots.length <= 1) return;
    const prevIndex = (currentIndex - 1 + snapshots.length) % snapshots.length;
    onNavigate(prevIndex);
  }, [currentIndex, snapshots.length, onNavigate]);

  const handleNext = useCallback(() => {
    if (currentIndex === null || snapshots.length <= 1) return;
    const nextIndex = (currentIndex + 1) % snapshots.length;
    onNavigate(nextIndex);
  }, [currentIndex, snapshots.length, onNavigate]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose, handlePrev, handleNext]);

  if (!isOpen || currentIndex === null) return null;

  const currentSnapshot = snapshots[currentIndex];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 animate-fade-up select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Proctor Snapshot Lightbox"
    >
      {/* Top Bar */}
      <div
        className="w-full max-w-5xl flex items-center justify-between text-zinc-300 py-2"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold tracking-wide text-zinc-200">
            Snapshot {currentIndex + 1} of {snapshots.length}
          </span>
          {currentSnapshot.ts && (
            <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-zinc-800/80 border border-zinc-700/50 text-orange-400">
              ⏱ {formatTimeIST(currentSnapshot.ts)}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 active:scale-95 transition-all"
          aria-label="Close Lightbox"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Main Image Stage */}
      <div
        className="relative flex-1 w-full max-w-5xl flex items-center justify-center my-4 overflow-hidden"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {/* Previous Button */}
        {snapshots.length > 1 && (
          <button
            onClick={handlePrev}
            className="absolute left-2 sm:left-4 z-10 p-3 rounded-full bg-zinc-900/80 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 active:scale-95 transition-all shadow-lg backdrop-blur-sm"
            aria-label="Previous snapshot"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        <div
          className="relative max-h-[75vh] max-w-[85vw] flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          {imageError ? (
            <div className="flex flex-col items-center justify-center p-8 bg-zinc-900/90 border border-zinc-800 rounded-xl text-center shadow-2xl max-w-md">
              <svg className="w-12 h-12 text-zinc-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm font-semibold text-zinc-300">Snapshot image unavailable</p>
              <p className="text-xs text-zinc-500 mt-1">The image file could not be loaded or is corrupted.</p>
            </div>
          ) : (
            <img
              src={currentSnapshot.url}
              alt={currentSnapshot.label || `Proctor snapshot ${currentIndex + 1}`}
              onError={() => setImageError(true)}
              className="max-h-[75vh] max-w-[85vw] object-contain rounded-lg border border-zinc-800/80 shadow-2xl"
            />
          )}
        </div>

        {/* Next Button */}
        {snapshots.length > 1 && (
          <button
            onClick={handleNext}
            className="absolute right-2 sm:right-4 z-10 p-3 rounded-full bg-zinc-900/80 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 active:scale-95 transition-all shadow-lg backdrop-blur-sm"
            aria-label="Next snapshot"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Selector Strip */}
      {snapshots.length > 1 && (
        <div
          className="w-full max-w-3xl flex items-center justify-center gap-2 overflow-x-auto py-2 px-4 rounded-xl bg-zinc-950/60 border border-zinc-800/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          {snapshots.map((item, idx) => (
            <button
              key={idx}
              onClick={() => onNavigate(idx)}
              className={`relative flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all active:scale-95 ${
                idx === currentIndex
                  ? "border-orange-500 ring-2 ring-orange-500/40 scale-105"
                  : "border-zinc-800 opacity-60 hover:opacity-100"
              }`}
            >
              <img src={item.url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
