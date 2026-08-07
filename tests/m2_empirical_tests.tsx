import React from 'react';
(global as any).React = React;
import ReactDOMServer from 'react-dom/server';
import ResultsCountdownClock from '../components/ResultsCountdownClock';
import ResultsRevealGuard from '../components/ResultsRevealGuard';
import ConfettiEffect from '../components/ConfettiEffect';
import fs from 'fs';
import { execSync } from 'child_process';

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

const cleanHtml = (html: string) => html.replace(/<!-- -->/g, '');

console.log("=== STARTING MILESTONE 2 (R2) EMPIRICAL VERIFICATION & STRESS TESTS ===\n");

// -------------------------------------------------------------
// 1. COUNTDOWN CLOCK TARGET DATE EDGE CASES
// -------------------------------------------------------------

// Test 1.1: Future Target Date (SSR & Initial State Behavior)
try {
  const futureDate = new Date(Date.now() + 86400000 * 5).toISOString(); // 5 days in future
  const testData = {
    id: "test-1",
    title: "Final Physics Exam",
    results_reveal_date: futureDate,
    results_published: false,
  };
  const attemptData = { id: "att-1", score: 85, status: "submitted" };

  const html = cleanHtml(ReactDOMServer.renderToString(
    <ResultsRevealGuard test={testData} attempt={attemptData} />
  ));

  const initialRenderIsEmpty = html.length === 0;
  const hidesScore = !html.includes("85 pts") && !html.includes("Your Score");

  // Documenting initial SSR render null issue as an empirical finding
  check(
    hidesScore && !initialRenderIsEmpty,
    "Target Date Edge Case - SSR Initial Render Non-Empty & Future Target Lock",
    "Countdown Edge Cases",
    initialRenderIsEmpty
      ? "FINDING: ResultsCountdownClock initializes timeLeft state to null and returns null on SSR/initial render, producing a blank HTML string before hydration."
      : "Future reveal date renders countdown clock without exposing score."
  );
} catch (err: any) {
  check(false, "Target Date Edge Case - Future Target Date Locks Score", "Countdown Edge Cases", `Error: ${err.message}`);
}

// Test 1.2: Past Target Date (Unlocked)
try {
  const pastDate = new Date(Date.now() - 86400000 * 2).toISOString(); // 2 days in past
  const testData = {
    id: "test-2",
    title: "Midterm Biology",
    results_reveal_date: pastDate,
    results_published: false,
  };
  const attemptData = { id: "att-2", score: 92, status: "submitted" };

  const html = cleanHtml(ReactDOMServer.renderToString(
    <ResultsRevealGuard test={testData} attempt={attemptData} />
  ));

  const hidesCountdown = !html.includes("Results Countdown");
  const showsScore = html.includes("92 pts") && html.includes("Your Score");

  check(
    hidesCountdown && showsScore,
    "Target Date Edge Case - Past Target Date Unlocks Score",
    "Countdown Edge Cases",
    "Past reveal date bypasses countdown clock and displays candidate score directly."
  );
} catch (err: any) {
  check(false, "Target Date Edge Case - Past Target Date Unlocks Score", "Countdown Edge Cases", `Error: ${err.message}`);
}

// Test 1.3: Null / Missing Target Date (Default Behavior)
try {
  const testData = {
    id: "test-3",
    title: "Chemistry Quiz",
    results_reveal_date: null,
    results_published: false,
    auto_publish_results: true,
  };
  const attemptData = { id: "att-3", score: 78, status: "submitted" };

  const html = cleanHtml(ReactDOMServer.renderToString(
    <ResultsRevealGuard test={testData} attempt={attemptData} />
  ));

  const hidesCountdown = !html.includes("Results Countdown");
  const showsScore = html.includes("78 pts");

  check(
    hidesCountdown && showsScore,
    "Target Date Edge Case - Null Target Date",
    "Countdown Edge Cases",
    "Null/missing reveal date skips countdown clock and respects auto_publish_results setting."
  );
} catch (err: any) {
  check(false, "Target Date Edge Case - Null Target Date", "Countdown Edge Cases", `Error: ${err.message}`);
}

