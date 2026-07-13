"use client";

import { useState } from "react";
import { parseEther } from "viem";
import { WagerRounds } from "@/components/WagerRounds";
import { PlayButton } from "@/components/PlayButton";
import { GameStatus } from "@/components/GameStatus";
import { RoundResults } from "@/components/RoundResults";
import { useCasinoGame } from "@/hooks/useCasinoGame";
import { MAX_WAGER_PER_ROUND_ETH } from "@/utils/contract";

const MAX = Number(MAX_WAGER_PER_ROUND_ETH);

// Outcome-event args for Plinko: which bucket each round landed in + payouts.
interface PlinkoRaw {
  buckets: readonly bigint[]; // each 0..16
  payouts: readonly bigint[];
  rounds: number;
}

const PEG_ROWS = 8;

// Bucket labels, index 0..16 (edges pay most, center pays least).
const MULTIPLIERS = [
  "16", "8", "4", "2", "1", "0.5", "0.25", "0.125", "0.06",
  "0.125", "0.25", "0.5", "1", "2", "4", "8", "16",
] as const;

function bucketStyle(i: number): string {
  const m = Number(MULTIPLIERS[i]);
  if (m >= 4) return "bg-yellow-300 text-black"; // hot edges: 16x / 8x / 4x
  if (m >= 1) return "bg-[#3D6EF5] text-white"; // warm: 2x / 1x
  return "bg-gray-100 text-black/50"; // muted center: <1x
}

export default function PlinkoPage() {
  const [wager, setWager] = useState(MAX_WAGER_PER_ROUND_ETH);
  const [rounds, setRounds] = useState(1);
  const { stage, error, result, isPlaying, play, retry } = useCasinoGame<PlinkoRaw>();

  const valid = Number(wager) > 0 && Number(wager) <= MAX;

  // Highlight the bucket the last round landed in.
  const winIdx =
    result && result.raw.buckets.length > 0
      ? Number(result.raw.buckets[result.raw.buckets.length - 1])
      : -1;

  const onPlay = () => {
    const perRound = parseEther(wager);
    play({
      functionName: "playPlinko",
      playArgs: [perRound, rounds],
      wager: perRound * BigInt(rounds),
      outcomeEvent: "Plinko_Outcome_Event",
    });
  };

  return (
    <main className="relative flex flex-col items-center justify-center bg-white px-5 py-[130px] bg-[linear-gradient(to_right,#80808022_1px,transparent_1px),linear-gradient(to_bottom,#80808022_1px,transparent_1px)] bg-[size:70px_70px]">
      <div className="grid w-full max-w-4xl items-center gap-8 md:grid-cols-2">
        {/* Visual */}
        <div className="flex items-center justify-center">
          <div className="w-full rounded-base border-4 border-black bg-white p-4 shadow-[6px_6px_0_0_#000]">
            {/* Drop zone */}
            <div className="flex h-6 items-start justify-center">
              {isPlaying && (
                <div className="h-3 w-3 animate-bounce rounded-full border-2 border-black bg-yellow-300" />
              )}
            </div>

            {/* Peg triangle */}
            <div className="flex flex-col items-center gap-2.5 py-2">
              {Array.from({ length: PEG_ROWS }).map((_, r) => (
                <div key={r} className="flex justify-center gap-3">
                  {Array.from({ length: r + 1 }).map((_, c) => (
                    <span
                      key={c}
                      className="h-2 w-2 rounded-full bg-black md:h-2.5 md:w-2.5"
                    />
                  ))}
                </div>
              ))}
            </div>

            {/* Multiplier buckets */}
            <div className="mt-3 flex gap-0.5">
              {MULTIPLIERS.map((m, i) => (
                <div
                  key={i}
                  className={`flex min-w-0 flex-1 items-center justify-center rounded-base border-2 border-black px-0.5 py-1.5 text-[8px] font-heading leading-none tracking-tight transition-transform ${bucketStyle(
                    i
                  )} ${i === winIdx ? "-translate-y-0.5 ring-4 ring-green-400" : ""}`}
                >
                  {m}x
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-5 rounded-base border-4 border-black bg-white p-5 shadow-[6px_6px_0_0_#000]">
          <h1 className="font-heading text-2xl">Plinko</h1>

          <WagerRounds
            wager={wager}
            setWager={setWager}
            rounds={rounds}
            setRounds={setRounds}
            showRounds
            disabled={isPlaying}
          />

          <PlayButton onPlay={onPlay} isPlaying={isPlaying} disabled={!valid} />
          <GameStatus stage={stage} error={error} onRetry={retry} />
          <RoundResults result={result} />
        </div>
      </div>
    </main>
  );
}
