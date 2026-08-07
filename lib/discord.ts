export interface TeaserStats {
  testTitle: string;
  totalSubmissions: number;
  avgScorePct: number;
  countAbove90: number;
  pctAbove90: number;
}

/**
 * Sends an anonymous hype teaser webhook notification to Discord.
 * STRICT ANONYMITY: Zero student names, emails, user IDs, or individual scores are included.
 */
export async function sendTeaserPing(webhookUrl: string, stats: TeaserStats) {
  const embed = {
    title: "⚡ TEASER ALERT: EXAM RESULTS PENDING!",
    description: `Submissions have been recorded for **${stats.testTitle}**! Here is an anonymous preview of how the cohort performed:`,
    color: 0x5865F2, // Discord Blurple
    fields: [
      {
        name: "📊 Total Submissions",
        value: `**${stats.totalSubmissions}** completed attempt${stats.totalSubmissions === 1 ? "" : "s"}`,
        inline: true,
      },
      {
        name: "📈 Class Average",
        value: `**${stats.avgScorePct.toFixed(1)}%**`,
        inline: true,
      },
      {
        name: "🔥 High Performers (>90%)",
        value: `**${stats.countAbove90}** candidate${stats.countAbove90 === 1 ? "" : "s"} (${stats.pctAbove90.toFixed(1)}%)`,
        inline: true,
      },
    ],
    footer: {
      text: "Take-A-Test Proctoring Engine • Official Results Pending Reveal",
    },
    timestamp: new Date().toISOString(),
  };

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: "⚡ **EXAM RESULTS TEASER PING** ⚡",
      embeds: [embed],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Discord Webhook failed with status ${res.status}: ${text}`);
  }

  return { success: true };
}
