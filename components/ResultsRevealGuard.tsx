"use client";

import { useState } from "react";
import ResultsCountdownClock from "./ResultsCountdownClock";
import ConfettiEffect from "./ConfettiEffect";
import RoastButton from "./RoastButton";
import AppealForm from "./AppealForm";

interface TestData {
  id: string;
  title: string;
  auto_publish_results?: boolean | null;
  results_published?: boolean | null;
  results_reveal_date?: string | null;
  is_leaderboard_public?: boolean | null;
}

interface AttemptData {
  id: string;
  score?: number | null;
  status: string;
}

export interface ResultsRevealGuardProps {
  test: TestData;
  attempt: AttemptData;
}

const isTestLocked = (t: TestData) => {
  if (t.results_published) return false;
  if (!t.results_reveal_date) return false;
  return new Date() < new Date(t.results_reveal_date);
};

export default function ResultsRevealGuard({ test, attempt }: ResultsRevealGuardProps) {
  const [locked, setLocked] = useState(() => isTestLocked(test));
  const [showConfetti, setShowConfetti] = useState(false);

  const isTerminated = attempt.status === "terminated";
  const resultsVisible =
    test.results_published ||
    test.auto_publish_results ||
    (test.results_reveal_date ? new Date() >= new Date(test.results_reveal_date) : false);

  if (locked && test.results_reveal_date) {
    return (
      <ResultsCountdownClock
        targetDate={test.results_reveal_date}
        testTitle={test.title}
        onComplete={() => {
          setLocked(false);
          setShowConfetti(true);
        }}
      />
    );
  }

  return (
    <main className="max-w-xl mx-auto p-10 text-center relative">
      {showConfetti && <ConfettiEffect />}

      <h1 className="text-3xl font-bold mb-2">
        {isTerminated ? "Exam Terminated" : "Test submitted"}
      </h1>

      {isTerminated ? (
        <>
          <p className="text-red-400 mt-2 mb-6 bg-red-950/30 border border-red-900/50 p-4 rounded-lg">
            Your exam was terminated due to violation of proctoring rules. If you believe this was an error, you may submit an appeal below.
          </p>
          <AppealForm attemptId={attempt.id} testTitle={test.title} />
        </>
      ) : resultsVisible ? (
        <div className="bg-red-950/20 border border-red-900/50 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-zinc-400 mb-1">Your Score</h2>
          <div className="text-6xl font-bold text-orange-500">{attempt.score ?? 0} pts</div>
        </div>
      ) : (
        <p className="text-zinc-400 mt-2 mb-8 bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg">
          Your response has been recorded. Results are currently hidden and will be released by the admin.
        </p>
      )}

      <div className="mt-6 flex justify-center gap-3">
        <a href="/dashboard" className="btn-secondary">Back to Dashboard</a>
        {test.is_leaderboard_public && resultsVisible && (
          <a
            href={`/test/${test.id}/leaderboard`}
            className="btn bg-orange-600 hover:bg-orange-500 border-none text-white shadow-[0_0_15px_rgba(234,88,12,0.3)]"
          >
            View Wall of Flame 🔥
          </a>
        )}
      </div>

      {resultsVisible && !isTerminated && (
        <div className="mt-8 pt-8 border-t border-zinc-800">
          <RoastButton attemptId={attempt.id} />
        </div>
      )}
    </main>
  );
}
