import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendTeaserPing } from "@/lib/discord";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, discord_webhook_url")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized. Admin role required." }, { status: 403 });
  }

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL || profile?.discord_webhook_url;
  if (!webhookUrl) {
    return NextResponse.json(
      { error: "No Discord webhook configured. Please set your Discord Webhook URL in admin settings." },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const testId = body.testId;

  if (!testId) {
    return NextResponse.json({ error: "testId is required" }, { status: 400 });
  }

  const { data: test } = await supabase
    .from("tests")
    .select("title")
    .eq("id", testId)
    .single();

  if (!test) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }

  const { data: questions } = await supabase
    .from("questions")
    .select("points")
    .eq("test_id", testId);

  const totalPossiblePoints = (questions || []).reduce((acc, q) => acc + (q.points || 1), 0);

  const { data: attempts } = await supabase
    .from("attempts")
    .select("score")
    .eq("test_id", testId)
    .eq("status", "submitted");

  if (!attempts || attempts.length === 0) {
    return NextResponse.json(
      { error: "No candidate submissions recorded yet for this test." },
      { status: 400 }
    );
  }

  const totalSubmissions = attempts.length;
  const totalScoreSum = attempts.reduce((acc, a) => acc + (a.score || 0), 0);

  const avgScorePct = totalPossiblePoints > 0
    ? (totalScoreSum / (totalSubmissions * totalPossiblePoints)) * 100
    : 0;

  const countAbove90 = totalPossiblePoints > 0
    ? attempts.filter(a => ((a.score || 0) / totalPossiblePoints) > 0.90).length
    : 0;

  const pctAbove90 = (countAbove90 / totalSubmissions) * 100;

  try {
    await sendTeaserPing(webhookUrl, {
      testTitle: test.title,
      totalSubmissions,
      avgScorePct,
      countAbove90,
      pctAbove90,
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to post teaser ping to Discord" }, { status: 500 });
  }
}
