"use client";

import { Loader2, Check, AlertTriangle, RotateCcw } from "lucide-react";
import type { GameStage } from "@/types";

const STEPS: { key: GameStage; label: string }[] = [
  { key: "betting", label: "Placing bet" },
  { key: "revealing", label: "Revealing" },
  { key: "settling", label: "Paying out" },
];

const order = (s: GameStage) => STEPS.findIndex((x) => x.key === s);

/**
 * Inline status for the two-phase flow. Shows a 3-step stepper while running,
 * an error box with retry on failure, and nothing when idle.
 */
export function GameStatus({
  stage,
  error,
  onRetry,
}: {
  stage: GameStage | null;
  error: string | null;
  onRetry?: () => void;
}) {
  if (error) {
    return (
      <div className="flex items-center gap-3 rounded-base border-4 border-black bg-red-400 px-4 py-3 text-left text-black shadow-[4px_4px_0_0_#000]">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <span className="flex-1 text-sm font-base">{error}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1 rounded-base border-2 border-black bg-white px-3 py-1.5 text-sm font-heading transition-transform hover:-translate-y-0.5"
          >
            <RotateCcw className="h-4 w-4" /> Retry
          </button>
        )}
      </div>
    );
  }

  if (!stage || stage === "done") return null;

  const active = order(stage);
  return (
    <div className="flex items-center justify-between gap-2 rounded-base border-4 border-black bg-white px-4 py-3 shadow-[4px_4px_0_0_#000]">
      {STEPS.map((step, i) => {
        const done = i < active;
        const current = i === active;
        return (
          <div key={step.key} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-black ${
                done ? "bg-green-400" : current ? "bg-yellow-300" : "bg-gray-200"
              }`}
            >
              {done ? (
                <Check className="h-4 w-4" />
              ) : current ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span className="text-xs font-heading">{i + 1}</span>
              )}
            </div>
            <span className={`text-xs sm:text-sm font-base ${current ? "font-heading" : ""}`}>
              {step.label}
            </span>
            {i < STEPS.length - 1 && <div className="hidden h-0.5 flex-1 bg-black/20 sm:block" />}
          </div>
        );
      })}
    </div>
  );
}