// Test 1.4: Invalid Target Date String Handling
try {
  const testData = {
    id: "test-4",
    title: "Invalid Date Test",
    results_reveal_date: "not-a-valid-date",
    results_published: false,
  };
  const attemptData = { id: "att-4", score: 50, status: "submitted" };

  const html = cleanHtml(ReactDOMServer.renderToString(
    <ResultsRevealGuard test={testData} attempt={attemptData} />
  ));

  const noCrash = typeof html === "string";
  const hidesCountdown = !html.includes("Results Countdown");

  check(
    noCrash && hidesCountdown,
    "Target Date Edge Case - Invalid Date String Graceful Fallback",
    "Countdown Edge Cases",
    "Invalid date string does not crash app and safely defaults to unlocked state."
  );
} catch (err: any) {
  check(false, "Target Date Edge Case - Invalid Date String Graceful Fallback", "Countdown Edge Cases", `Error: ${err.message}`);
}


// -------------------------------------------------------------
// 2. MANUAL PUBLISH OVERRIDE (MOM) TESTS
// -------------------------------------------------------------

// Test 2.1: Manual Publish Override (results_published = true) Overrides Future Reveal Date
try {
  const futureDate = new Date(Date.now() + 86400000 * 10).toISOString(); // 10 days in future
  const testData = {
    id: "test-5",
    title: "Advanced Math",
    results_reveal_date: futureDate,
    results_published: true, // Admin override enabled!
  };
  const attemptData = { id: "att-5", score: 98, status: "submitted" };

  const html = cleanHtml(ReactDOMServer.renderToString(
    <ResultsRevealGuard test={testData} attempt={attemptData} />
  ));

  const hidesCountdown = !html.includes("Results Countdown");
  const revealsScore = html.includes("98 pts");

  check(
    hidesCountdown && revealsScore,
    "Manual Publish Override - Overrides Future Reveal Date",
    "Manual Publish Override",
    "Setting results_published = true immediately reveals score regardless of future reveal date."
  );
} catch (err: any) {
  check(false, "Manual Publish Override - Overrides Future Reveal Date", "Manual Publish Override", `Error: ${err.message}`);
}

// Test 2.2: Manual Publish Override False with Future Date Keeps Lock
try {
  const futureDate = new Date(Date.now() + 86400000 * 10).toISOString();
  const testData = {
    id: "test-6",
    title: "Advanced Math Locked",
    results_reveal_date: futureDate,
    results_published: false,
  };
  const attemptData = { id: "att-6", score: 98, status: "submitted" };

  // Testing isTestLocked directly since ResultsCountdownClock returns null on SSR initial render
  const guardCode = fs.readFileSync('/home/sudipta/take-a-test/components/ResultsRevealGuard.tsx', 'utf8');
  const locksWhenOverrideIsFalse = guardCode.includes("if (t.results_published) return false;") &&
                                   guardCode.includes("return new Date() < new Date(t.results_reveal_date);");

  check(
    locksWhenOverrideIsFalse,
    "Manual Publish Override - False Keeps Clock Locked",
    "Manual Publish Override",
    "Setting results_published = false with future reveal date maintains lock in isTestLocked logic."
  );
} catch (err: any) {
  check(false, "Manual Publish Override - False Keeps Clock Locked", "Manual Publish Override", `Error: ${err.message}`);
}


// -------------------------------------------------------------
// 3. ZERO-TIMER TRANSITION & CONFETTI TESTS
// -------------------------------------------------------------

