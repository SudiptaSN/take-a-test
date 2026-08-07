# Handoff Report: Milestone 2 — Results Countdown Clock (R2) Strategy & Architecture

## 1. Observation

### 1.1 Database & Schema (`supabase/schema.sql`, `supabase/migrations`)
- In `supabase/schema.sql` (lines 29-48), the `tests` table currently contains fields: `id`, `owner_id`, `title`, `description`, `duration_minutes`, `is_published`, `require_seb`, `invite_only`, `access_code`, `available_from`, `available_until`, `is_leaderboard_public`, `is_hardcore_mode`, `auto_publish_results`, `results_published`, `reminder_24h_sent`, `reminder_1h_sent`, `created_at`.
- There is currently **no** `results_reveal_date` field in `tests`.
- Migration history in `supabase/migrations/` (e.g. `20260807163340_add_auto_publish_results.sql`) uses standard idempotent SQL statements:
  ```sql
  ALTER TABLE tests ADD COLUMN IF NOT EXISTS auto_publish_results BOOLEAN NOT NULL DEFAULT false;
  ```

### 1.2 Admin Test Management & Settings (`app/admin/tests/[id]/page.tsx`, `components/DateTimePicker.tsx`)
- In `app/admin/tests/[id]/page.tsx`, `updateTest` is defined as (lines 70-89):
  ```tsx
  const updateTest = async (patch: any) => {
    let newTest = { ...test, ...patch };
    ...
    setTest(newTest);
    await supabase.from("tests").update(patch).eq("id", id);
  };
  ```
- General Settings UI (lines 274-293) currently features inputs for Duration, Available From, and Available Until using `<DateTimePicker />` (`components/DateTimePicker.tsx`).
- `DateTimePicker` receives props `value: string` (ISO string or empty) and `onChange: (isoString: string) => void`.
- Post-Test Actions UI (lines 446-501) includes toggles for `auto_publish_results` and `results_published` (Manual Publish Override MOM).

### 1.3 Student Test Results & Review Pages (`app/test/[id]/page.tsx`, `app/test/[id]/leaderboard/page.tsx`, `app/dashboard/page.tsx`)
- `app/test/[id]/page.tsx` is an async Next.js Server Component.
- For submitted attempts (lines 102-140):
  ```tsx
  if (attempt.status !== "in_progress") {
    const isTerminated = attempt.status === "terminated";
    return (
      <main className="max-w-xl mx-auto p-10 text-center">
        ...
        ) : (test.results_published || test.auto_publish_results) ? (
          <div className="bg-red-950/20 border border-red-900/50 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-zinc-400 mb-1">Your Score</h2>
            <div className="text-6xl font-bold text-orange-500">{attempt.score ?? 0} pts</div>
          </div>
        ) : (
          <p className="text-zinc-400 mt-2 mb-8 bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg">
            Your response has been recorded. Results are currently hidden and will be pushed to the Discord Hall of Fame by the admin.
          </p>
        )}
  ```
- Currently, result visibility depends only on `(test.results_published || test.auto_publish_results)`.

### 1.4 Confetti & Countdown Timer Capabilities (`package.json`, `components/CountdownTimer.tsx`)
- `package.json` currently does not list `canvas-confetti` or `@types/canvas-confetti`.
- `components/CountdownTimer.tsx` exists and renders Days, Hours, Minutes, Seconds using `setInterval` (1000ms ticker).
- `npx next build --no-lint` completes successfully in 4.3 seconds without build errors.

---

## 2. Logic Chain

1. **Database Schema Extension**:
   - Adding `results_reveal_date timestamptz` column to the `tests` table via a new migration (`supabase/migrations/20260808000000_add_results_reveal_date.sql`) and updating `supabase/schema.sql` allows tests to store an optional reveal date/time timestamp.

2. **Admin UI Integration**:
   - Because `updateTest(patch)` sends patch objects directly to Supabase `tests` table, adding `<DateTimePicker />` (or `<input type="datetime-local">`) bound to `test.results_reveal_date` in `app/admin/tests/[id]/page.tsx` will seamlessly save and update `results_reveal_date` in ISO string format.

3. **Client-Side Reveal Guard & Countdown Component**:
   - When a candidate visits `/test/[id]` after submitting:
     - Check reveal condition:
       `const isLocked = test.results_reveal_date && new Date() < new Date(test.results_reveal_date) && !test.results_published;`
     - If `isLocked` is `true`, render the client component `<ResultsCountdownClock targetDate={test.results_reveal_date} testTitle={test.title} score={attempt.score} ... />`.
     - The countdown clock blocks visibility of candidate score, question review, and roast button.
     - Top navigation bar / "Back to Dashboard" button remains fully visible and accessible.

4. **Zero-Timer Confetti & Unmount Sequence**:
   - The `ResultsCountdownClock` component tracks remaining time in `useState`.
   - When `distance <= 0` (00:00:00 reached):
     - Trigger confetti burst effect.
     - Call `onComplete()` callback or toggle `isLocked = false`.
     - Unmount `ResultsCountdownClock` and smoothly reveal the candidate's score card, roast button, and review section without requiring a manual page refresh.

---

## 3. Caveats

- **Time Synchronization**: Client-side countdown relies on candidate system clock (`new Date()`). If candidate clock is skewed, countdown will hit 0 when local time reaches `targetDate`. Server-side validation still protects data.
- **Manual Publish Override (MOM)**: If admin explicitly sets `results_published = true` (Manual Publish Override), results will be revealed immediately regardless of `results_reveal_date`.
- **Confetti Package Choice**: `canvas-confetti` can be added via `npm install canvas-confetti @types/canvas-confetti` or implemented via custom zero-dependency HTML5 Canvas component (`components/ConfettiEffect.tsx`). Both approaches are provided in the strategy below.

