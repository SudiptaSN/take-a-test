# Project: AssOnFire UI/UX & Suspense Features Upgrade

## Architecture
- Framework: Next.js 15 (App Router) + Tailwind CSS + TypeScript + React / Framer Motion / Canvas-Confetti
- Pages & Routes:
  - Admin Dashboard & Test Management: `app/admin/...`
  - Student Exam & Attempt Review: `app/test/...`
  - Public Leaderboard: `app/leaderboard/...` or component
- Components & Shared Modules:
  - Proctoring & Lightbox: Proctor snapshot lightbox modal (`components/ProctorLightboxModal.tsx`, `components/ProctorSnapshotGallery.tsx`)
  - Loaders & Skeleton: Shimmering placeholders (`TestCardSkeleton.tsx`, `QuestionSkeleton.tsx`, `app/admin/loading.tsx`, `app/dashboard/loading.tsx`)
  - Micro-animations: Active press states, page transitions, bouncy toasts
  - Suspense Countdown: Results reveal date clock + confetti (`ResultsCountdownClock.tsx`, `ResultsRevealGuard.tsx`, `ConfettiEffect.tsx`)
  - Discord Integration: Webhook teaser pings (anonymous aggregated stats)
  - Leaderboard: Staggered bottom-to-top dynamic rank entry

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | UI/UX "Wow Factor" Upgrades (R1) | Dark-mode Lightbox for proctor snapshots, skeleton loaders, micro-animations | none | DONE |
| 2 | Results Countdown Clock (R2) | `resultsRevealDate` field in tests, full-screen countdown on attempt review, confetti on zero | M1 | DONE |
| 3 | Discord Teaser Pings (R3) | Purge legacy PingDiscordButton/Hall of Fame, add Admin Teaser Ping with anonymous stats webhook | M2 | DONE |
| 4 | Dramatic Leaderboard Entry (R4) | Public leaderboard staggered bottom-to-top sliding rank animation | M3 | PLANNED |

## Interface & Quality Contracts
- **Lightbox Modal**: Admins can click any proctor snapshot image to open full-screen lightbox modal; clicking outside closes it. [DONE]
- **Skeleton Loaders**: Test cards and exam questions must display shimmering skeleton placeholders during loading states instead of empty/blank screens. [DONE]
- **Micro-Animations**: Buttons have active click scaling (`active:scale-95`), smooth page transitions, and bouncy toasts. [DONE]
- **Countdown Clock**: Tests with a future `resultsRevealDate` block score access on review page and show ticking countdown. Reaching 00:00:00 triggers confetti and auto-reveals scores. [DONE]
- **Discord Teaser**: Existing PingDiscordButton / Hall of Fame features must be completely removed. New "Teaser Ping" button on Admin Dashboard calculates anonymous stats (e.g., average %, score > 90% count) and posts to Discord webhook.
- **Leaderboard**: Ranks dynamically slide and lock into place one by one from bottom to top sequentially.
