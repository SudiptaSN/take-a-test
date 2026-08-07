import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pushDiscordHallOfFame } from "@/lib/discord";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    // Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return NextResponse.json({ error: "unauthorized" }, { status: 403 });

    const result = await pushDiscordHallOfFame(id, false);
    if (result.error) return NextResponse.json({ error: result.error }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
