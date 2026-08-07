# Handoff Report — Explorer M4 (Milestone 4: Dramatic Leaderboard Entry - R4)

## 1. Observation

### 1.1 Codebase Inspection & Route Mapping
- **Public Leaderboard Route**: `app/test/[id]/leaderboard/page.tsx` (Server Component).
- **Data Dependencies**:
  - `tests` table: `id`, `title`, `is_published`, `is_leaderboard_public`, `results_published`, `auto_publish_results`.
  - `attempts` table: `id`, `score`, `started_at`, `submitted_at`, `profiles!inner ( full_name )` where `score` is not null.
  - `proctor_events` table (service role query): `attempt_id`, `detail` where `kind = 'snapshot'`.
  - Storage bucket (`snapshots`): Signed URLs generated for top 10 candidates when results are published.
- **Current Rendering Structure**:
  - `app/test/[id]/leaderboard/page.tsx` line 77–117:
    ```tsx
    sorted.map((att: any, idx: number) => {
      ...
      return (
        <div key={att.id} className="p-4 rounded-lg bg-zinc-900 border border-zinc-800">
          {/* Rank badge, name, score, duration, webcam snapshots */}
        </div>
      );
    })
    ```
  - Currently renders all top 10 items **statically** in a single pass on initial server render.

### 1.2 Package Dependencies (`package.json`)
- Next.js 15.5.19 (App Router), React 18.3.1, Tailwind CSS 3.4.13.
- `framer-motion` is **not** currently listed in `package.json` dependencies.
- Micro-animations elsewhere in the project rely on CSS keyframes in `app/globals.css` (e.g. `@keyframes fadeUp`, `.animate-fade-up`) and custom HTML5 canvas logic (e.g., `components/ConfettiEffect.tsx`).

### 1.3 Entry Points to Leaderboard
- `components/ResultsRevealGuard.tsx` (lines 86–93): "View Wall of Flame 🔥" button linking to `/test/${test.id}/leaderboard`.
- `app/dashboard/page.tsx` (lines 82–84): "🏆 Leaderboard" button on test cards when `is_leaderboard_public === true`.

---

## 2. Logic Chain

1. **Server vs. Client Component Separation**:
   - `app/test/[id]/leaderboard/page.tsx` handles database operations (Supabase authentication check, signed URL generation using service role client `adminDb`).
   - Animations require client-side execution (`useEffect`, `useState`, or CSS animation delays triggered on mount).
   - Therefore, data fetching MUST remain in `page.tsx` (Server Component), while row rendering and animation logic MUST be extracted into a dedicated Client Component (`components/AnimatedLeaderboard.tsx` or `app/test/[id]/leaderboard/AnimatedLeaderboard.tsx`).

2. **Bottom-to-Top Staggered Sequence Calculation**:
   - The query sorts candidates from highest rank (Rank 1 at `index = 0`) to lowest rank (Rank N at `index = N - 1`).
   - The requirement explicitly demands: *"ranks should dynamically slide and lock into place one by one from bottom to top"*.
   - To achieve bottom-to-top sequence:
     - Lowest rank (index $N - 1$, e.g., Rank 10) MUST animate **first** (delay = 0ms).
     - Next lowest rank (index $N - 2$, e.g., Rank 9) MUST animate **second** (delay = $1 \times \text{staggerDelay}$).
     - Top rank (index $0$, Rank 1) MUST animate **last** (delay = $(N - 1) \times \text{staggerDelay}$).
   - **Delay Formula** for item at `index` (0-indexed, $N$ total items):
     $$\text{delay}(i) = (N - 1 - i) \times \text{staggerDelay}$$
     Recommended $\text{staggerDelay} = 150\text{ms} - 200\text{ms}$ (total animation time for 10 ranks $\approx 1.8\text{s} - 2.0\text{s}$).

