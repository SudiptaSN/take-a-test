import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  
  // Auth check: must be admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { action, minutes } = body;

  // Get current attempt
  const { data: attempt } = await supabase.from("attempts").select("*").eq("id", id).single();
  if (!attempt) return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  if (attempt.status !== "in_progress") return NextResponse.json({ error: "Attempt not in progress" }, { status: 400 });

  switch (action) {
    case "add_time": {
      const mins = Math.min(Math.max(parseInt(minutes) || 5, 1), 60);
      const newExtra = (attempt.extra_minutes || 0) + mins;
      await supabase.from("attempts").update({ extra_minutes: newExtra }).eq("id", id);
      await supabase.from("proctor_events").insert({ attempt_id: id, kind: "time_added", detail: { minutes: mins, total_extra: newExtra } });
      return NextResponse.json({ ok: true, extra_minutes: newExtra });
    }
    case "remove_time": {
      const mins = Math.min(Math.max(parseInt(minutes) || 5, 1), 60);
      const newExtra = Math.max((attempt.extra_minutes || 0) - mins, 0);
      await supabase.from("attempts").update({ extra_minutes: newExtra }).eq("id", id);
      await supabase.from("proctor_events").insert({ attempt_id: id, kind: "time_removed", detail: { minutes: mins, total_extra: newExtra } });
      return NextResponse.json({ ok: true, extra_minutes: newExtra });
    }
    case "pause": {
      if (attempt.paused_at) return NextResponse.json({ error: "Already paused" }, { status: 400 });
      await supabase.from("attempts").update({ paused_at: new Date().toISOString() }).eq("id", id);
      await supabase.from("proctor_events").insert({ attempt_id: id, kind: "exam_paused", detail: { by: "admin" } });
      return NextResponse.json({ ok: true });
    }
    case "resume": {
      if (!attempt.paused_at) return NextResponse.json({ error: "Not paused" }, { status: 400 });
      // Calculate how long it was paused and add that as extra time
      const pausedMs = Date.now() - new Date(attempt.paused_at).getTime();
      const pausedMins = Math.ceil(pausedMs / 60000);
      const newExtra = (attempt.extra_minutes || 0) + pausedMins;
      await supabase.from("attempts").update({ paused_at: null, extra_minutes: newExtra }).eq("id", id);
      await supabase.from("proctor_events").insert({ attempt_id: id, kind: "exam_resumed", detail: { by: "admin", paused_minutes: pausedMins } });
      return NextResponse.json({ ok: true, extra_minutes: newExtra });
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
