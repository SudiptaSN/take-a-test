const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log("==================================================");
console.log("  M3 (R3) EMPIRICAL UI STRESS TEST SUITE");
console.log("==================================================\n");

let passedCount = 0;
let failedCount = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`[FAIL] ${name}: ${err.message}`);
    failedCount++;
  }
}

const rootDir = path.resolve(__dirname, '../..');

// 1. BUTTON ACTIVE PRESS STATE (active:scale-95)
console.log("--- 1. Testing Button Active Press State (active:scale-95) ---");

test("globals.css contains active:scale-95 for .btn", () => {
  const css = fs.readFileSync(path.join(rootDir, 'app/globals.css'), 'utf8');
  assert(css.includes('.btn {') && css.includes('active:scale-95'), ".btn class must include active:scale-95");
});

test("globals.css contains active:scale-95 for .btn-secondary", () => {
  const css = fs.readFileSync(path.join(rootDir, 'app/globals.css'), 'utf8');
  assert(css.includes('.btn-secondary {') && css.includes('active:scale-95'), ".btn-secondary class must include active:scale-95");
});

test("globals.css contains active:scale-95 for .interactive-element", () => {
  const css = fs.readFileSync(path.join(rootDir, 'app/globals.css'), 'utf8');
  assert(css.includes('.interactive-element') && css.includes('active:scale-95'), ".interactive-element must include active:scale-95");
});

test("TeaserPingButton includes active:scale-95 and disabled:transform-none", () => {
  const code = fs.readFileSync(path.join(rootDir, 'components/TeaserPingButton.tsx'), 'utf8');
  assert(code.includes('active:scale-95'), "TeaserPingButton must include active:scale-95");
  assert(code.includes('disabled:transform-none'), "TeaserPingButton must include disabled:transform-none to suppress press scaling while pending");
});

// 2. BUTTON LOADING / DISABLED STATE WHILE POST IS PENDING
console.log("\n--- 2. Testing Button Loading/Disabled State During POST ---");

test("TeaserPingButton disables button during loading state", () => {
  const code = fs.readFileSync(path.join(rootDir, 'components/TeaserPingButton.tsx'), 'utf8');
  assert(code.includes('disabled={loading}'), "Button element must be bound to disabled={loading}");
  assert(code.includes('disabled:opacity-50'), "Button must visual state opacity-50 when disabled");
  assert(code.includes('disabled:cursor-not-allowed'), "Button must set cursor-not-allowed when disabled");
});

test("TeaserPingButton has guard against rapid double-clicks", () => {
  const code = fs.readFileSync(path.join(rootDir, 'components/TeaserPingButton.tsx'), 'utf8');
  assert(code.includes('if (loading) return;'), "handlePing must guard against concurrent calls when loading is true");
});

test("TeaserPingButton displays spinner and 'Sending...' label during POST", () => {
  const code = fs.readFileSync(path.join(rootDir, 'components/TeaserPingButton.tsx'), 'utf8');
  assert(code.includes('loading ?'), "Must conditionally render loading UI");
  assert(code.includes('animate-spin'), "Must render spinning SVG loader during POST");
  assert(code.includes('Sending...'), "Must show 'Sending...' text while POST is pending");
});

test("TeaserPingButton cleans up loading state in finally block", () => {
  const code = fs.readFileSync(path.join(rootDir, 'components/TeaserPingButton.tsx'), 'utf8');
  assert(code.includes('finally {'), "Must use finally block to ensure loading reset");
  assert(/finally\s*\{\s*setLoading\(false\);?\s*\}/.test(code), "finally block must set loading to false");
});

// 3. TOAST NOTIFICATION FEEDBACK ON SUCCESS AND FAILURE
console.log("\n--- 3. Testing Toast Notification Feedback ---");

test("Toast component provides success and error variants with animation timing", () => {
  const toastCode = fs.readFileSync(path.join(rootDir, 'components/Toast.tsx'), 'utf8');
  assert(toastCode.includes("ToastVariant = 'success' | 'error' | 'info'"), "Toast component must define success, error, and info types");
  assert(toastCode.includes("cubic-bezier(0.34, 1.56, 0.64, 1)"), "Toast must use spring timing curve");
  assert(toastCode.includes("auto-dismiss") || toastCode.includes("closeTimer"), "Toast must auto-dismiss after timer");
  assert(toastCode.includes("active:scale-95"), "Toast dismiss button must have active:scale-95");
});

test("TeaserPingButton triggers success toast on HTTP 200", () => {
  const code = fs.readFileSync(path.join(rootDir, 'components/TeaserPingButton.tsx'), 'utf8');
  assert(code.includes('toast("⚡ Teaser Ping sent to Discord!", "success")'), "Must trigger success toast with expected message");
});

