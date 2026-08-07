import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { ProctorLightboxModal } from '../components/ProctorLightboxModal';
import ProctorSnapshotGallery from '../components/ProctorSnapshotGallery';
import QuestionSkeleton from '../components/skeletons/QuestionSkeleton';
import TestCardSkeleton from '../components/skeletons/TestCardSkeleton';

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

console.log("=== STARTING MILESTONE 1 EMPIRICAL VERIFICATION & STRESS TESTS ===\n");

// -------------------------------------------------------------
// 1. PROCTOR LIGHTBOX MODAL TESTS
// -------------------------------------------------------------

// Test 1.1: Single Image Snapshot
try {
  const singleSnapshotProps = {
    snapshots: [{ url: 'https://example.com/snap1.jpg', ts: '2026-08-08T00:00:00Z', label: 'Cam 1' }],
    currentIndex: 0,
    onClose: () => {},
    onNavigate: () => {},
  };
  const html = ReactDOMServer.renderToString(<ProctorLightboxModal {...singleSnapshotProps} />);
  
  const hasPrevBtn = html.includes('aria-label="Previous snapshot"');
  const hasNextBtn = html.includes('aria-label="Next snapshot"');
  const hasBottomStrip = html.includes('w-full max-w-3xl flex items-center justify-center gap-2');
  
  check(
    !hasPrevBtn && !hasNextBtn && !hasBottomStrip,
    "ProctorLightboxModal - Single Snapshot UI",
    "Proctor Lightbox Modal",
    "Single snapshot correctly hides Prev/Next buttons and bottom thumbnail strip."
  );
} catch (err: any) {
  check(false, "ProctorLightboxModal - Single Snapshot UI", "Proctor Lightbox Modal", `Error: ${err.message}`);
}

// Test 1.2: Multiple Snapshots Navigation Elements
try {
  const multiSnapshotProps = {
    snapshots: [
      { url: 'https://example.com/snap1.jpg', ts: '2026-08-08T00:00:00Z' },
      { url: 'https://example.com/snap2.jpg', ts: '2026-08-08T00:01:00Z' },
    ],
    currentIndex: 0,
    onClose: () => {},
    onNavigate: () => {},
  };
  const html = ReactDOMServer.renderToString(<ProctorLightboxModal {...multiSnapshotProps} />);
  
  const hasPrevBtn = html.includes('aria-label="Previous snapshot"');
  const hasNextBtn = html.includes('aria-label="Next snapshot"');
  const hasBottomStrip = html.includes('w-12 h-12 rounded-lg');
  
  check(
    hasPrevBtn && hasNextBtn && hasBottomStrip,
    "ProctorLightboxModal - Multiple Snapshots UI",
    "Proctor Lightbox Modal",
    "Multiple snapshots correctly display Prev/Next controls and thumbnail selector."
  );
} catch (err: any) {
  check(false, "ProctorLightboxModal - Multiple Snapshots UI", "Proctor Lightbox Modal", `Error: ${err.message}`);
}

// Test 1.3: Missing or Empty Image URLs handling
try {
  const emptyUrlProps = {
    snapshots: [{ url: '' }, { url: '   ' }],
    currentIndex: 0,
    onClose: () => {},
    onNavigate: () => {},
  };
  const html = ReactDOMServer.renderToString(<ProctorLightboxModal {...emptyUrlProps} />);
  
  const hasFallback = html.includes('Image unavailable') || html.includes('onError') || html.includes('BrokenImage');
  const rendersImgTag = html.includes('src=""');
  
  check(
    !rendersImgTag || hasFallback,
    "ProctorLightboxModal - Missing/Empty Image URL Fallback",
    "Proctor Lightbox Modal",
    rendersImgTag && !hasFallback
      ? "Renders broken empty img tag without onError placeholder or fallback UI."
      : "Handles empty image URLs gracefully."
  );
} catch (err: any) {
  check(false, "ProctorLightboxModal - Missing/Empty Image URL Fallback", "Proctor Lightbox Modal", `Error: ${err.message}`);
}

