# Original User Request

## 2026-08-07T15:16:52Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview

Implement a UI/UX consistency and premium aesthetics upgrade for the AssOnFire examination platform, including Obsidian-style markdown rendering (now also applied to MCQ options), glassmorphism effects, micro-animations, form polish, and bilingual (English/Bengali) typography support.

Working directory: /home/sudipta/take-a-test
Integrity mode: development

## Requirements

### R1. Obsidian-Style Markdown & LaTeX
Enhance `MarkdownRenderer.tsx` and global typography to match an Obsidian-like premium feel. Code blocks need dark backgrounds with borders, blockquotes need tinted backgrounds with left borders, and tables need crisp borders with hover states. Apply this Markdown rendering to MCQ options as well as question prompts.

### R2. Micro-Animations & Glassmorphism
Upgrade `.card`, `.btn`, and other interactive elements in `globals.css`. Add `active:scale-95` to buttons, deeper `backdrop-blur-xl` to cards, and subtle pulse animations to live status badges (e.g., "In Progress").

### R3. Form Polish & UI Consistency
Update `/login` and `/signup` pages to use properly linked `<label>` tags (using `id` and `htmlFor`) and ensure all inputs share the premium `focus:ring-orange-500/50` glow. Standardize error message styling.

### R4. Bilingual Typography
Integrate a premium Bengali font (e.g., Hind Siliguri) via `next/font/google` in `layout.tsx` to seamlessly support mixed English/Bengali content.

## Acceptance Criteria

### Aesthetic & Functional Checks
- [ ] Programmatic check: `globals.css` must contain custom Tailwind typography overrides (`.prose pre`, `.prose blockquote`, `.prose table`) implementing the Obsidian style.
- [ ] Programmatic check: MCQ option mapping in `/app/admin/tests/[id]/page.tsx` and `/app/test/[id]/page.tsx` must utilize the `<MarkdownRenderer />` component instead of raw text.
- [ ] Programmatic check: `.btn` must contain `active:scale-95` and `.card` must contain `backdrop-blur-xl`.
- [ ] Programmatic check: All `<label>` elements in `/login/page.tsx` and `/signup/page.tsx` must have an `htmlFor` attribute that strictly matches the `id` of their corresponding `<input>`.
- [ ] Programmatic check: `next/font/google` must be used to load a Bengali font in `layout.tsx` and injected into the CSS variables.

## 2026-08-07T18:33:44Z

# Teamwork Project Prompt — Draft

Implement 3 "Wow Factor" UI upgrades (Lightbox for snapshots, Skeleton loaders, Animated micro-interactions) and 3 "Suspense" features (Doomsday countdown clock for results, Discord teaser pings, Dramatic sliding leaderboard entry) into the existing Next.js exam platform.

Working directory: /home/sudipta/take-a-test
Integrity mode: development

## Requirements

### R1. UI/UX "Wow Factor" Upgrades
- Implement a dark-mode Lightbox modal for admins to click and expand proctor snapshots in full screen.
- Add skeleton loaders (shimmering placeholders) during data fetching states for test cards and exam questions, replacing blank screens.
- Add micro-animations (e.g., button scale-on-click, smooth page transitions, bouncy toasts) throughout the app.

### R2. Suspense Feature: Results Countdown Clock
- Add a "Results Reveal Date" setting for tests.
- When students view an ended test's "Results/Attempt Review" page before this date, it blocks access to the scores and displays a massive, full-screen ticking countdown clock instead. The rest of the dashboard should remain accessible.
- When the timer hits zero, trigger a confetti animation and automatically unmount the clock to reveal the score.

### R3. Suspense Feature: Discord Teaser Pings
- Completely remove the existing "Push to Discord / Hall of Fame" feature (both the PingDiscordButton component and its related logic/API).
- Replace it with a new "Teaser Ping" button on the main Admin Dashboard on the test cards.
- This button calculates anonymous stats (e.g., "The average score was X% and Y people scored > 90%") and sends a teaser message to the configured Discord webhook to build hype before results are fully published.

### R4. Suspense Feature: Dramatic Leaderboard Entry
- When a user views the public leaderboard, the ranks should dynamically slide and lock into place one by one from bottom to top, rather than loading instantly.

## Acceptance Criteria

### UI/UX
- [ ] Admins can click a snapshot image to open it in a full-screen lightbox; clicking outside closes it.
- [ ] Loading states use skeleton components rather than empty screens or plain text.
- [ ] Buttons and interactive elements have visible active/click state animations.

### Suspense Features
- [ ] A test with a future "Results Reveal Date" blocks score visibility and shows a working countdown timer.
- [ ] Reaching 00:00:00 on the countdown triggers a visual effect (confetti) and unmounts the clock to show the actual results.
- [ ] The "Teaser Ping" successfully posts an aggregated summary to Discord without revealing specific student names.
- [ ] The Leaderboard component renders ranks sequentially with a staggered animation effect.