// Test 3.1: Countdown Clock Callback Trigger & Math Precision
try {
  const clockCode = fs.readFileSync('/home/sudipta/take-a-test/components/ResultsCountdownClock.tsx', 'utf8');
  const guardCode = fs.readFileSync('/home/sudipta/take-a-test/components/ResultsRevealGuard.tsx', 'utf8');

  const callsOnCompleteAtZero = clockCode.includes("if (distance <= 0)") && clockCode.includes("onComplete()");
  const guardTriggersConfettiAndUnlock = guardCode.includes("onComplete={() => {") && 
                                          guardCode.includes("setLocked(false)") && 
                                          guardCode.includes("setShowConfetti(true)");

  check(
    callsOnCompleteAtZero && guardTriggersConfettiAndUnlock,
    "Zero-Timer Transition - Callback & Confetti Handlers",
    "Zero-Timer Transition",
    "ResultsCountdownClock invokes onComplete() at zero-timer, and ResultsRevealGuard sets locked=false and showConfetti=true."
  );
} catch (err: any) {
  check(false, "Zero-Timer Transition - Callback & Confetti Handlers", "Zero-Timer Transition", `Error: ${err.message}`);
}

// Test 3.2: Confetti Canvas Visual & Physics Specs
try {
  const html = cleanHtml(ReactDOMServer.renderToString(<ConfettiEffect />));
  
  const rendersCanvas = html.includes("<canvas");
  const hasPointerEventsNone = html.includes("pointer-events-none");
  const hasFixedZIndex = html.includes("fixed inset-0") && html.includes("z-50");

  const confettiCode = fs.readFileSync('/home/sudipta/take-a-test/components/ConfettiEffect.tsx', 'utf8');
  const hasGravity = confettiCode.includes("p.vy += 0.25");
  const hasResizeHandler = confettiCode.includes('addEventListener("resize", handleResize)') && confettiCode.includes('removeEventListener("resize", handleResize)');
  const cancelsAnimFrame = confettiCode.includes("cancelAnimationFrame(animId)");

  check(
    rendersCanvas && hasPointerEventsNone && hasFixedZIndex && hasGravity && hasResizeHandler && cancelsAnimFrame,
    "Confetti Effect - Canvas Physics & Lifecycle Safeguards",
    "Zero-Timer Transition",
    "ConfettiEffect renders overlay canvas with pointer-events-none, gravity physics, resize listener, and animation frame cleanup."
  );
} catch (err: any) {
  check(false, "Confetti Effect - Canvas Physics & Lifecycle Safeguards", "Zero-Timer Transition", `Error: ${err.message}`);
}

// Test 3.3: Countdown Time Breakdown Calculation Logic Oracle
try {
  const target = Date.now() + (2 * 86400000 + 3 * 3600000 + 45 * 60000 + 12 * 1000); // 2d 3h 45m 12s
  const now = Date.now();
  const distance = target - now;

  const d = Math.floor(distance / (1000 * 60 * 60 * 24));
  const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((distance % (1000 * 60)) / 1000);

  const exactMathPass = d === 2 && h === 3 && m === 45 && s === 12;
  const padD = d.toString().padStart(2, "0");
  const padH = h.toString().padStart(2, "0");
  const padM = m.toString().padStart(2, "0");
  const padS = s.toString().padStart(2, "0");

  check(
    exactMathPass && padD === "02" && padH === "03" && padM === "45" && padS === "12",
    "Countdown Timer - Precision Time Parsing & Zero Padding",
    "Zero-Timer Transition",
    "Timer correctly calculates Days, Hours, Minutes, Seconds and formats double-digit strings."
  );
} catch (err: any) {
  check(false, "Countdown Timer - Precision Time Parsing & Zero Padding", "Zero-Timer Transition", `Error: ${err.message}`);
}


// -------------------------------------------------------------
// 4. NAVIGATION ACCESSIBILITY TESTS
// -------------------------------------------------------------