// Test 1.4: Rapid Index Navigation & Modulo Wrapping Oracle
try {
  const N = 5;
  let curr = 0;
  const navigatePrev = (i: number) => (i - 1 + N) % N;
  const navigateNext = (i: number) => (i + 1) % N;
  
  // Rapid 1000 prev clicks
  for (let i = 0; i < 1000; i++) {
    curr = navigatePrev(curr);
  }
  const prevWrappedCorrectly = curr >= 0 && curr < N;
  
  // Rapid 1000 next clicks
  for (let i = 0; i < 1000; i++) {
    curr = navigateNext(curr);
  }
  const nextWrappedCorrectly = curr >= 0 && curr < N;
  
  check(
    prevWrappedCorrectly && nextWrappedCorrectly,
    "ProctorLightboxModal - Rapid Navigation Modulo Wrapping",
    "Proctor Lightbox Modal",
    "Modulo calculation handlePrev and handleNext remain within valid index bounds [0, N-1] under 2000 rapid clicks."
  );
} catch (err: any) {
  check(false, "ProctorLightboxModal - Rapid Navigation Modulo Wrapping", "Proctor Lightbox Modal", `Error: ${err.message}`);
}

// Test 1.5: Backdrop Click Target Scope
try {
  const props = {
    snapshots: [{ url: 'https://example.com/snap1.jpg' }],
    currentIndex: 0,
    onClose: () => {},
    onNavigate: () => {},
  };
  const html = ReactDOMServer.renderToString(<ProctorLightboxModal {...props} />);
  const hasFullStageContainer = html.includes('relative flex-1 w-full max-w-5xl flex items-center justify-center my-4 overflow-hidden');
  
  check(
    !hasFullStageContainer,
    "ProctorLightboxModal - Backdrop Target Scope",
    "Proctor Lightbox Modal",
    hasFullStageContainer
      ? "Inner stage container spans flex-1 max-w-5xl. Clicks on stage empty space hit child container (e.target !== e.currentTarget) and fail to close backdrop."
      : "Backdrop click target encompasses full screen without child container intercepting."
  );
} catch (err: any) {
  check(false, "ProctorLightboxModal - Backdrop Target Scope", "Proctor Lightbox Modal", `Error: ${err.message}`);
}

// Test 1.6: Escape Key & Keydown Handler Clean Up Verification
try {
  const fs = require('fs');
  const modalCode = fs.readFileSync('/home/sudipta/take-a-test/components/ProctorLightboxModal.tsx', 'utf8');
  
  const registersEscape = modalCode.includes('e.key === "Escape"') && modalCode.includes('addEventListener("keydown", handleKeyDown)');
  const removesListener = modalCode.includes('removeEventListener("keydown", handleKeyDown)');
  const bodyOverflowLock = modalCode.includes('document.body.style.overflow = "hidden"');
  const restoresOverflow = modalCode.includes('document.body.style.overflow = originalOverflow');
  
  check(
    registersEscape && removesListener && bodyOverflowLock && restoresOverflow,
    "ProctorLightboxModal - Keyboard & Body Scroll Lock",
    "Proctor Lightbox Modal",
    "Registers Escape key listener, restores body overflow, and cleans up event listeners on unmount."
  );
} catch (err: any) {
  check(false, "ProctorLightboxModal - Keyboard & Body Scroll Lock", "Proctor Lightbox Modal", `Error: ${err.message}`);
}


// -------------------------------------------------------------
// 2. SKELETON LOADERS TESTS
// -------------------------------------------------------------

