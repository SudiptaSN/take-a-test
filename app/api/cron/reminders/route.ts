import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    
    // Auth Check for Cron - we skip user auth since this is called by Vercel Cron
    // We fetch the admin's webhook URL
    const { data: admin } = await supabase.from("profiles").select("discord_webhook_url").eq("role", "admin").single();
    if (!admin?.discord_webhook_url) return NextResponse.json({ error: "No webhook configured" });

    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const oneHourFromNow = new Date(now.getTime() + 1 * 60 * 60 * 1000);

    // Fetch unpublished tests that have a start date
    const { data: tests } = await supabase
      .from("tests")
      .select("id, title, available_from, reminder_24h_sent, reminder_1h_sent")
      .not("available_from", "is", null);

    if (!tests) return NextResponse.json({ success: true, message: "No tests found" });

    for (const test of tests) {
      const testStart = new Date(test.available_from!);
      
      // 24 Hour Reminder
      if (testStart <= twentyFourHoursFromNow && testStart > now && !test.reminder_24h_sent) {
        await sendDiscordPing(admin.discord_webhook_url, test.id, `🚨 **T-MINUS 24 HOURS** 🚨\n\n**${test.title}** opens tomorrow at ${testStart.toLocaleTimeString()}.\nGet off Discord and start studying. No excuses.`);
        await supabase.from("tests").update({ reminder_24h_sent: true }).eq("id", test.id);
      }
      
      // 1 Hour Reminder
      if (testStart <= oneHourFromNow && testStart > now && !test.reminder_1h_sent) {
        await sendDiscordPing(admin.discord_webhook_url, test.id, `🔥 **FINAL WARNING** 🔥\n\n**${test.title}** opens in EXACTLY 1 HOUR.\nThe portal is arming. Prepare yourself.`);
        await supabase.from("tests").update({ reminder_1h_sent: true }).eq("id", test.id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function sendDiscordPing(url: string, testId: string, content: string) {
  try {
    // We omit the direct test link because they can't access it yet anyway, and they know where the site is.
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: `@everyone\n${content}` })
    });
  } catch (e) {
    console.error("Failed to ping discord", e);
  }
}
