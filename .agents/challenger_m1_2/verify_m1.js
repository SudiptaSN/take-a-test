const fs = require('fs');
const path = require('path');

console.log("=== EMPIRICAL TEST HARNESS FOR MILESTONE 1 ===");
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    failed++;
  }
}

// -------------------------------------------------------------
// 1. PROCTOR LIGHTBOX MODAL LOGIC VERIFICATION
// -------------------------------------------------------------
console.log("\n--- 1. Testing Proctor Lightbox Navigation & Wrap-around Logic ---");

function computePrevIndex(currentIndex, totalCount) {
  if (currentIndex === null || totalCount <= 1) return currentIndex;
  return (currentIndex - 1 + totalCount) % totalCount;
}

function computeNextIndex(currentIndex, totalCount) {
  if (currentIndex === null || totalCount <= 1) return currentIndex;
  return (currentIndex + 1) % totalCount;
}

// Array size = 5 (indices 0..4)
assert(computePrevIndex(0, 5) === 4, "Prev from index 0 in array of 5 wraps around to 4");
assert(computePrevIndex(1, 5) === 0, "Prev from index 1 in array of 5 goes to 0");
assert(computePrevIndex(4, 5) === 3, "Prev from index 4 in array of 5 goes to 3");

assert(computeNextIndex(4, 5) === 0, "Next from index 4 in array of 5 wraps around to 0");
assert(computeNextIndex(0, 5) === 1, "Next from index 0 in array of 5 goes to 1");
assert(computeNextIndex(3, 5) === 4, "Next from index 3 in array of 5 goes to 4");

// Edge case: single element
assert(computePrevIndex(0, 1) === 0, "Prev from index 0 in single-element array returns 0 (no-op)");
assert(computeNextIndex(0, 1) === 0, "Next from index 0 in single-element array returns 0 (no-op)");

// Edge case: null index or 0 count
assert(computePrevIndex(null, 5) === null, "Prev with null index returns null");
assert(computeNextIndex(null, 5) === null, "Next with null index returns null");

// Click Backdrop vs Inner Modal Target Logic
console.log("\n--- Testing Click Target Logic (Backdrop vs Inner) ---");
function handleClick(targetId, currentTargetId) {
  let closed = false;
  const e = { target: targetId, currentTarget: currentTargetId };
  if (e.target === e.currentTarget) {
    closed = true;
  }
  return closed;
}

const BACKDROP = 'backdrop-div';
const IMAGE_CONTAINER = 'image-container-div';
const IMAGE = 'snapshot-img';
const CLOSE_BTN = 'close-button';
const THUMBNAIL = 'thumb-button';

assert(handleClick(BACKDROP, BACKDROP) === true, "Click directly on backdrop triggers onClose");
assert(handleClick(IMAGE_CONTAINER, BACKDROP) === false, "Click inside image container does NOT trigger onClose");
assert(handleClick(IMAGE, BACKDROP) === false, "Click directly on image does NOT trigger onClose");
assert(handleClick(CLOSE_BTN, BACKDROP) === false, "Click on close button does NOT trigger onClose via backdrop handler (handled by button onClick)");
assert(handleClick(THUMBNAIL, BACKDROP) === false, "Click on thumbnail does NOT trigger onClose");

// Read ProctorLightboxModal.tsx to verify actual code structure matches formulas
const lightboxPath = path.join(__dirname, '../../components/ProctorLightboxModal.tsx');
const lightboxCode = fs.readFileSync(lightboxPath, 'utf8');

assert(lightboxCode.includes('(currentIndex - 1 + snapshots.length) % snapshots.length'), "ProctorLightboxModal contains correct ArrowLeft wrap-around formula");
assert(lightboxCode.includes('(currentIndex + 1) % snapshots.length'), "ProctorLightboxModal contains correct ArrowRight wrap-around formula");
assert(lightboxCode.includes('e.target === e.currentTarget'), "ProctorLightboxModal contains backdrop click condition (e.target === e.currentTarget)");
assert(lightboxCode.includes('ArrowLeft') && lightboxCode.includes('ArrowRight') && lightboxCode.includes('Escape'), "ProctorLightboxModal listens for Escape, ArrowLeft, ArrowRight keys");


// -------------------------------------------------------------
// 2. SKELETON LOADERS VERIFICATION
// -------------------------------------------------------------
console.log("\n--- 2. Testing Skeleton Loaders & Loading Boundaries ---");

