import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Missing Supabase env vars" }, { status: 500 });
    }

    // Create a Supabase client with the service role key to bypass RLS in the cron job
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch tests that are published, have an available_from date, and haven't had both reminders sent
    const { data: tests, error } = await supabase
      .from("tests")
      .select(`
        *,
        profiles!tests_owner_id_fkey (
          discord_webhook_url
        )
      `)
      .eq("is_published", true)
      .not("available_from", "is", null)
      .or("reminder_24h_sent.eq.false,reminder_1h_sent.eq.false");

    if (error) throw error;
    
    if (!tests || tests.length === 0) {
      return NextResponse.json({ message: "No tests require reminders at this time." });
    }

    const now = new Date().getTime();
    let remindersSent = 0;

    for (const test of tests) {
      const webhookUrl = test.profiles?.discord_webhook_url;
      if (!webhookUrl) continue;

      const availableFrom = new Date(test.available_from!).getTime();
      const msUntilStart = availableFrom - now;
      const hoursUntilStart = msUntilStart / (1000 * 60 * 60);

      // Only send if the test is in the future
      if (hoursUntilStart < 0) continue;

      let reminderType: '24h' | '1h' | null = null;
      let updateFields: any = {};

      if (hoursUntilStart <= 1 && !test.reminder_1h_sent) {
        reminderType = '1h';
        updateFields = { reminder_1h_sent: true };
      } else if (hoursUntilStart <= 24 && hoursUntilStart > 1 && !test.reminder_24h_sent) {
        reminderType = '24h';
        updateFields = { reminder_24h_sent: true };
      }

      if (reminderType) {
        const link = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://assonfire.vercel.app'}/test/${test.id}`;
        
        const title = reminderType === '1h' 
          ? `🔥 YOUR ASS IS ON FIRE! EXAM STARTS IN 1 HOUR` 
          : `📅 ASS ON FIRE PRE-IGNITION! EXAM TOMORROW`;
          
        const description = reminderType === '1h' 
          ? "The examination window is opening shortly. Prepare your environment, close your other tabs, and get ready for the hardcore proctoring engine. You have 1 hour."
          : "An exam has been scheduled for tomorrow. This is your 24-hour warning to prepare.";

        const embed = {
          title: title,
          description: test.description ? `**Exam:** ${test.title}\n*${test.description}*\n\n${description}` : `**Exam:** ${test.title}\n\n${description}`,
          color: reminderType === '1h' ? 0xFF0000 : 0xE85D04, // Red for 1h, Orange for 24h
          fields: [
            { name: "⏱️ Duration", value: `**${test.duration_minutes}** minutes`, inline: true },
            { name: "🔒 Access", value: test.invite_only ? "Invite Only" : "Public (with code if set)", inline: true },
            { name: "🗓️ Window", value: `${new Date(test.available_from!).toLocaleString()} - ${test.available_until ? new Date(test.available_until).toLocaleString() : 'Forever'}`, inline: false }
          ],
          footer: { text: "AssOnFire Proctoring Engine" },
          timestamp: new Date().toISOString(),
        };

        try {
          const res = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: `🚨 **@everyone** ${reminderType === '1h' ? '1 HOUR WARNING!' : '24 HOUR REMINDER!'} Access here: ${link}`,
              embeds: [embed]
            })
          });

          if (res.ok) {
            await supabase.from("tests").update(updateFields).eq("id", test.id);
            remindersSent++;
          } else {
            console.error(`Failed to send discord webhook for test ${test.id}: ${res.statusText}`);
          }
        } catch (e) {
          console.error(`Error sending discord webhook for test ${test.id}:`, e);
        }
      }
    }

    return NextResponse.json({ message: `Successfully sent ${remindersSent} reminders.` });
  } catch (error: any) {
    console.error("Cron Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
