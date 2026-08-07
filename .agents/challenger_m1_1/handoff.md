# Milestone 1 Deliverables (R1 UI/UX "Wow Factor" Upgrades) — Empirical Verification & Stress-Test Handoff Report

## 1. Observation

### Build & Type Check Verification
- **Command**: `npx tsc --noEmit`
  - **Result**: Success (0 errors).
- **Command**: `npm run build`
  - **Result**: Success. Generated 12/12 static pages (`/`, `/_not-found`, `/admin`, `/admin/appeals`, `/admin/attempts/[id]`, `/admin/new`, `/admin/tests/[id]`, `/admin/tests/[id]/attempts`, `/admin/tests/[id]/invites`, `/dashboard`, `/login`, `/signup`).

### Empirical Test Harness Execution
- **Command**: `npx tsx tests/m1_empirical_tests.tsx`
- **Output**:
  ```
  === STARTING MILESTONE 1 EMPIRICAL VERIFICATION & STRESS TESTS ===
  
  === TEST RESULTS SUMMARY ===
  1. [Proctor Lightbox Modal] ProctorLightboxModal - Single Snapshot UI
     Result: PASS
     Details: [PASS] Single snapshot correctly hides Prev/Next buttons and bottom thumbnail strip.
  
  2. [Proctor Lightbox Modal] ProctorLightboxModal - Multiple Snapshots UI
     Result: PASS
     Details: [PASS] Multiple snapshots correctly display Prev/Next controls and thumbnail selector.
  
  3. [Proctor Lightbox Modal] ProctorLightboxModal - Missing/Empty Image URL Fallback
     Result: FAIL
     Details: [FAIL] Renders broken empty img tag without onError placeholder or fallback UI.
  
  4. [Proctor Lightbox Modal] ProctorLightboxModal - Rapid Navigation Modulo Wrapping
     Result: PASS
     Details: [PASS] Modulo calculation handlePrev and handleNext remain within valid index bounds [0, N-1] under 2000 rapid clicks.
  
  5. [Proctor Lightbox Modal] ProctorLightboxModal - Backdrop Target Scope
     Result: FAIL
     Details: [FAIL] Inner stage container spans flex-1 max-w-5xl. Clicks on stage empty space hit child container (e.target !== e.currentTarget) and fail to close backdrop.
  
  6. [Proctor Lightbox Modal] ProctorLightboxModal - Keyboard & Body Scroll Lock
     Result: PASS
     Details: [PASS] Registers Escape key listener, restores body overflow, and cleans up event listeners on unmount.
  
  7. [Skeleton Loaders] Skeleton Loaders - ARIA Accessibility Tags
     Result: FAIL
     Details: [FAIL] MISSING ARIA ACCESSIBILITY: Skeletons lack role="status", aria-busy="true", or sr-only text for screen readers.
  
  8. [Skeleton Loaders] Skeleton Loaders - TestCardSkeleton Layout Shift
     Result: FAIL
     Details: [FAIL] TestCardSkeleton renders 3 button placeholders, while actual Admin TestCard has up to 5 buttons, causing right-side layout shift.
  
  9. [Skeleton Loaders] Skeleton Loaders - Mobile/Desktop Responsiveness
     Result: PASS
     Details: [PASS] Skeleton loaders specify responsive grid/flex Tailwind breakpoints (sm:grid-cols-2, sm:flex-row).
  
  10. [Skeleton Loaders] Skeleton Loaders - Dashboard Stats Grid Layout Shift
      Result: FAIL
      Details: [FAIL] LAYOUT SHIFT: Dashboard loading skeleton ALWAYS renders stats grid, but actual page conditionally hides it for users with 0 completed tests.
  
  11. [Micro-Animations & Toasts] Micro-Animations - Compositor Optimization
      Result: PASS
      Details: [PASS] Keyframe fadeUp uses opacity and transform (GPU compositor friendly properties).
  
  12. [Micro-Animations & Toasts] Micro-Animations - Reduced Motion Support
      Result: PASS
      Details: [PASS] globals.css includes @media (prefers-reduced-motion: reduce) with !important overrides.
  
  13. [Micro-Animations & Toasts] Toast Component - Stacking & Limit Safeguard
      Result: FAIL
      Details: [FAIL] UNBOUNDED STACKING: Toast system lacks max toast limit and scroll container; rapid toasts stack infinitely off-screen.
  
  14. [Micro-Animations & Toasts] Toast Component - Cubic-Bezier & Vertical Flex Removal
      Result: PASS
      Details: [PASS] Uses cubic-bezier(0.34, 1.56, 0.64, 1) spring transition for horizontal enter/exit. Note: vertical repositioning when item is deleted from array is un-animated.
  
  TOTAL: 14 tests | PASSED: 8 | FAILED: 6
  ```

---

## 2. Logic Chain

### 1. Proctor Lightbox Modal
- **Observation**: `components/ProctorLightboxModal.tsx` line 116 renders `<img src={currentSnapshot.url} alt={...} />`. Line 69 checks `onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}`.
- **Logic**:
  - **Single vs Multiple Snapshots**: When `snapshots.length === 1`, lines 102 and 123 (`snapshots.length > 1`) evaluate to `false`, omitting Prev/Next buttons and the bottom thumbnail bar. Keyboard shortcuts exit early in `handlePrev`/`handleNext`.
  - **Missing/Empty Image URLs**: If `url` is `""` or `undefined` (e.g. corrupt snapshot payload), the component renders `<img src="">` directly. Without an `onError` event handler or fallback state (e.g., placeholder icon or "Snapshot unavailable" message), browser displays a broken image icon.
  - **Backdrop Click Target Scope**: Line 100 defines `<div className="relative flex-1 w-full max-w-5xl flex items-center justify-center my-4 overflow-hidden">`. Because this wrapper spans `flex-1 w-full max-w-5xl` inside the outer overlay, clicking on the dark backdrop space immediately adjacent to the image targets this child container (`e.target !== e.currentTarget`), which fails to trigger `onClose()`.
  - **Rapid Clicking**: Modulo logic `(currentIndex - 1 + N) % N` and `(currentIndex + 1) % N` correctly handles boundary wrapping across 2000 simulated rapid clicks without index out-of-bound errors.
  - **Escape & Body Scroll Lock**: `useEffect` cleanly binds `Escape` key event listener to `window` and locks/restores `document.body.style.overflow`.

