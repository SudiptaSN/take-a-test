"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import DateTimePicker from '@/components/DateTimePicker';

export default function LandingPageSettingsForm({ initialTitle, initialDate }: { initialTitle: string | null, initialDate: string | null }) {
  const [title, setTitle] = useState(initialTitle || "WBCHSE SEMESTER 1: OPERATION ASS ON FIRE");
  const [date, setDate] = useState(initialDate ? new Date(initialDate).toISOString() : "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const save = async () => {
    setSaving(true);
    setMsg("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("profiles").update({ 
      sprint_title: title || null,
      sprint_target_date: date ? new Date(date).toISOString() : null 
    }).eq("id", user.id);
    
    if (error) setMsg("Failed to save.");
    else setMsg("Saved!");
    setSaving(false);
  };

  return (
    <div className="card mb-10 border border-orange-500/50 bg-orange-950/10 shadow-[0_0_20px_rgba(249,115,22,0.1)]">
      <h2 className="text-xl font-bold mb-2 text-orange-500">Landing Page Timer ⏳</h2>
      <p className="text-sm text-zinc-400 mb-4">
        Configure the giant countdown timer that appears on the public landing page.
      </p>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1">Sprint Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. WBCHSE SEMESTER 1: OPERATION ASS ON FIRE"
            className="input text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1">Target Date & Time</label>
          <DateTimePicker
            value={date}
            onChange={(v) => setDate(v)}
          />
        </div>
        <div className="flex items-center gap-4 mt-2">
          <button onClick={save} disabled={saving} className="btn bg-orange-600 hover:bg-orange-500 border-none text-white shadow-none">
            {saving ? "Saving..." : "Set Countdown"}
          </button>
          {msg && <span className="text-sm text-zinc-400">{msg}</span>}
        </div>
      </div>
    </div>
  );
}
