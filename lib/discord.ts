import { createClient } from "@/lib/supabase/server";

export async function pushDiscordHallOfFame(testId: string, isAutoPublish: boolean = false) {
  const supabase = await createClient();

  // Fetch Test and Owner Profile
  const { data: test } = await supabase
    .from("tests")
    .select("title, results_published, owner_id, profiles!owner_id(discord_hall_of_fame_url)")
    .eq("id", testId)
    .single();

  if (!test) return { error: "test not found" };
  const webhookUrl = (test.profiles as any)?.discord_hall_of_fame_url;
  if (!webhookUrl) return { error: "no webhook configured" };

  // Fetch Leaderboard for Hall of Fame
  const { data: attempts } = await supabase
    .from("attempts")
    .select("score, started_at, submitted_at, profile:profiles(full_name, email)")
    .eq("test_id", testId)
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

  const top3 = validAttempts.slice(0, 3);
  
  // Add MOM or Auto indicator
  const modeIndicator = isAutoPublish ? "*(Auto-published Mode)*" : "*(MOM - Manual Override Mode)*";
  
  let content = `🏆 **RESULTS ARE IN: ${test.title}** 🏆\n${modeIndicator}\n\nThe scores have been finalized. Here is the Hall of Fame:\n\n`;
  
  if (top3.length > 0) content += `🥇 **1st Place:** ${(top3[0].profile as any)?.full_name || (top3[0].profile as any)?.email?.split('@')[0]} (${top3[0].score} pts)\n`;
  if (top3.length > 1) content += `🥈 **2nd Place:** ${(top3[1].profile as any)?.full_name || (top3[1].profile as any)?.email?.split('@')[0]} (${top3[1].score} pts)\n`;
  if (top3.length > 2) content += `🥉 **3rd Place:** ${(top3[2].profile as any)?.full_name || (top3[2].profile as any)?.email?.split('@')[0]} (${top3[2].score} pts)\n`;
  
  content += `\nAll candidates can now view their individual results and AI roasts on the platform.`;

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content })
    });
    return { success: res.ok };
  } catch (e: any) {
    console.error("Failed to post to discord hof:", e);
    return { error: e.message };
  }
}
