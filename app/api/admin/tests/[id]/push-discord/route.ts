import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    // Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { data: profile } = await supabase.from("profiles").select("role, discord_hall_of_fame_url").eq("id", user.id).single();
    if (profile?.role !== "admin") return NextResponse.json({ error: "unauthorized" }, { status: 403 });

    // Fetch Test
    const { data: test } = await supabase.from("tests").select("title, results_published").eq("id", id).single();
    if (!test) return NextResponse.json({ error: "test not found" }, { status: 404 });

    // Fetch Leaderboard for Hall of Fame
    const { data: attempts } = await supabase
      .from("attempts")
      .select("score, started_at, submitted_at, profile:profiles(full_name, email)")
      .eq("test_id", id)
      .eq("status", "submitted")
      .order("score", { ascending: false });

    // Rank attempts
    const validAttempts = (attempts || []).filter(a => a.submitted_at && a.started_at);
    validAttempts.sort((a, b) => {
      if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
      const tA = new Date(a.submitted_at!).getTime() - new Date(a.started_at!).getTime();
      const tB = new Date(b.submitted_at!).getTime() - new Date(b.started_at!).getTime();
      return tA - tB;
    });

    if (profile.discord_hall_of_fame_url) {
      const top3 = validAttempts.slice(0, 3);
      let content = `🏆 **RESULTS ARE IN: ${test.title}** 🏆\n\nThe scores have been finalized. Here is the Hall of Fame:\n\n`;
      
      if (top3.length > 0) content += `🥇 **1st Place:** ${(top3[0].profile as any)?.full_name || (top3[0].profile as any)?.email?.split('@')[0]} (${top3[0].score} pts)\n`;
      if (top3.length > 1) content += `🥈 **2nd Place:** ${(top3[1].profile as any)?.full_name || (top3[1].profile as any)?.email?.split('@')[0]} (${top3[1].score} pts)\n`;
      if (top3.length > 2) content += `🥉 **3rd Place:** ${(top3[2].profile as any)?.full_name || (top3[2].profile as any)?.email?.split('@')[0]} (${top3[2].score} pts)\n`;
      
      content += `\nAll candidates can now view their individual results and AI roasts on the platform.`;

      try {
        await fetch(profile.discord_hall_of_fame_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content })
        });
      } catch (e) {
        console.error("Failed to post to discord hof:", e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
