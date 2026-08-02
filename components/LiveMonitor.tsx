"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LiveMonitor({ attemptId, initialEvents }: { attemptId: string; initialEvents: any[] }) {
  const supabase = createClient();
  const [events, setEvents] = useState(initialEvents || []);

  useEffect(() => {
    const channel = supabase.channel(`monitor_${attemptId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "proctor_events", filter: `attempt_id=eq.${attemptId}` }, (payload) => {
         setEvents((prev) => [...prev, payload.new]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [attemptId, supabase]);

  // Auto-scroll to bottom of the event list when new events arrive
  useEffect(() => {
    const el = document.getElementById("events-list");
    if (el) el.scrollTop = el.scrollHeight;
  }, [events]);

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Live Proctor Events ({events.length})</h2>
        <div className="flex items-center gap-2 text-xs text-green-500 font-medium">
           <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
           LIVE SYNC
        </div>
      </div>
      <ul id="events-list" className="mt-2 text-sm max-h-72 overflow-y-auto border border-zinc-800 rounded p-2 bg-zinc-900/50 scroll-smooth">
        {events.map((e) => (
          <li key={e.id} className="border-b last:border-0 py-1.5 border-zinc-800/50">
            <code className="text-zinc-500">{new Date(e.created_at).toLocaleTimeString()}</code> · <b className={e.kind.includes("blocked") || e.kind.includes("exit") || e.kind === "terminated" || e.kind.includes("detected") ? "text-red-500" : "text-blue-400"}>{e.kind}</b>
            {e.detail && typeof e.detail === 'object' && (
               <span className="text-zinc-400 ml-2">
                 {Object.entries(e.detail).map(([k, v]) => (
                   <span key={k} className="mr-3"><span className="text-zinc-500">{k}:</span> {String(v)}</span>
                 ))}
               </span>
            )}
            {e.detail && typeof e.detail === 'string' && <span className="text-zinc-400 ml-2">{e.detail}</span>}
          </li>
        ))}
        {events.length === 0 && <li className="text-zinc-500 p-2 text-center">No events recorded yet.</li>}
      </ul>
    </div>
  );
}
