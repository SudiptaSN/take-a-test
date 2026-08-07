# Milestone 1: UI/UX "Wow Factor" Upgrades (R1) — Handoff Report

## 1. Observation

Direct observations from the codebase investigation:

1. **Proctor Snapshots & Images Rendering Locations**:
   - **`app/admin/attempts/[id]/page.tsx` (lines 91-101)**:
     ```tsx
     {signedSnapshots.length > 0 && (
       <>
         <h2 className="font-semibold mt-8">Webcam snapshots ({signedSnapshots.length})</h2>
         <div className="mt-2 grid grid-cols-3 md:grid-cols-6 gap-2">
           {signedSnapshots.map((s, i) => (
             <a key={i} href={s.url} target="_blank" rel="noreferrer" className="block">
               <img src={s.url} alt="" className="aspect-square object-cover rounded border" />
               <div className="text-[10px] text-zinc-500 mt-0.5">{s.ts ? formatTimeIST(s.ts) : ""}</div>
             </a>
           ))}
         </div>
       </>
     )}
     ```
     Currently opens full snapshot images in a new browser tab via standard `<a>` hyperlink.
   - **`app/test/[id]/leaderboard/page.tsx` (lines 105-115)**:
     ```tsx
     { (test.results_published || test.auto_publish_results) && attemptSnapshots.length > 0 && (
       <div className="mt-4 pt-4 border-t border-zinc-800/50">
         <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Webcam Proof (Peer Review)</p>
         <div className="flex gap-2 overflow-x-auto pb-2">
           {attemptSnapshots.map((url, i) => (
             <img key={i} src={url} alt="Proctor Snapshot" className="h-20 w-auto rounded border border-zinc-700/50 hover:scale-110 relative z-10 transition-transform origin-left" />
           ))}
         </div>
       </div>
     )}
     ```
     Renders static image thumbnails with hover scale transform, without lightbox or full-screen expansion.

2. **Test Cards & Question Loading States**:
   - **`app/admin/page.tsx` (lines 93-128)**: Renders test cards inside sections (`Drafts`, `Active`, `Ended`) using the `TestCard` component. Data fetching happens on server side without a suspense loading fallback.
   - **`app/dashboard/page.tsx` (lines 67-93)**: Candidate dashboard rendering available test cards.
   - **`app/admin/tests/[id]/page.tsx` (line 200)**:
     ```tsx
     if (!test) return <main className="p-10">Loading…</main>;
     ```
     Displays plain text `"Loading…"` while fetching test and question data on client.
   - **`app/test/[id]/page.tsx` & `components/ExamRoom.tsx` (lines 576-578)**:
     ```tsx
     <button className="btn mt-6 w-full py-3" onClick={startExam} disabled={!modelsLoaded || ...}>
        {modelsLoaded ? ... : "Loading AI Proctoring Engine..."}
     </button>
     ```
     Displays plain button text while ML models load.

