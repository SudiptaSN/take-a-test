import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return NextResponse.json({ error: "unauthorized" }, { status: 403 });

    // 1. Delete Question Images (stored in question-images/[test_id]/)
    const { data: qFiles } = await supabase.storage.from("question-images").list(id);
    if (qFiles && qFiles.length > 0) {
      const paths = qFiles.map((f) => `${id}/${f.name}`);
      await supabase.storage.from("question-images").remove(paths);
    }

    // 2. Fetch all attempts to delete their snapshots
    const { data: attempts } = await supabase.from("attempts").select("id").eq("test_id", id);
    if (attempts && attempts.length > 0) {
      for (const attempt of attempts) {
        // Delete Snapshot Images (stored in snapshots/[attempt_id]/)
        const { data: sFiles } = await supabase.storage.from("snapshots").list(attempt.id);
        if (sFiles && sFiles.length > 0) {
          const paths = sFiles.map((f) => `${attempt.id}/${f.name}`);
          await supabase.storage.from("snapshots").remove(paths);
        }
      }
    }

    // 3. Delete the test from the database
    // This will CASCADE delete questions, answer_keys, attempts, answers, invites, and proctor_events
    const { error } = await supabase.from("tests").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Failed to fully delete test:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