3. **Sequential Lock-in Effect**:
   - Sliding phase: Row moves from `translateY(30px)` and `opacity: 0` to `translateY(0)` and `opacity: 1`.
   - Lock-in impact phase: At the instant a row reaches position, trigger a visual lock-in cue:
     - Brief scale pulse / recoil (`scale-[1.02]` $\rightarrow$ `scale-100`).
     - Accent border flash (`border-orange-500/60` with `shadow-[0_0_15px_rgba(249,115,22,0.3)]`).
     - Rank #1 (Gold) finale lock-in: Extended golden flame glow (`border-amber-400` with `shadow-[0_0_25px_rgba(234,88,12,0.5)]`).

4. **Reduced Motion Accessibility**:
   - Users with `prefers-reduced-motion: reduce` must not experience large staggered translation animations.
   - Using Tailwind utility `motion-reduce:animate-none` or CSS `@media (prefers-reduced-motion: reduce)` resets delays to `0s` and transforms to `none`, immediately displaying all rows cleanly.

5. **Layout Stability & Prevention of Layout Shifts (CLS)**:
   - Use CSS `transform: translateY(...)` for sliding, as CSS transforms run on the compositor thread and do not alter layout flow dimensions.
   - Pre-allocate container min-height (`min-h-[600px]`) so layout height remains stable as ranks lock in sequentially.

---

## 3. Caveats

1. **Dependency Footprint**:
   - `framer-motion` is not currently in `package.json`. While Framer Motion `AnimatePresence` and `motion.div` offer high-level APIs, installing it adds ~30KB gzipped.
   - Pure React Client Component + Tailwind CSS keyframes/transitions achieves identical visual quality with **zero added bundle size**.
   - Strategy provides implementation guidance for both pure CSS keyframes (recommended) and optional Framer Motion.
2. **Empty / Few Rows Edge Case**:
   - If `sorted.length === 0`, display empty state without animation.
   - If `sorted.length === 1`, Rank 1 animates immediately at `0ms` delay.
3. **Data Refresh / Re-mount**:
   - Animation should trigger cleanly on initial mount. If props update without unmounting, `key={att.id}` ensures proper element reconciliation.

---

## 4. Conclusion & Technical Strategy

### 4.1 Recommended Architecture & Component Hierarchy

```
app/test/[id]/leaderboard/
├── page.tsx                       [Server Component: Fetches data & signed URLs]
└── AnimatedLeaderboard.tsx        [Client Component: Handles bottom-to-top sequence & lock-in]
```

### 4.2 Detailed Implementation Details

#### Proposed Client Component (`components/AnimatedLeaderboard.tsx` or `app/test/[id]/leaderboard/AnimatedLeaderboard.tsx`):

