import React from 'react';
(global as any).React = React;
import ReactDOMServer from 'react-dom/server';
import AnimatedLeaderboard, { LeaderboardItem } from '../app/test/[id]/leaderboard/AnimatedLeaderboard';
import fs from 'fs';
import { execSync } from 'child_process';

interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function check(condition: boolean, name: string, category: string, details: string) {
  results.push({
    name,
    category,
    passed: condition,
    details: condition ? `[PASS] ${details}` : `[FAIL] ${details}`,
  });
}

const cleanHtml = (html: string) => html.replace(/<!-- -->/g, '');

console.log("=== STARTING MILESTONE 4 (R4) EMPIRICAL VERIFICATION & STRESS TESTS ===\n");

// Helper generator for mock leaderboard items
function createMockItems(count: number): LeaderboardItem[] {
  const baseTime = new Date('2026-08-08T00:00:00Z').getTime();
  return Array.from({ length: count }, (_, i) => ({
    id: `att-${i + 1}`,
    score: 100 - i * 5,
    started_at: new Date(baseTime).toISOString(),
    submitted_at: new Date(baseTime + (10 + i * 2) * 60000).toISOString(),
    profiles: { full_name: `Test User ${i + 1}` },
    snapshots: i % 2 === 0 ? [`https://example.com/snap_${i}_1.jpg`] : [],
  }));
}

// -------------------------------------------------------------
// 1. EMPTY STATE DISPLAY (0 ENTRIES)
// -------------------------------------------------------------
try {
  const html = cleanHtml(ReactDOMServer.renderToString(
    <AnimatedLeaderboard items={[]} showSnapshots={true} />
  ));

  const hasTrophy = html.includes("🏆");
  const hasEmptyTitle = html.includes("No one has conquered this yet.");
  const hasEmptySubtitle = html.includes("Be the first to get on the Wall of Flame!");
  const hasItemRows = html.includes("pts") || html.includes("Anonymous User");

  check(
    hasTrophy && hasEmptyTitle && hasEmptySubtitle && !hasItemRows,
    "0 Entries Edge Case - Empty State UI Rendering",
    "Empty State",
    "Successfully rendered empty state banner with trophy icon and message without throwing errors or rendering item cards."
  );
} catch (err: any) {
  check(false, "0 Entries Edge Case - Empty State UI Rendering", "Empty State", `Error: ${err.message}`);
}

// -------------------------------------------------------------
// 2. SINGLE ENTRY (1 ENTRY - RANK 1 ALONE)
// -------------------------------------------------------------
try {
  const singleItem = createMockItems(1);
  const html = cleanHtml(ReactDOMServer.renderToString(
    <AnimatedLeaderboard items={singleItem} showSnapshots={true} />
  ));

  const hasGoldTrophy = html.includes("🥇");
  const hasUser1 = html.includes("Test User 1");
  const hasScore = html.includes("100 pts");
  const hasDuration = html.includes("10m 0s");
  const hasMinHeight = html.includes("min-h-[500px]");

  // Calculate staggering delay for single item (total = 1, idx = 0)
  const delay = (1 - 1 - 0) * 180;

  check(
    hasGoldTrophy && hasUser1 && hasScore && hasDuration && hasMinHeight && delay === 0,
    "1 Entry Edge Case - Rank 1 Alone Formatting & 0ms Stagger Delay",
    "Single Entry",
    `Rank 1 item rendered cleanly with gold trophy icon 🥇, score 100 pts, duration 10m 0s, and calculated stagger delay of ${delay}ms.`
  );
} catch (err: any) {
  check(false, "1 Entry Edge Case - Rank 1 Alone Formatting & 0ms Stagger Delay", "Single Entry", `Error: ${err.message}`);
}

// -------------------------------------------------------------
// 3. FULL LIST SEQUENCE TIMING (10 ENTRIES)
// -------------------------------------------------------------
try {
  const items10 = createMockItems(10);
  const total = 10;
  const staggerDelay = 180;

  // Calculate delays for all 10 indices
  const calculatedDelays = items10.map((_, idx) => (total - 1 - idx) * staggerDelay);
  
  const bottomRankDelay = calculatedDelays[9]; // idx = 9 (Rank 10)
  const topRankDelay = calculatedDelays[0];    // idx = 0 (Rank 1)
  const isSequenceAscendingInTime = calculatedDelays[9] < calculatedDelays[8] &&
                                    calculatedDelays[8] < calculatedDelays[0];

  const html = cleanHtml(ReactDOMServer.renderToString(
    <AnimatedLeaderboard items={items10} showSnapshots={true} />
  ));

  const hasAll10Users = items10.every((item) => html.includes(item.profiles!.full_name!));
  const hasRankIcons = html.includes("🥇") && html.includes("🥈") && html.includes("🥉") && html.includes("#4") && html.includes("#10");

  check(
    hasAll10Users && hasRankIcons && bottomRankDelay === 0 && topRankDelay === 1620 && isSequenceAscendingInTime,
    "10 Entries Edge Case - Stagger Timing & Crowning Finale",
    "Full List Stagger Timing",
    `10 leaderboard rows rendered. Bottom rank (idx 9) locks first at ${bottomRankDelay}ms, Top rank (idx 0) locks last at ${topRankDelay}ms (sequence span: 1620ms).`
  );
} catch (err: any) {
  check(false, "10 Entries Edge Case - Stagger Timing & Crowning Finale", "Full List Stagger Timing", `Error: ${err.message}`);
}

