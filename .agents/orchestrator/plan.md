# Plan: AssOnFire UI/UX & Suspense Features Upgrade

## Overview
Decompose the upgrade into 4 verifiable milestones, dispatches specialist subagents for each milestone using the Project Pattern iteration loop (Explorer -> Worker -> Reviewer -> Challenger -> Auditor), and performs forensic integrity auditing for each milestone.

## Milestone Breakdown

### Milestone 1: UI/UX "Wow Factor" Upgrades (R1)
- **Target**: Proctor snapshot views, test cards, exam question views, interactive buttons, layout transitions.
- **Objective**:
  1. Add a dark-mode Lightbox modal for admins to click and expand proctor snapshots in full screen (close by clicking outside).
  2. Implement shimmering skeleton loaders during data fetching states for test cards and exam questions.
  3. Implement micro-animations (button scale-on-click `active:scale-95`, smooth page transitions, bouncy toast notifications).
- **Verification**: Lightbox opens/closes on click outside, skeleton loaders show during loading states, buttons/interactive elements animate on click. `npm run build` succeeds.

### Milestone 2: Suspense Feature: Results Countdown Clock (R2)
- **Target**: Admin test settings form, test data model/schema, student attempt review / results page (`app/test/...` or `app/results/...`).
- **Objective**:
  1. Add "Results Reveal Date" (`resultsRevealDate`) setting to test schema and admin edit form.
  2. In student attempt review page, check if `resultsRevealDate` is in the future. If so, block scores and show full-screen ticking countdown clock while leaving main dashboard accessible.
  3. When clock hits zero, trigger confetti animation and automatically unmount clock to reveal scores.
- **Verification**: Setting `resultsRevealDate` blocks score review page until timer hits zero, countdown ticks accurately, zero event triggers confetti and unveils scores. Build passes.

### Milestone 3: Suspense Feature: Discord Teaser Pings (R3)
- **Target**: `PingDiscordButton` component, legacy Discord API endpoints, Admin Dashboard test cards.
- **Objective**:
  1. Completely remove existing "Push to Discord / Hall of Fame" feature (component, API routes, buttons).
  2. Add new "Teaser Ping" button on Admin Dashboard test cards.
  3. Implement aggregated statistics calculation (average score %, count of scores > 90%, total attempts) with complete anonymity (no student names).
  4. Post teaser message payload to configured Discord webhook URL.
- **Verification**: Legacy PingDiscordButton and Hall of Fame code removed, new Admin Teaser Ping button posts anonymous stats teaser payload to Discord. Build passes.

### Milestone 4: Suspense Feature: Dramatic Leaderboard Entry (R4)
- **Target**: Public leaderboard page/component (`app/leaderboard/...` or similar).
- **Objective**:
  1. Update public leaderboard rendering logic to animate ranks sequentially from bottom to top.
  2. Add staggered sliding animation and lock-in effect for each leaderboard row.
- **Verification**: Leaderboard rows animate dynamically into place from bottom rank to top rank. Build passes.

## Iteration & Verification Protocol
For each milestone:
1. Dispatch Explorer (`teamwork_preview_explorer`) to analyze codebase structure and design technical implementation details.
2. Dispatch Worker (`teamwork_preview_worker`) with Explorer strategy to implement code, verify syntax, and run builds (`npm run build`).
3. Dispatch Reviewer (`teamwork_preview_reviewer`) to verify functionality, UI quality, and requirements compliance.
4. Dispatch Challenger (`teamwork_preview_challenger`) to stress test feature edge cases.
5. Dispatch Forensic Auditor (`teamwork_preview_auditor`) to verify zero cheating or facade code.