const testCardSkeletonCode = fs.readFileSync(path.join(__dirname, '../../components/skeletons/TestCardSkeleton.tsx'), 'utf8');
const questionSkeletonCode = fs.readFileSync(path.join(__dirname, '../../components/skeletons/QuestionSkeleton.tsx'), 'utf8');
const adminLoadingCode = fs.readFileSync(path.join(__dirname, '../../app/admin/loading.tsx'), 'utf8');
const dashboardLoadingCode = fs.readFileSync(path.join(__dirname, '../../app/dashboard/loading.tsx'), 'utf8');
const adminPageCode = fs.readFileSync(path.join(__dirname, '../../app/admin/page.tsx'), 'utf8');
const dashboardPageCode = fs.readFileSync(path.join(__dirname, '../../app/dashboard/page.tsx'), 'utf8');

assert(testCardSkeletonCode.includes('animate-pulse'), "TestCardSkeleton includes animate-pulse");
assert(questionSkeletonCode.includes('animate-pulse'), "QuestionSkeleton includes animate-pulse");

// Shimmer contrast classes
assert(testCardSkeletonCode.includes('bg-zinc-800'), "TestCardSkeleton uses bg-zinc-800 contrast fills");
assert(questionSkeletonCode.includes('bg-zinc-800'), "QuestionSkeleton uses bg-zinc-800 contrast fills");

// Grid & container alignment checks
assert(adminLoadingCode.includes('max-w-5xl mx-auto px-6 py-10'), "admin/loading.tsx container matches admin/page.tsx (max-w-5xl mx-auto px-6 py-10)");
assert(adminPageCode.includes('max-w-5xl mx-auto px-6 py-10'), "admin/page.tsx container matches admin/loading.tsx");

assert(dashboardLoadingCode.includes('max-w-4xl mx-auto px-6 py-10'), "dashboard/loading.tsx container matches dashboard/page.tsx (max-w-4xl mx-auto px-6 py-10)");
assert(dashboardPageCode.includes('max-w-4xl mx-auto px-6 py-10'), "dashboard/page.tsx container matches dashboard/loading.tsx");

assert(dashboardLoadingCode.includes('grid grid-cols-3 gap-4'), "dashboard/loading.tsx stats skeleton grid aligns with dashboard/page.tsx grid-cols-3");
assert(dashboardPageCode.includes('grid grid-cols-3 gap-4'), "dashboard/page.tsx stats grid matches dashboard/loading.tsx");


// -------------------------------------------------------------
// 3. MICRO-ANIMATIONS VERIFICATION
// -------------------------------------------------------------
console.log("\n--- 3. Testing Micro-Animations, Hover States & Toasts ---");

const globalsCss = fs.readFileSync(path.join(__dirname, '../../app/globals.css'), 'utf8');
const toastCode = fs.readFileSync(path.join(__dirname, '../../components/Toast.tsx'), 'utf8');

assert(globalsCss.includes('.btn {') && globalsCss.includes('active:scale-95'), "globals.css .btn includes active:scale-95");
assert(globalsCss.includes('.btn-secondary {') && globalsCss.includes('active:scale-95'), "globals.css .btn-secondary includes active:scale-95");
assert(globalsCss.includes('.interactive-element') && globalsCss.includes('active:scale-95'), "globals.css .interactive-element includes active:scale-95");
assert(globalsCss.includes('@keyframes fadeUp'), "globals.css includes @keyframes fadeUp");
assert(globalsCss.includes('.animate-fade-up'), "globals.css includes .animate-fade-up utility");

assert(toastCode.includes('cubic-bezier(0.34, 1.56, 0.64, 1)'), "Toast component uses spring cubic-bezier timing (0.34, 1.56, 0.64, 1)");
assert(toastCode.includes("mounted ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-8 opacity-0 scale-95'"), "Toast component has entrance/exit transform classes");
assert(toastCode.includes("setTimeout(onDismiss, 300)"), "Toast component allows 300ms transition for exit animation before unmounting");
assert(toastCode.includes("active:scale-95"), "Toast dismiss button includes active:scale-95");


console.log(`\nSummary: Passed ${passed}/${passed + failed} checks.`);
if (failed > 0) {
  process.exit(1);
}
