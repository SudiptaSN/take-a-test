"use client";
import { useState } from "react";
import { useToast } from "@/components/Toast";

export default function PingDiscordButton({ test, webhookUrl }: { test: any, webhookUrl: string | null }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const { toast, ToastContainer } = useToast();

  const ping = async () => {
    if (!webhookUrl) {
      toast("Please configure your Discord Webhook URL in the settings above first.", "error");
      return;
    }
    setLoading(true);
    setStatus("idle");
    try {
      const link = `${window.location.origin}/test/${test.id}`;
      
      const embed = {
        title: `🚨 EXAM INCOMING: ${test.title}`,
        description: test.description ? `*${test.description}*` : "A new examination has been scheduled.",
        color: 0xE85D04, // Orange color
        fields: [
          {
            name: "⏱️ Duration",
            value: `**${test.duration_minutes}** minutes`,
            inline: true,
          },
          {
            name: "🔒 Access",
            value: test.invite_only ? "Invite Only" : "Public (with code if set)",
            inline: true,
          },
          {
            name: "🗓️ Window",
            value: (test.available_from || test.available_until) 
              ? `${test.available_from ? new Date(test.available_from).toLocaleString() : 'Now'} - ${test.available_until ? new Date(test.available_until).toLocaleString() : 'Forever'}`
              : "Always Open",
            inline: false,
          }
        ],
        footer: {
          text: "AssOnFire Proctoring Engine",
        },
        timestamp: new Date().toISOString(),
      };

      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `🚨 **@everyone GET READY.** Click here to enter the portal: ${link}`,
          embeds: [embed]
        })
      });

      if (!res.ok) throw new Error("Failed to send webhook.");
      setStatus("success");
      toast("Upcoming Exam Ping sent to Discord!", "success");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      toast(err?.message || "Failed to send ping", "error");
      setTimeout(() => setStatus("idle"), 3000);
    }
    setLoading(false);
  };

  return (
    <>
      <ToastContainer />
      <button 
        onClick={ping} 
        disabled={loading} 
        className={`btn ${status === "success" ? "bg-green-600 hover:bg-green-600" : status === "error" ? "bg-red-600 hover:bg-red-600" : "bg-[#5865F2] hover:bg-[#4752C4] border-none text-white"} active:scale-95 transition-all`}
      >
        {loading ? "Sending..." : status === "success" ? "Sent! ✓" : status === "error" ? "Error" : "Ping Discord"}
      </button>
    </>
  );
}