### 2. Skeleton Loaders
- **Observation**: `components/skeletons/QuestionSkeleton.tsx` and `TestCardSkeleton.tsx` lack `role="status"` or `aria-busy="true"` attributes. `TestCardSkeleton.tsx` line 28-32 renders 3 action buttons. `app/dashboard/loading.tsx` lines 16-23 renders a 3-column stats grid.
- **Logic**:
  - **Accessibility**: Screen readers announce skeleton container `div`s as empty elements without indicating loading status or reading an `sr-only` description.
  - **Layout Shift - Admin Test Cards**: `TestCardSkeleton` renders 3 action button placeholders (`h-9 w-16`, `h-9 w-20`, `h-9 w-16`), but actual admin test cards in `app/admin/page.tsx` render up to 5 buttons (`PingDiscordButton`, `Edit`, `Invites`, `Attempts`, `DeleteTestButton`). When the server component finishes loading, the button group width expands by 66%, shifting layout.
  - **Layout Shift - Dashboard Stats**: `app/dashboard/loading.tsx` unconditionally renders the 3-stat card grid. However, `app/dashboard/page.tsx` line 41 conditionally renders stats only if `completedCount > 0`. For new candidates with 0 tests, the stats grid collapses upon data load, pushing available tests upwards.

### 3. Micro-Animations & Toasts
- **Observation**: `app/globals.css` lines 26-40 define `@keyframes fadeUp` with `opacity` and `transform: translateY(8px)` and `@media (prefers-reduced-motion: reduce)`. `components/Toast.tsx` line 26 renders `<div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">`.
- **Logic**:
  - **Keyframe Animation Performance**: `opacity` and `transform` do not trigger layout or paint recalculations, running entirely on GPU compositor threads.
  - **Reduced Motion Support**: `globals.css` specifies `animation-duration: 0.01ms !important; transition-duration: 0.01ms !important;` for `prefers-reduced-motion: reduce`. Note: In `Toast.tsx`, progress bar inline `transition: width 3s linear` is overridden to 0.01ms by CSS `!important`, causing the progress bar to instantly jump to 0% while the toast message persists for 3000ms.
  - **Toast Stacking**: `useToast` appends toasts into an array with no maximum limit (`MAX_TOASTS`). When multiple toasts trigger in quick succession, they stack vertically off the bottom of the viewport without scrolling or auto-trimming.

---

## 3. Caveats

1. **DOM Environment Scope**: Component rendering tests were executed using `react-dom/server` inside Node.js v24.18.0. Real browser event propagation (such as synthetic React event bubbling for backdrop clicks) was verified via static JSX AST hierarchy inspection.
2. **GPU Profiling**: CSS animation performance was verified structurally by auditing style rules against GPU composition specifications (`opacity` and `transform`). Chrome DevTools performance trace measurements were not performed in this session.

---

## 4. Conclusion

**Verdict**: **CONDITIONAL PASS (6 Actionable Defects Identified)**.
The Milestone 1 deliverables pass type checking (`npx tsc --noEmit`) and production build (`npm run build`). Core lightbox navigation logic, responsive breakpoints, and keyframe animations are well-structured. However, 6 empirical failure modes must be resolved before final approval:

1. **[Defect 1 - Proctor Lightbox]**: Missing `onError` / fallback state for broken or empty snapshot image URLs (`ProctorLightboxModal.tsx:116`).
2. **[Defect 2 - Proctor Lightbox]**: Inner stage wrapper (`flex-1 max-w-5xl`) intercepts backdrop clicks, preventing modal dismissal when clicking empty dark overlay space (`ProctorLightboxModal.tsx:100`).
3. **[Defect 3 - Skeletons]**: Missing ARIA accessibility tags (`role="status"`, `aria-busy="true"`, `sr-only` text) in `QuestionSkeleton.tsx` and `TestCardSkeleton.tsx`.
4. **[Defect 4 - Skeletons]**: Admin `TestCardSkeleton` renders 3 action button placeholders instead of 5, causing layout shift upon component load (`TestCardSkeleton.tsx:28-32`).
5. **[Defect 5 - Skeletons]**: Dashboard loading skeleton unconditionally renders stats grid, causing layout shift for candidates with 0 completed tests (`app/dashboard/loading.tsx:16-23`).
6. **[Defect 6 - Toasts]**: Toast container lacks maximum toast limit or scroll container, resulting in unbounded vertical stacking off-screen under rapid notifications (`components/Toast.tsx:26`).

---

## 5. Verification Method

To independently verify these findings, run the following commands in the workspace root (`/home/sudipta/take-a-test`):

1. **TypeScript Type Check**:
   ```bash
   npx tsc --noEmit
   ```
2. **Production Build Check**:
   ```bash
   npm run build
   ```
3. **Empirical Verification Test Suite**:
   ```bash
   npx tsx tests/m1_empirical_tests.tsx
   ```

**Invalidation Conditions**:
- The report verdict is invalidated if all 6 failed tests in `tests/m1_empirical_tests.tsx` pass after component updates, while `npx tsc --noEmit` and `npm run build` continue to succeed with 0 errors.