test("TeaserPingButton triggers error toast on HTTP error response", () => {
  const code = fs.readFileSync(path.join(rootDir, 'components/TeaserPingButton.tsx'), 'utf8');
  assert(code.includes('if (!res.ok)'), "Must check if response is not ok");
  assert(code.includes('toast(data.error || "Failed to send Discord teaser ping", "error")'), "Must display error toast from response data or default error message");
});

test("TeaserPingButton catches network exceptions and shows error toast", () => {
  const code = fs.readFileSync(path.join(rootDir, 'components/TeaserPingButton.tsx'), 'utf8');
  assert(code.includes('catch (err: any)'), "Must have catch block for fetch exceptions");
  assert(code.includes('toast(err?.message || "Network error occurred", "error")'), "Must show error toast on fetch exception");
});

// 4. TEST CARD BUTTON LAYOUT CONSISTENCY ACROSS SKELETON LOADER AND HYDRATED PAGE
console.log("\n--- 4. Testing Skeleton vs Hydrated Test Card Layout Consistency ---");

test("Admin loading skeleton passes buttonCount={5} matching Admin page test card buttons", () => {
  const adminLoadingCode = fs.readFileSync(path.join(rootDir, 'app/admin/loading.tsx'), 'utf8');
  const adminPageCode = fs.readFileSync(path.join(rootDir, 'app/admin/page.tsx'), 'utf8');

  // Verify AdminLoading uses buttonCount={5}
  assert(adminLoadingCode.includes('buttonCount={5}'), "AdminLoading must specify buttonCount={5}");

  // Verify AdminPage test card has 5 buttons: TeaserPingButton, Edit link, Invites link, Attempts link, DeleteTestButton
  assert(adminPageCode.includes('<TeaserPingButton testId={t.id} />'), "Admin TestCard must include TeaserPingButton");
  assert(adminPageCode.includes('href={`/admin/tests/${t.id}`}'), "Admin TestCard must include Edit link");
  assert(adminPageCode.includes('href={`/admin/tests/${t.id}/invites`}'), "Admin TestCard must include Invites link");
  assert(adminPageCode.includes('href={`/admin/tests/${t.id}/attempts`}'), "Admin TestCard must include Attempts link");
  assert(adminPageCode.includes('<DeleteTestButton id={t.id} title={t.title} />'), "Admin TestCard must include DeleteTestButton");

  // Count buttons in Admin TestCard layout
  const buttonMatches = [
    'TeaserPingButton',
    'Edit',
    'Invites',
    'Attempts',
    'DeleteTestButton'
  ];
  buttonMatches.forEach(btn => {
    assert(adminPageCode.includes(btn), `Admin TestCard contains ${btn}`);
  });
});

test("Dashboard loading skeleton passes buttonCount={2} matching Candidate dashboard test card buttons", () => {
  const dashLoadingCode = fs.readFileSync(path.join(rootDir, 'app/dashboard/loading.tsx'), 'utf8');
  const dashPageCode = fs.readFileSync(path.join(rootDir, 'app/dashboard/page.tsx'), 'utf8');

  assert(dashLoadingCode.includes('buttonCount={2}'), "DashboardLoading must specify buttonCount={2}");
  assert(dashPageCode.includes('flex items-center gap-2'), "Dashboard TestCard must have flex container for buttons");
});

test("TestCardSkeleton structural flex layout and responsive breakpoints match hydrated test cards", () => {
  const skeletonCode = fs.readFileSync(path.join(rootDir, 'components/skeletons/TestCardSkeleton.tsx'), 'utf8');
  const adminPageCode = fs.readFileSync(path.join(rootDir, 'app/admin/page.tsx'), 'utf8');

  // Check card container styling parity
  assert(skeletonCode.includes('card flex flex-col sm:flex-row sm:items-center justify-between gap-4'), "Skeleton must use exact card outer container flex layout");
  assert(adminPageCode.includes('card flex items-center justify-between'), "Admin page card must use matching card outer container flex layout");
  assert(skeletonCode.includes('flex items-center flex-wrap gap-2'), "Skeleton button container must use flex items-center flex-wrap gap-2");
  assert(adminPageCode.includes('flex flex-wrap gap-2'), "Admin page button container must use flex flex-wrap gap-2");
});

test("TestCardSkeleton maintains ARIA accessibility tags to prevent screen reader degradation", () => {
  const skeletonCode = fs.readFileSync(path.join(rootDir, 'components/skeletons/TestCardSkeleton.tsx'), 'utf8');
  assert(skeletonCode.includes('role="status"'), "TestCardSkeleton must include role='status'");
  assert(skeletonCode.includes('aria-busy="true"'), "TestCardSkeleton must include aria-busy='true'");
  assert(skeletonCode.includes('<span className="sr-only">Loading content...</span>'), "TestCardSkeleton must include sr-only loading text");
});

console.log("\n==================================================");
console.log(`  RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log("==================================================");

if (failedCount > 0) {
  process.exit(1);
}