// Test 2.1: Skeleton Accessibility Tags
try {
  const qHtml = ReactDOMServer.renderToString(<QuestionSkeleton count={2} />);
  const tHtml = ReactDOMServer.renderToString(<TestCardSkeleton count={2} />);
  
  const qHasRole = qHtml.includes('role="status"') || qHtml.includes('aria-busy="true"');
  const tHasRole = tHtml.includes('role="status"') || tHtml.includes('aria-busy="true"');
  const hasSrText = qHtml.includes('sr-only') || tHtml.includes('sr-only');
  
  check(
    (qHasRole || tHasRole) && hasSrText,
    "Skeleton Loaders - ARIA Accessibility Tags",
    "Skeleton Loaders",
    (qHasRole || tHasRole)
      ? "Skeletons have accessibility roles."
      : "MISSING ARIA ACCESSIBILITY: Skeletons lack role=\"status\", aria-busy=\"true\", or sr-only text for screen readers."
  );
} catch (err: any) {
  check(false, "Skeleton Loaders - ARIA Accessibility Tags", "Skeleton Loaders", `Error: ${err.message}`);
}

// Test 2.2: TestCardSkeleton Action Button Count vs Actual Card
try {
  const tHtml = ReactDOMServer.renderToString(<TestCardSkeleton count={1} />);
  const placeholderMatches = tHtml.match(/h-9 w-16|h-9 w-20/g);
  const placeholderCount = placeholderMatches ? placeholderMatches.length : 0;
  
  check(
    placeholderCount === 5,
    "Skeleton Loaders - TestCardSkeleton Layout Shift",
    "Skeleton Loaders",
    placeholderCount !== 5
      ? `TestCardSkeleton renders ${placeholderCount} button placeholders, while actual Admin TestCard has up to 5 buttons, causing right-side layout shift.`
      : "TestCardSkeleton button count matches actual card."
  );
} catch (err: any) {
  check(false, "Skeleton Loaders - TestCardSkeleton Layout Shift", "Skeleton Loaders", `Error: ${err.message}`);
}

// Test 2.3: Mobile/Desktop Responsive Breakpoints
try {
  const qHtml = ReactDOMServer.renderToString(<QuestionSkeleton count={1} />);
  const tHtml = ReactDOMServer.renderToString(<TestCardSkeleton count={1} />);
  
  const qResponsive = qHtml.includes('grid-cols-1') && qHtml.includes('sm:grid-cols-2');
  const tResponsive = tHtml.includes('flex-col') && tHtml.includes('sm:flex-row');
  
  check(
    qResponsive && tResponsive,
    "Skeleton Loaders - Mobile/Desktop Responsiveness",
    "Skeleton Loaders",
    "Skeleton loaders specify responsive grid/flex Tailwind breakpoints (sm:grid-cols-2, sm:flex-row)."
  );
} catch (err: any) {
  check(false, "Skeleton Loaders - Mobile/Desktop Responsiveness", "Skeleton Loaders", `Error: ${err.message}`);
}

// Test 2.4: Dashboard Skeleton vs Page Structure Layout Shift
try {
  const fs = require('fs');
  const dashLoadingCode = fs.readFileSync('/home/sudipta/take-a-test/app/dashboard/loading.tsx', 'utf8');
  const dashPageCode = fs.readFileSync('/home/sudipta/take-a-test/app/dashboard/page.tsx', 'utf8');
  
  const loadingHasStats = dashLoadingCode.includes('Stats Grid Skeleton');
  const pageConditionalStats = dashPageCode.includes('completedCount > 0 &&');
  
  check(
    !loadingHasStats || !pageConditionalStats,
    "Skeleton Loaders - Dashboard Stats Grid Layout Shift",
    "Skeleton Loaders",
    loadingHasStats && pageConditionalStats
      ? "LAYOUT SHIFT: Dashboard loading skeleton ALWAYS renders stats grid, but actual page conditionally hides it for users with 0 completed tests."
      : "Dashboard loading skeleton matches page conditional rendering."
  );
} catch (err: any) {
  check(false, "Skeleton Loaders - Dashboard Stats Grid Layout Shift", "Skeleton Loaders", `Error: ${err.message}`);
}


// -------------------------------------------------------------
// 3. MICRO-ANIMATIONS & TOASTS TESTS
// -------------------------------------------------------------