3. **Micro-Animations & Styling**:
   - **`app/globals.css` (lines 20-23)**:
     ```css
     .btn { @apply inline-flex items-center px-4 py-2 rounded-md bg-gradient-to-r from-orange-600 to-red-600 text-white text-sm font-semibold shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:shadow-[0_0_25px_rgba(239,68,68,0.5)] hover:from-orange-500 hover:to-red-500 active:scale-95 transition-all disabled:opacity-50 border border-red-500/30; }
     .btn-secondary { @apply inline-flex items-center px-4 py-2 rounded-md border border-zinc-700 bg-zinc-900/80 backdrop-blur-sm text-zinc-200 text-sm font-medium hover:bg-zinc-800 hover:border-zinc-500 active:scale-95 transition-all shadow-sm; }
     ```
     `.btn` and `.btn-secondary` include `active:scale-95`. However, standalone buttons or icon buttons in various components (e.g. `Navbar.tsx`, `DeleteTestButton.tsx`, `ConfirmModal.tsx`, pagination links) do not consistently use interactive press feedback.
   - **`components/Toast.tsx` (line 80)**:
     ```tsx
     className={`relative overflow-hidden pointer-events-auto flex items-center justify-between w-80 backdrop-blur-md border rounded-xl shadow-2xl transition-all duration-300 ease-out transform ${containerClasses[toast.type]} ${mounted ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'}`}
     ```
     Toast entrance uses standard linear `ease-out` slide-in instead of a bouncy spring animation.
   - **Page Transitions**: No global entrance keyframe or page container transition exists when navigating between routes.

---

## 2. Logic Chain

1. **Dark-mode Lightbox Modal Requirement**:
   - *Observation*: `app/admin/attempts/[id]/page.tsx` opens snapshots in a external browser tab (`target="_blank"`), breaking admin workflow context. `app/test/[id]/leaderboard/page.tsx` has non-clickable snapshot thumbnails.
   - *Reasoning*: Creating a reusable client component `components/ProctorLightboxModal.tsx` allows admins (and students reviewing peer snapshots) to expand any snapshot into full screen overlay without leaving the page.
   - *Design*:
     - Backdrop: `fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4`.
     - Controls: Backdrop click handler, close button (`X`), `Escape` keyboard key listener, and Next/Prev arrow buttons (`ArrowLeft`/`ArrowRight`) for gallery navigation.
     - Content: High-res snapshot view, IST formatted timestamp, snapshot sequence counter (e.g., `Snapshot 2 of 8`).

2. **Skeleton Loaders Requirement**:
   - *Observation*: Test card list pages (`app/admin/page.tsx`, `app/dashboard/page.tsx`) and question edit/exam screens (`app/admin/tests/[id]/page.tsx`, `ExamRoom.tsx`) display plain text (`Loading…`) or empty screens while fetching.
   - *Reasoning*: Implementing CSS shimmering pulse skeletons creates a premium visual experience during network delay.
   - *Design*:
     - `components/skeletons/TestCardSkeleton.tsx`: Card container matching exact grid dimensions with pulsating placeholders for title, badges, description, and action buttons.
     - `components/skeletons/QuestionSkeleton.tsx`: Question prompt lines (multi-length pulses), points badge skeleton, and 4x option card placeholders.
     - App Router fallbacks (`app/admin/loading.tsx` and `app/dashboard/loading.tsx`): Built-in Next.js loading convention so route changes automatically render skeleton screens.
     - Inline loaders: Replace plain text `if (!test) return <main className="p-10">Loading…</main>;` with `<QuestionSkeleton />`.

3. **Micro-Animations Requirement**:
   - *Observation*: Global button active scale exists on `.btn` and `.btn-secondary`, but toasts use plain `ease-out` transitions and pages load instantaneously without smooth entrance motion.
   - *Reasoning*: Enhancing CSS keyframe animations, toast cubic-bezier curves, and button state consistency will achieve the target "Wow Factor" visual polish.
   - *Design*:
     - Bouncy Toast: Update `components/Toast.tsx` transition timing function to `cubic-bezier(0.34, 1.56, 0.64, 1)` with `scale-100` / `scale-95` transform pops.
     - Smooth Page Transitions: Add `@keyframes fadeUp` in `app/globals.css` (`0% { opacity: 0; transform: translateY(6px); } 100% { opacity: 1; transform: translateY(0); }`) and apply `.animate-fade-up` to top-level `<main>` elements.
     - Interactive Press Feedback: Apply `active:scale-95 transition-transform duration-100 ease-out` across all interactive buttons, cards, and modal triggers.

---

## 3. Caveats

1. **Server vs. Client Components**:
   - `app/admin/attempts/[id]/page.tsx` is currently an `async` Server Component. To handle state for the Lightbox modal (e.g., `selectedSnapshotIndex`), either:
     - Wrap snapshot image gallery grid into a dedicated `"use client"` component (`components/ProctorSnapshotGallery.tsx`).
     - Or create a lightweight client wrapper modal component (`components/ProctorLightboxModal.tsx`) that manages its open/close state.
2. **Next.js 15 Suspense & Loading Boundaries**:
   - Adding `app/admin/loading.tsx` and `app/dashboard/loading.tsx` will automatically activate Next.js 15 App Router Suspense streaming for server-rendered routes.
3. **Reduced Motion Accessibility**:
   - `app/globals.css` contains `@media (prefers-reduced-motion: reduce)`. All newly added micro-animations and shimmers must respect this query so users who disable animations do not experience motion sickness.

---

## 4. Conclusion

Milestone 1 is ready for implementation by the implementer agent. The implementation plan consists of 3 self-contained, high-impact deliverables:

1. **Dark-mode Lightbox Component**: `components/ProctorLightboxModal.tsx` + gallery wrapper integrated into `app/admin/attempts/[id]/page.tsx` and `app/test/[id]/leaderboard/page.tsx`.
2. **Shimmering Skeleton Loader Components**: `components/skeletons/TestCardSkeleton.tsx`, `components/skeletons/QuestionSkeleton.tsx`, `app/admin/loading.tsx`, `app/dashboard/loading.tsx`, and inline loading state replacement in `app/admin/tests/[id]/page.tsx`.
3. **Micro-Animations & Toast Polish**: `app/globals.css` page entrance animations (`animate-fade-up`), spring transition curves in `components/Toast.tsx`, and active click feedback on all buttons.

---

## 5. Verification Method

To independently verify the implementation:

1. **Build & Lint Commands**:
   - Run `npm run lint` — verify zero ESLint errors or TypeScript type mismatches.
   - Run `npm run build` — verify Next.js production build completes without errors.

2. **Visual & Interaction Inspections**:
   - **Proctor Lightbox**: Navigate to `/admin/attempts/[id]`. Click any webcam snapshot image. Verify full-screen dark backdrop modal opens with IST timestamp. Press `Escape` or click backdrop overlay to verify modal closes cleanly.
   - **Skeleton Loaders**: Navigate to `/admin` or `/dashboard` or refresh `/admin/tests/[id]`. Observe shimmering skeleton placeholders rendering during data fetching.
   - **Micro-Animations**: Click any button to observe `active:scale-95` compression effect. Trigger a toast notification (e.g. Save test) to observe bouncy spring slide-in animation. Observe smooth fade-up page transitions during page navigation.

3. **Invalidation Conditions**:
   - Lightbox fails to close on `Escape` key or backdrop click.
   - Plain text `"Loading…"` appears during route transitions.
   - Toast animation clips or breaks layout.
   - Build fails due to server/client component hydration mismatches.