```tsx
"use client";

import { useEffect, useState } from "react";
import ProctorSnapshotGallery from "@/components/ProctorSnapshotGallery";

interface LeaderboardItem {
  id: string;
  score: number;
  started_at: string;
  submitted_at: string;
  profiles?: { full_name?: string };
  snapshots: string[];
}

interface AnimatedLeaderboardProps {
  items: LeaderboardItem[];
  showSnapshots: boolean;
}

export default function AnimatedLeaderboard({ items, showSnapshots }: AnimatedLeaderboardProps) {
  const [lockedRanks, setLockedRanks] = useState<Set<number>>(new Set());
  const total = items.length;

  useEffect(() => {
    // Reveal and lock-in items sequentially from bottom (total-1) to top (0)
    const timers: NodeJS.Timeout[] = [];
    const staggerDelay = 180; // ms per step

    items.forEach((_, idx) => {
      // Bottom item (idx = total - 1) gets delay 0ms
      // Top item (idx = 0) gets max delay: (total - 1 - idx) * staggerDelay
      const delay = (total - 1 - idx) * staggerDelay;
      
      const timer = setTimeout(() => {
        setLockedRanks((prev) => new Set(prev).add(idx));
      }, delay);
      
      timers.push(timer);
    });

    return () => timers.forEach(clearTimeout);
  }, [items, total]);

  if (items.length === 0) {
    return (
      <div className="p-12 text-center text-zinc-500 bg-zinc-900/50 rounded-lg border border-dashed border-zinc-800">
        <div className="text-4xl mb-4">🏆</div>
        <p className="text-lg font-medium text-zinc-400">No one has conquered this yet.</p>
        <p className="text-sm mt-1">Be the first to get on the Wall of Flame!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 min-h-[500px]">
      {items.map((att, idx) => {
        const isLocked = lockedRanks.has(idx);
        const durMs = new Date(att.submitted_at).getTime() - new Date(att.started_at).getTime();
        const mins = Math.floor(durMs / 60000);
        const secs = Math.floor((durMs % 60000) / 1000);
        const isTopRank = idx === 0;

        // Sequence delay for CSS transition fallback
        const sequenceDelayMs = (total - 1 - idx) * 180;

        return (
          <div
            key={att.id}
            style={{
              transitionDelay: `${sequenceDelayMs}ms`,
            }}
            className={`p-4 rounded-lg bg-zinc-900 border transition-all duration-500 ease-out transform ${
              isLocked
                ? isTopRank
                  ? "opacity-100 translate-y-0 scale-100 border-amber-400/80 shadow-[0_0_25px_rgba(245,158,11,0.3)] bg-gradient-to-r from-zinc-900 via-zinc-900 to-amber-950/20"
                  : "opacity-100 translate-y-0 scale-100 border-orange-500/40 shadow-[0_0_15px_rgba(249,115,22,0.15)]"
                : "opacity-0 translate-y-8 scale-95 border-zinc-800 pointer-events-none"
            } motion-reduce:transition-none motion-reduce:transform-none motion-reduce:opacity-100`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`text-2xl font-bold w-8 text-right ${isTopRank ? "animate-bounce" : ""}`}>
                  {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                </div>
                <div className="font-semibold text-lg text-zinc-200">
                  {att.profiles?.full_name || "Anonymous User"}
                </div>
              </div>
              <div className="text-right">
                <div className={`text-xl font-bold ${isTopRank ? "text-amber-400" : "text-orange-500"}`}>
                  {att.score} pts
                </div>
                <div className="text-xs text-zinc-500 font-mono">{mins}m {secs}s</div>
              </div>
            </div>

            {showSnapshots && att.snapshots.length > 0 && (
              <div className="mt-4 pt-4 border-t border-zinc-800/50">
                <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Webcam Proof (Peer Review)</p>
                <ProctorSnapshotGallery
                  snapshots={att.snapshots}
                  variant="horizontal"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

#### Refactored `app/test/[id]/leaderboard/page.tsx`:
Replace static mapping (lines 77-118) with:
```tsx
const leaderboardItems = sorted.map((att: any) => {
  const attemptSnapshots = (snapshotEvents || [])
    .filter(e => e.attempt_id === att.id && e.detail?.path)
    .map(e => signedUrls.get(e.detail.path))
    .filter(Boolean)
    .slice(0, 4);

  return {
    ...att,
    snapshots: attemptSnapshots,
  };
});

// Inside return:
<div className="card !p-4">
  <AnimatedLeaderboard
    items={leaderboardItems}
    showSnapshots={Boolean(test.results_published || test.auto_publish_results)}
  />
</div>
```

---

## 5. Verification Method

### 5.1 Verification Commands
1. **Next.js Production Build**:
   ```bash
   npm run build
   ```
   Must pass clean without TypeScript or ESLint errors, verifying route `/test/[id]/leaderboard`.

2. **Static Code Verification**:
   Inspect `app/test/[id]/leaderboard/page.tsx` and `app/test/[id]/leaderboard/AnimatedLeaderboard.tsx` for:
   - Correct bottom-to-top delay formula: `(total - 1 - idx) * staggerDelay`.
   - `motion-reduce` or `prefers-reduced-motion` classes applied.
   - Clean data handoff between Server Component and Client Component.

### 5.2 Invalidation Conditions
- Animate top-to-bottom instead of bottom-to-top (violates R4 requirement).
- Instant layout reflow or shift during entry sequence (violates layout stability).
- Breaking Server Component constraints by making `page.tsx` a Client Component with `"use client"`.
