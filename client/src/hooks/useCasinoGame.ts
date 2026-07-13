"use client";

import { useCallback, useState } from "react";
import { useGameContext } from "./useGameContext";
import { runGame } from "@/utils/inco";
import type { GameStage, PlayArgs, PlayResult } from "@/types";

function friendlyError(e: unknown): string {
  const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
  if (msg.includes("user rejected") || msg.includes("user denied")) return "You rejected the transaction.";
  if (msg.includes("insufficient funds")) return "Not enough ETH for the wager + gas.";
  if (msg.includes("wagertoohigh")) return "Wager is above the per-round cap (0.0005 ETH).";
  if (msg.includes("invalidrounds")) return "Rounds must be between 1 and 10.";
  if (msg.includes("insufficientbankroll")) return "House bankroll can't cover this bet right now — try fewer rounds.";
  if (msg.includes("insufficientvalue")) return "Send the wager plus the small Inco fee.";
  if (msg.includes("attestedreveal") || msg.includes("covalidator")) return "The reveal timed out. Please try again.";
  return "Something went wrong. Please try again.";
}

export interface PlayOpts {
  functionName: string;
  playArgs: PlayArgs;
  wager: bigint; // total wager (perRound * rounds)
  outcomeEvent: string;
}

/** Manages the play → reveal → settle lifecycle + inline stage/result/error state. */
export function useCasinoGame<TRaw = unknown>() {
  const { ctx, ready, isConnected } = useGameContext();
  const [stage, setStage] = useState<GameStage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PlayResult<TRaw> | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [last, setLast] = useState<PlayOpts | null>(null);

  const run = useCallback(
    async (opts: PlayOpts) => {
      if (!ctx) {
        setError("Connect your wallet to play.");
        return;
      }
      setLast(opts);
      setError(null);
      setResult(null);
      setIsPlaying(true);
      setStage("betting");
      try {
        const res = await runGame<TRaw>(ctx, { ...opts, onStage: setStage });
        setResult(res);
        setStage("done");
      } catch (e) {
        setError(friendlyError(e));
        setStage(null);
      } finally {
        setIsPlaying(false);
      }
    },
    [ctx]
  );

  const retry = useCallback(() => {
    if (last) void run(last);
  }, [last, run]);

  const reset = useCallback(() => {
    setError(null);
    setResult(null);
    setStage(null);
  }, []);

  return { ctx, ready, isConnected, stage, error, result, isPlaying, play: run, retry, reset };
}