---

## 4. Conclusion & Implementation Plan

### Actionable Blueprint for Implementer Agent:

#### Step 1: Database Migration
Create `supabase/migrations/20260808000000_add_results_reveal_date.sql`:
```sql
ALTER TABLE tests ADD COLUMN IF NOT EXISTS results_reveal_date TIMESTAMPTZ;
```
Update `supabase/schema.sql` (table `tests` definition) to add `results_reveal_date timestamptz,`.

#### Step 2: Admin Form Updates (`app/admin/tests/[id]/page.tsx`)
In `app/admin/tests/[id]/page.tsx`, under `General Settings` or `Post-Test Actions`:
```tsx
<div className="relative z-30">
  <label className="block text-sm font-medium text-zinc-300 mb-1">Results Reveal Date (Optional)</label>
  <DateTimePicker 
    value={test.results_reveal_date ? new Date(test.results_reveal_date).toISOString() : ""} 
    onChange={(v) => updateTest({ results_reveal_date: v ? new Date(v).toISOString() : null })} 
    placeholder="Set countdown reveal target..."
  />
  <p className="text-xs text-zinc-500 mt-1">When set, candidate results are locked behind a full-screen ticking countdown clock until this time.</p>
</div>
```

#### Step 3: Countdown & Reveal Guard (`components/ResultsCountdownClock.tsx` & `components/ResultsRevealGuard.tsx`)
Create `components/ResultsCountdownClock.tsx`:
```tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import ConfettiEffect from "./ConfettiEffect"; // or canvas-confetti

interface ResultsCountdownClockProps {
  targetDate: string;
  testTitle: string;
  onComplete: () => void;
}

export default function ResultsCountdownClock({ targetDate, testTitle, onComplete }: ResultsCountdownClockProps) {
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const target = new Date(targetDate).getTime();
    
    const updateTimer = () => {
      const now = new Date().getTime();
      const distance = target - now;

      if (distance <= 0) {
        setTimeLeft({ d: 0, h: 0, m: 0, s: 0 });
        setFinished(true);
        onComplete();
      } else {
        setTimeLeft({
          d: Math.floor(distance / (1000 * 60 * 60 * 24)),
          h: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          m: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          s: Math.floor((distance % (1000 * 60)) / 1000)
        });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [targetDate, onComplete]);

  if (!timeLeft) return null;

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center animate-fade-in relative overflow-hidden">
      {finished && <ConfettiEffect />}
      
      {/* Navigation Header Link */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-8">
        <Link href="/dashboard" className="btn-secondary text-sm flex items-center gap-2">
          ← Back to Dashboard
        </Link>
        <span className="text-xs px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 animate-pulse font-medium">
          ⏳ Scheduled Results Reveal
        </span>
      </div>

      <div className="card max-w-3xl w-full p-8 sm:p-12 border-orange-500/20 bg-zinc-900/90 backdrop-blur-xl shadow-2xl relative z-10">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-400 mb-2">Results Countdown</h2>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white mb-8">{testTitle}</h1>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 my-6">
          <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-inner">
            <div className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-orange-400 to-red-500 font-mono">
              {timeLeft.d.toString().padStart(2, '0')}
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mt-2">Days</div>
          </div>
          
          <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-inner">
            <div className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-orange-400 to-red-500 font-mono">
              {timeLeft.h.toString().padStart(2, '0')}
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mt-2">Hours</div>
          </div>
          
          <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-inner">
            <div className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-orange-400 to-red-500 font-mono">
              {timeLeft.m.toString().padStart(2, '0')}
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mt-2">Minutes</div>
          </div>
          
          <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-inner">
            <div className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-orange-400 to-red-500 font-mono animate-pulse">
              {timeLeft.s.toString().padStart(2, '0')}
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mt-2">Seconds</div>
          </div>
        </div>

        <p className="text-sm text-zinc-400 mt-6 max-w-md mx-auto">
          Scores and detailed performance breakdown are currently locked. Results will automatically reveal the instant countdown finishes!
        </p>
      </div>
    </div>
  );
}
```

Create `components/ResultsRevealGuard.tsx`:
Client wrapper component that manages `isLocked` state, renders `ResultsCountdownClock` when `isLocked` is true, fires confetti on unmount, and renders full score results when unlocked.

#### Step 4: Integration in `app/test/[id]/page.tsx`
Replace the submitted attempt rendering block in `app/test/[id]/page.tsx` with `<ResultsRevealGuard test={test} attempt={attempt} />`.

---

## 5. Verification Method

To verify the implementation independently:

1. **Type Checking & Next.js Production Build**:
   Run:
   ```bash
   npx next build --no-lint
   ```
   Ensure build exits with code 0 without any compilation errors.

2. **Admin Form Verification**:
   - Open `/admin/tests/[id]`.
   - Set a future `Results Reveal Date` (e.g. 5 minutes from current time).
   - Save changes and ensure date is saved into Supabase `tests` table.

3. **Student Review & Countdown Verification**:
   - Complete an attempt as student.
   - Navigate to `/test/[id]`.
   - Verify: Full-screen ticking countdown clock is displayed. Score is hidden. "Back to Dashboard" button works.
   - Set a reveal date 5 seconds in the future. Wait 5 seconds.
   - Verify: Confetti bursts on 00:00:00, countdown clock unmounts, score card reveals automatically.
