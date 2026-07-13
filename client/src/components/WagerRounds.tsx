"use client";

import { Minus, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_ROUNDS, MAX_WAGER_PER_ROUND_ETH } from "@/utils/contract";

const MAX_WAGER = Number(MAX_WAGER_PER_ROUND_ETH);

/** Wager (ETH, capped) + optional rounds stepper. Shared across all games. */
export function WagerRounds({
  wager,
  setWager,
  rounds,
  setRounds,
  showRounds = true,
  disabled = false,
}: {
  wager: string;
  setWager: (v: string) => void;
  rounds: number;
  setRounds: (n: number) => void;
  showRounds?: boolean;
  disabled?: boolean;
}) {
  const clampRounds = (n: number) => Math.max(1, Math.min(MAX_ROUNDS, n));
  const over = Number(wager) > MAX_WAGER;

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="wager">Wager per round (ETH)</Label>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setWager(MAX_WAGER_PER_ROUND_ETH)}
            className="rounded-base border-2 border-black bg-yellow-300 px-2 py-0.5 text-xs font-heading disabled:opacity-50"
          >
            Max {MAX_WAGER_PER_ROUND_ETH}
          </button>
        </div>
        <Input
          id="wager"
          type="number"
          step="0.0001"
          min="0"
          max={MAX_WAGER_PER_ROUND_ETH}
          value={wager}
          disabled={disabled}
          onChange={(e) => setWager(e.target.value)}
          className={over ? "border-red-500" : ""}
        />
        {over && (
          <span className="text-xs font-base text-red-600">
            Max is {MAX_WAGER_PER_ROUND_ETH} ETH per round.
          </span>
        )}
      </div>

      {showRounds && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label>Rounds</Label>
            <span className="text-xs font-base text-black/60">total {(Number(wager || 0) * rounds).toFixed(4)} ETH</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={disabled || rounds <= 1}
              onClick={() => setRounds(clampRounds(rounds - 1))}
              className="flex h-10 w-10 items-center justify-center rounded-base border-2 border-black bg-white transition-transform hover:-translate-y-0.5 disabled:opacity-40"
            >
              <Minus className="h-4 w-4" />
            </button>
            <div className="flex h-10 flex-1 items-center justify-center rounded-base border-2 border-black bg-white font-heading text-lg">
              {rounds}
            </div>
            <button
              type="button"
              disabled={disabled || rounds >= MAX_ROUNDS}
              onClick={() => setRounds(clampRounds(rounds + 1))}
              className="flex h-10 w-10 items-center justify-center rounded-base border-2 border-black bg-white transition-transform hover:-translate-y-0.5 disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
