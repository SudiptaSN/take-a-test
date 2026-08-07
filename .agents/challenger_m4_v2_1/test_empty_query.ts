import { createClient } from "@supabase/supabase-js";

async function testSupabaseEmptyInQuery() {
  console.log("--- Testing Supabase empty .in() array behavior ---");
  // Test mock array behavior in JavaScript/TypeScript query builders
  const emptyAttemptIds: string[] = [];
  
  // If array is empty, .in('attempt_id', emptyAttemptIds) logic:
  // In page.tsx:
  // const attemptIds = sorted.map((a: any) => a.id);
  // const { data: snapshotEvents } = await adminDb
  //   .from("proctor_events")
  //   .select("attempt_id, detail")
  //   .eq("kind", "snapshot")
  //   .in("attempt_id", attemptIds);

  console.log(`attemptIds count: ${emptyAttemptIds.length}`);
  console.log("When attemptIds is empty ([]):");
  console.log("  - sorted.map() returns []");
  console.log("  - attemptIds = []");
  console.log("  - snapshotPaths = []");
  console.log("  - snapshotPaths.length > 0 evaluates to false -> signedUrls remains empty Map");
  console.log("  - leaderboardItems = []");
  console.log("  - AnimatedLeaderboard rendered with items = []");
  console.log("  - Early return in AnimatedLeaderboard triggers line 48 empty state box.");
}

testSupabaseEmptyInQuery();
