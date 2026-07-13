"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { parseEther } from "viem";
import { SkipForward } from "lucide-react";
import { BallManager } from "@/modules/plinko/BallManager";
import { simulationData } from "@/utils/simulation";
import { WagerRounds } from "@/components/WagerRounds";
import { PlayButton } from "@/components/PlayButton";
import { GameStatus } from "@/components/GameStatus";
import { RoundResults } from "@/components/RoundResults";
import { InfoButton } from "@/components/InfoButton";
import { useCasinoGame } from "@/hooks/useCasinoGame";
import { useWinFx } from "@/hooks/useWinFx";
import { MAX_WAGER_PER_ROUND_ETH } from "@/utils/contract";
import type { PlayResult } from "@/types";

const MAX = Number(MAX_WAGER_PER_ROUND_ETH);

// Outcome-event args for Plinko: which sink (0..16) each round landed in.
interface PlinkoRaw {
  buckets: readonly bigint[];
  payouts: readonly bigint[];
  rounds: number;
}

// A recorded ball start-x that deterministically lands in the given sink (0..16).
function startXForBucket(bucket: number): number {
  const arr = simulationData[bucket] ?? simulationData[8];
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function PlinkoPage() {
  const [wager, setWager] = useState(MAX_WAGER_PER_ROUND_ETH);
  const [rounds, setRounds] = useState(1);
  const { stage, error, result, isPlaying, play, retry } = useCasinoGame<PlinkoRaw>();
  const celebrate = useWinFx();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const managerRef = useRef<BallManager | null>(null);
  const seqRef = useRef<{ buckets: number[]; i: number; active: boolean }>({
    buckets: [],
    i: 0,
    active: false,
  });
  const resultRef = useRef<PlayResult<PlinkoRaw> | null>(null);
  resultRef.current = result;

  const [revealed, setRevealed] = useState(0);

  const total = result?.rounds.length ?? 0;
  const revealing = result !== null && revealed < total;
  const busy = isPlaying || revealing;

  // Drop the next round's ball into its sink.
  const dropNext = useCallback(() => {
    const s = seqRef.current;
    const mgr = managerRef.current;
    if (!s.active || !mgr || s.i >= s.buckets.length) return;
    mgr.addBall(startXForBucket(s.buckets[s.i]));
  }, []);

  // Called when a ball settles into a sink.
  const handleFinish = useCallback(() => {
    const s = seqRef.current;
    const res = resultRef.current;
    if (!s.active || !res) return;
    const roundIdx = s.i;
    if (roundIdx >= s.buckets.length) return;
    setRevealed(roundIdx + 1);
    if (res.rounds[roundIdx]?.won) celebrate();
    s.i += 1;
    if (s.i < s.buckets.length) window.setTimeout(dropNext, 400);
    else s.active = false;
  }, [celebrate, dropNext]);

  // One BallManager for the canvas lifetime.
  useEffect(() => {
    if (!canvasRef.current) return;
    const mgr = new BallManager(canvasRef.current, () => handleFinish());
    managerRef.current = mgr;
    return () => {
      mgr.stop();
      managerRef.current = null;
    };
  }, [handleFinish]);

  // Start dropping balls when a new settled result arrives.
  useEffect(() => {
    if (!result) {
      seqRef.current = { buckets: [], i: 0, active: false };
      setRevealed(0);
      return;
    }
    seqRef.current = { buckets: result.raw.buckets.map((b) => Number(b)), i: 0, active: true };
    setRevealed(0);
    dropNext();
  }, [result, dropNext]);

  const valid = Number(wager) > 0 && Number(wager) <= MAX && !busy;

  const onPlay = () => {
    const perRound = parseEther(wager);
    play({
      functionName: "playPlinko",
      playArgs: [perRound, rounds],
      wager: perRound * BigInt(rounds),
      outcomeEvent: "Plinko_Outcome_Event",
    });
  };

  const onSkip = () => {
    seqRef.current.active = false;
    setRevealed(total);
    if (result && result.net > 0n) celebrate();
  };

  return (
    <main className="relative flex flex-col items-center justify-center bg-white px-5 py-[130px] bg-[linear-gradient(to_right,#80808022_1px,transparent_1px),linear-gradient(to_bottom,#80808022_1px,transparent_1px)] bg-[size:70px_70px]">
      <div className="grid w-full max-w-4xl items-center gap-8 md:grid-cols-2">
        {/* Visual: canvas physics board (800x800 internally, CSS-scaled) */}
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="rounded-base border-4 border-black bg-white p-3 shadow-[6px_6px_0_0_#000]">
            <canvas
              ref={canvasRef}
              width={800}
              height={800}
              className="h-auto w-full max-w-[360px]"
            />
          </div>

          {revealing && (
            <div className="flex items-center gap-3">
              <span className="rounded-base border-2 border-black bg-yellow-300 px-3 py-1 font-heading text-sm">
                Ball {Math.min(revealed + 1, total)} / {total}
              </span>
              <button
                onClick={onSkip}
                className="flex items-center gap-1 rounded-base border-2 border-black bg-white px-3 py-1 font-heading text-sm transition-transform hover:-translate-y-0.5"
              >
                <SkipForward className="h-4 w-4" /> Skip
              </button>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-5 rounded-base border-4 border-black bg-white p-5 shadow-[6px_6px_0_0_#000]">
          <div className="flex items-center justify-between">
            <h1 className="font-heading text-2xl">Plinko</h1>
            <InfoButton>
              <p>A ball drops through the pegs into one of 17 sinks.</p>
              <p>
                Edge sinks pay up to <b>16x</b>; the closer to the center, the smaller the payout
                (down to 1/16x).
              </p>
              <p>Center sinks pay back less than your stake, so only the edges are net wins.</p>
            </InfoButton>
          </div>

          <WagerRounds
            wager={wager}
            setWager={setWager}
            rounds={rounds}
            setRounds={setRounds}
            showRounds
            disabled={busy}
          />

          <PlayButton onPlay={onPlay} isPlaying={busy} disabled={!valid} />
          <GameStatus stage={stage} error={error} onRetry={retry} />
          {result && <RoundResults result={result} count={revealing ? revealed : undefined} />}
        </div>
      </div>
    </main>
  );
}
