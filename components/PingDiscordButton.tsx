"use client";
import { useState } from "react";

export default function PingDiscordButton({ test, webhookUrl }: { test: any, webhookUrl: string | null }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const ping = async () => {
    if (!webhookUrl) {
      alert("Please configure your Discord Webhook URL in the settings above first.");
      return;
    }
    setLoading(true);
    setStatus("idle");
    try {
      const link = `${window.location.origin}/test/${test.id}`;
      const msg = {
        content: `🚨 **@everyone GET READY.**\n\nThe test **${test.title}** is approaching.\n${test.description ? `*${test.description}*\n` : ""}\nClick here to enter the portal: ${link}`
      };

      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msg)
      });

      if (!res.ok) throw new Error("Failed to send webhook.");
      setStatus("success");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err) {
      console.error(err);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
    setLoading(false);
  };

  if (!webhookUrl) return null;

  return (
    <button 
      onClick={ping} 
      disabled={loading} 
      className={`btn ${status === "success" ? "bg-green-600 hover:bg-green-600" : status === "error" ? "bg-red-600 hover:bg-red-600" : "bg-[#5865F2] hover:bg-[#4752C4] border-none text-white"}`}
    >
      {loading ? "Sending..." : status === "success" ? "Sent! ✓" : status === "error" ? "Error" : "Ping Discord"}
    </button>
  );
}
