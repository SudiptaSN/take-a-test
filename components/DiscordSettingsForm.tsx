"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function DiscordSettingsForm({ initialUrl }: { initialUrl: string | null }) {
  const [url, setUrl] = useState(initialUrl || "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const save = async () => {
    setSaving(true);
    setMsg("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("profiles").update({ discord_webhook_url: url || null }).eq("id", user.id);
    if (error) setMsg("Failed to save.");
    else setMsg("Saved!");
    setSaving(false);
  };

  return (
    <div className="card mb-10 border border-[#5865F2]/50 bg-[#5865F2]/10 shadow-[0_0_20px_rgba(88,101,242,0.1)]">
      <h2 className="text-xl font-bold mb-2 text-[#5865F2]">Discord Integration 👾</h2>
      <p className="text-sm text-zinc-400 mb-4">
        Paste your Discord Webhook URL here to enable the "Ping Discord" button on your exams.
      </p>
      <div className="space-y-3">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://discord.com/api/webhooks/..."
          className="input font-mono text-sm"
        />
        <div className="flex items-center gap-4 mt-2">
          <button onClick={save} disabled={saving} className="btn bg-[#5865F2] hover:bg-[#4752C4] border-none text-white">
            {saving ? "Saving..." : "Save Webhook"}
          </button>
          {msg && <span className="text-sm text-zinc-400">{msg}</span>}
        </div>
      </div>
    </div>
  );
}
