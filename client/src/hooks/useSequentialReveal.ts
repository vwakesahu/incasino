"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PlayResult, RoundResult } from "@/types";

interface Opts {
  spinMs?: number;
  landMs?: number;
  onLand?: (round: RoundResult, index: number) => void;
}

export interface RevealState {
  active: number; // round index currently on screen (-1 before start)
  spinning: boolean; // mid-spin for `active` (result not yet shown)
  done: boolean; // all rounds revealed (or skipped)
  revealed: number; // count of rounds whose result is now visible
  skip: () => void;
}

/**
 * Reveals a finished PlayResult one round at a time (spin → land → next),
 * so multi-bet games build curiosity. onLand fires as each round lands.
 * skip() jumps straight to the final state.
 */
export function useSequentialReveal(result: PlayResult | null, opts: Opts = {}): RevealState {
  const { spinMs = 850, landMs = 650 } = opts;
  const onLandRef = useRef(opts.onLand);
  onLandRef.current = opts.onLand;

  const [active, setActive] = useState(-1);
  const [spinning, setSpinning] = useState(false);
  const [done, setDone] = useState(false);
  const timers = useRef<number[]>([]);

  const clear = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  };

  useEffect(() => {
    clear();
    setActive(-1);
    setSpinning(false);
    setDone(false);
    if (!result) return;

    const n = result.rounds.length;
    let t = 0;
    for (let i = 0; i < n; i++) {
      timers.current.push(
        window.setTimeout(() => {
          setActive(i);
          setSpinning(true);
        }, t)
      );
      t += spinMs;
      timers.current.push(
        window.setTimeout(() => {
          setSpinning(false);
          onLandRef.current?.(result.rounds[i], i);
        }, t)
      );
      t += landMs;
    }
    timers.current.push(window.setTimeout(() => setDone(true), t));
    return clear;
  }, [result, spinMs, landMs]);

  const skip = useCallback(() => {
    clear();
    if (result) {
      setActive(result.rounds.length - 1);
      setSpinning(false);
      setDone(true);
    }
  }, [result]);

  const revealed = active < 0 ? 0 : spinning ? active : active + 1;

  return { active, spinning, done, revealed, skip };
}