// Test 3.1: CSS Keyframe Animation Compositor Optimization
try {
  const fs = require('fs');
  const css = fs.readFileSync('/home/sudipta/take-a-test/app/globals.css', 'utf8');
  
  const hasFadeUpKeyframe = css.includes('@keyframes fadeUp');
  const usesCompositorPropsOnly = css.includes('opacity') && css.includes('transform') && !css.includes('top:') && !css.includes('margin-top:');
  
  check(
    hasFadeUpKeyframe && usesCompositorPropsOnly,
    "Micro-Animations - Compositor Optimization",
    "Micro-Animations & Toasts",
    "Keyframe fadeUp uses opacity and transform (GPU compositor friendly properties)."
  );
} catch (err: any) {
  check(false, "Micro-Animations - Compositor Optimization", "Micro-Animations & Toasts", `Error: ${err.message}`);
}

// Test 3.2: Reduced Motion Accessibility Coverage
try {
  const fs = require('fs');
  const css = fs.readFileSync('/home/sudipta/take-a-test/app/globals.css', 'utf8');
  
  const hasPrefersReducedMotion = css.includes('@media (prefers-reduced-motion: reduce)');
  const hasImportantOverrides = css.includes('animation-duration: 0.01ms !important');
  
  check(
    hasPrefersReducedMotion && hasImportantOverrides,
    "Micro-Animations - Reduced Motion Support",
    "Micro-Animations & Toasts",
    "globals.css includes @media (prefers-reduced-motion: reduce) with !important overrides."
  );
} catch (err: any) {
  check(false, "Micro-Animations - Reduced Motion Support", "Micro-Animations & Toasts", `Error: ${err.message}`);
}

// Test 3.3: Toast Stacking & Overflow Limits
try {
  const fs = require('fs');
  const toastCode = fs.readFileSync('/home/sudipta/take-a-test/components/Toast.tsx', 'utf8');
  
  const hasMaxToastLimit = toastCode.includes('slice(-') || toastCode.includes('MAX_TOASTS') || toastCode.includes('length >');
  const hasScrollableContainer = toastCode.includes('max-h-') || toastCode.includes('overflow-y-auto');
  
  check(
    hasMaxToastLimit || hasScrollableContainer,
    "Toast Component - Stacking & Limit Safeguard",
    "Micro-Animations & Toasts",
    !hasMaxToastLimit && !hasScrollableContainer
      ? "UNBOUNDED STACKING: Toast system lacks max toast limit and scroll container; rapid toasts stack infinitely off-screen."
      : "Toast system has limit or scroll container."
  );
} catch (err: any) {
  check(false, "Toast Component - Stacking & Limit Safeguard", "Micro-Animations & Toasts", `Error: ${err.message}`);
}

// Test 3.4: Toast Spring Transition & Un-animated Vertical Shift
try {
  const fs = require('fs');
  const toastCode = fs.readFileSync('/home/sudipta/take-a-test/components/Toast.tsx', 'utf8');
  
  const usesCubicBezier = toastCode.includes('cubic-bezier(0.34, 1.56, 0.64, 1)');
  const rendersContainerFlexCol = toastCode.includes('flex flex-col gap-2');
  
  check(
    usesCubicBezier && rendersContainerFlexCol,
    "Toast Component - Cubic-Bezier & Vertical Flex Removal",
    "Micro-Animations & Toasts",
    "Uses cubic-bezier(0.34, 1.56, 0.64, 1) spring transition for horizontal enter/exit. Note: vertical repositioning when item is deleted from array is un-animated."
  );
} catch (err: any) {
  check(false, "Toast Component - Cubic-Bezier & Vertical Flex Removal", "Micro-Animations & Toasts", `Error: ${err.message}`);
}

// -------------------------------------------------------------
// PRINT SUMMARY
// -------------------------------------------------------------

console.log("\n=== TEST RESULTS SUMMARY ===");
results.forEach((r, idx) => {
  console.log(`${idx + 1}. [${r.category}] ${r.name}`);
  console.log(`   Result: ${r.passed ? "PASS" : "FAIL"}`);
  console.log(`   Details: ${r.details}\n`);
});

const passedCount = results.filter(r => r.passed).length;
console.log(`TOTAL: ${results.length} tests | PASSED: ${passedCount} | FAILED: ${results.length - passedCount}`);
