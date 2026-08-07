"use client";

import { useState } from "react";
import { useToast } from "@/components/Toast";

interface TeaserPingButtonProps {
  testId: string;
}

export default function TeaserPingButton({ testId }: TeaserPingButtonProps) {
  const [loading, setLoading] = useState(false);
  const { toast, ToastContainer } = useToast();

  const handlePing = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const res = await fetch("/api/admin/teaser-ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testId }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast(data.error || "Failed to send Discord teaser ping", "error");
      } else {
        toast("⚡ Teaser Ping sent to Discord!", "success");
      }
    } catch (err: any) {
      toast(err?.message || "Network error occurred", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ToastContainer />
      <button
        type="button"
        onClick={handlePing}
        disabled={loading}
        className="btn bg-[#5865F2] hover:bg-[#4752C4] border border-[#5865F2]/50 text-white active:scale-95 transition-all duration-150 flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm font-medium px-3 py-1.5 rounded-xl"
        title="Post anonymous statistics teaser to Discord"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Sending...</span>
          </>
        ) : (
          <span>⚡ Teaser Ping</span>
        )}
      </button>
    </>
  );
}
