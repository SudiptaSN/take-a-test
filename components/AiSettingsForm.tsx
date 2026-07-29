"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AiSettingsForm({
  initialKey,
  initialShared
}: {
  initialKey: string | null;
  initialShared: boolean;
}) {
  const [key, setKey] = useState(initialKey || "");
  const [shared, setShared] = useState(initialShared);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const save = async () => {
    setSaving(true);
    setMsg("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ gemini_key: key || null, gemini_key_shared: shared })
      .eq("id", user.id);

    if (error) {
      setMsg("Failed to save.");
    } else {
      setMsg("Settings saved!");
    }
    setSaving(false);
  };

  return (
    <div className="card mb-10 border border-red-900/50 bg-red-950/10 shadow-[0_0_20px_rgba(220,38,38,0.1)]">
      <h2 className="text-xl font-bold mb-2 text-red-500">Community AI Features 🤖</h2>
      <p className="text-sm text-zinc-400 mb-4">
        To use features like "AI Roast" without hitting rate limits, you can provide your own free Gemini API key. 
        If you share it with the community pool, your friends can securely use it as a fallback if their keys run out.
      </p>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Gemini API Key</label>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="AIzaSy..."
            className="input font-mono"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={shared}
            onChange={(e) => setShared(e.target.checked)}
          />
          I consent to securely share this API key with the community pool for fallback requests.
        </label>
        <div className="flex items-center gap-4 mt-4">
          <button onClick={save} disabled={saving} className="btn">
            {saving ? "Saving..." : "Save AI Settings"}
          </button>
          {msg && <span className="text-sm text-zinc-400">{msg}</span>}
        </div>
      </div>
    </div>
  );
}