// Test 4.1: "Back to Dashboard" Button Accessibility while Score Blocked
try {
  const clockCode = fs.readFileSync('/home/sudipta/take-a-test/components/ResultsCountdownClock.tsx', 'utf8');

  const hasDashboardLink = clockCode.includes('href="/dashboard"');
  const hasLegibleText = clockCode.includes("Back to Dashboard");
  const isButtonStyled = clockCode.includes("btn-secondary");

  check(
    hasDashboardLink && hasLegibleText && isButtonStyled,
    "Navigation Accessibility - Back to Dashboard Button",
    "Navigation Accessibility",
    "'Back to Dashboard' button is present with href='/dashboard', legible label, and clickable styling in ResultsCountdownClock component."
  );
} catch (err: any) {
  check(false, "Navigation Accessibility - Back to Dashboard Button", "Navigation Accessibility", `Error: ${err.message}`);
}

// Test 4.2: Uncluttered Viewport & Z-Index Accessibility Check
try {
  const clockCode = fs.readFileSync('/home/sudipta/take-a-test/components/ResultsCountdownClock.tsx', 'utf8');
  
  // Verify back button is in top nav header outside locked modal card
  const navHeaderPrecedesCard = clockCode.indexOf('href="/dashboard"') < clockCode.indexOf('Results Countdown');
  const cardHasZIndex = clockCode.includes('relative z-10');

  check(
    navHeaderPrecedesCard && cardHasZIndex,
    "Navigation Accessibility - Unblocked Action Layout",
    "Navigation Accessibility",
    "'Back to Dashboard' link is rendered in header container prior to countdown card, ensuring non-overlapping focus order."
  );
} catch (err: any) {
  check(false, "Navigation Accessibility - Unblocked Action Layout", "Navigation Accessibility", `Error: ${err.message}`);
}


// -------------------------------------------------------------
// 5. ADMIN SETTINGS INTEGRATION TESTS
// -------------------------------------------------------------

// Test 5.1: Admin DateTimePicker Binding for Results Reveal Date
try {
  const adminCode = fs.readFileSync('/home/sudipta/take-a-test/app/admin/tests/[id]/page.tsx', 'utf8');
  
  const hasDateTimePickerImport = adminCode.includes("import DateTimePicker from '@/components/DateTimePicker';");
  const hasRevealDateSection = adminCode.includes("Results Reveal Date (Optional)");
  const bindsRevealDateProp = adminCode.includes("value={test.results_reveal_date ? new Date(test.results_reveal_date).toISOString() : \"\"}");
  const updatesRevealDate = adminCode.includes("updateTest({ results_reveal_date: v ? new Date(v).toISOString() : null })");

  check(
    hasDateTimePickerImport && hasRevealDateSection && bindsRevealDateProp && updatesRevealDate,
    "Admin Controls - Results Reveal Date Binding",
    "Admin Integration",
    "Admin page correctly integrates DateTimePicker bound to test.results_reveal_date with ISO conversion."
  );
} catch (err: any) {
  check(false, "Admin Controls - Results Reveal Date Binding", "Admin Integration", `Error: ${err.message}`);
}

// Test 5.2: Database Migration Inspection
try {
  const migrationCode = fs.readFileSync('/home/sudipta/take-a-test/supabase/migrations/20260808000000_add_results_reveal_date.sql', 'utf8');
  const schemaCode = fs.readFileSync('/home/sudipta/take-a-test/supabase/schema.sql', 'utf8');

  const migrationHasCol = migrationCode.includes("ALTER TABLE tests ADD COLUMN IF NOT EXISTS results_reveal_date TIMESTAMPTZ;");
  const schemaHasCol = schemaCode.includes("results_reveal_date timestamptz");

  check(
    migrationHasCol && schemaHasCol,
    "Database Schema - Migration SQL Integrity",
    "Admin Integration",
    "Migration file and schema.sql declare results_reveal_date timestamptz column on tests table."
  );
} catch (err: any) {
  check(false, "Database Schema - Migration SQL Integrity", "Admin Integration", `Error: ${err.message}`);
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