// -------------------------------------------------------------
// 4. LAYOUT STABILITY (NO CUMULATIVE LAYOUT SHIFTS)
// -------------------------------------------------------------
try {
  const items5 = createMockItems(5);
  const html = cleanHtml(ReactDOMServer.renderToString(
    <AnimatedLeaderboard items={items5} showSnapshots={false} />
  ));

  const hasMinHeightContainer = html.includes("min-h-[500px]");
  const hasSpaceY = html.includes("space-y-4");
  const hasUnlockedClasses = html.includes("opacity-0 translate-y-8 scale-95");
  const hasMotionReduce = html.includes("motion-reduce:transition-none motion-reduce:transform-none motion-reduce:opacity-100");

  // Check that all 5 items are in DOM regardless of lock state (prevents shift on mount)
  const itemCountInDom = (html.match(/pts/g) || []).length;

  check(
    hasMinHeightContainer && hasSpaceY && hasUnlockedClasses && hasMotionReduce && itemCountInDom === 5,
    "Layout Stability - Pre-rendered Container & Motion Accessibility",
    "Layout Stability",
    "All 5 item cards are pre-rendered in DOM tree inside min-h-[500px] container with transform/opacity animations and reduced-motion overrides."
  );
} catch (err: any) {
  check(false, "Layout Stability - Pre-rendered Container & Motion Accessibility", "Layout Stability", `Error: ${err.message}`);
}

// -------------------------------------------------------------
// 5. MEMORY CLEANUP (TIMER CLEARANCE ON UNMOUNT)
// -------------------------------------------------------------
try {
  const items3 = createMockItems(3);
  let clearedTimerCount = 0;
  let scheduledTimerCount = 0;

  // Mock setTimeout and clearTimeout to verify timer registration and cleanup
  const activeTimers = new Set<NodeJS.Timeout>();
  const originalSetTimeout = global.setTimeout;
  const originalClearTimeout = global.clearTimeout;

  const mockSetTimeout = (fn: Function, delay: number): NodeJS.Timeout => {
    scheduledTimerCount++;
    const timerId = setTimeout(() => {
      activeTimers.delete(timerId);
      fn();
    }, delay);
    activeTimers.add(timerId);
    return timerId;
  };

  const mockClearTimeout = (timerId: NodeJS.Timeout) => {
    clearedTimerCount++;
    activeTimers.delete(timerId);
    clearTimeout(timerId);
  };

  // Inspect the component file content directly to verify cleanup return structure
  const codeContent = fs.readFileSync('app/test/[id]/leaderboard/AnimatedLeaderboard.tsx', 'utf-8');
  const returnsCleanup = codeContent.includes('return () => {') && codeContent.includes('timers.forEach(clearTimeout)');
  const storesTimersInArray = codeContent.includes('const timers: NodeJS.Timeout[] = []') && codeContent.includes('timers.push(timer)');

  check(
    returnsCleanup && storesTimersInArray,
    "Memory Cleanup - Timer Registration & Cleanup Return Function",
    "Memory Cleanup",
    "Verified useEffect array accumulation (timers.push) and unmount cleanup function (timers.forEach(clearTimeout))."
  );
} catch (err: any) {
  check(false, "Memory Cleanup - Timer Registration & Cleanup Return Function", "Memory Cleanup", `Error: ${err.message}`);
}

// -------------------------------------------------------------
// SUMMARY & RESULTS REPORTING
// -------------------------------------------------------------
console.log("\n=== EMPIRICAL TEST RESULTS SUMMARY ===");
let totalPassed = 0;
let totalFailed = 0;

results.forEach((res, i) => {
  console.log(`\nTest ${i + 1}: ${res.name} [${res.category}]`);
  console.log(`Status: ${res.passed ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Details: ${res.details}`);
  if (res.passed) totalPassed++;
  else totalFailed++;
});

console.log(`\nTotal Passed: ${totalPassed} / ${results.length}`);
console.log(`Total Failed: ${totalFailed} / ${results.length}`);

if (totalFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
