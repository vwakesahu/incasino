"use client";

import { useEffect, useState } from "react";
import { parseEther } from "viem";
import { WagerRounds } from "@/components/WagerRounds";
import { PlayButton } from "@/components/PlayButton";
import { GameStatus } from "@/components/GameStatus";
import { RoundResults } from "@/components/RoundResults";
import { useCasinoGame } from "@/hooks/useCasinoGame";
import { MAX_WAGER_PER_ROUND_ETH } from "@/utils/contract";

const MAX = Number(MAX_WAGER_PER_ROUND_ETH);

// Reel value (0..7) → symbol.
const SYMBOLS = ["🍒", "🍋", "🔔", "⭐", "💎", "7️⃣", "🍉", "🍇"] as const;

// Game-specific outcome-event args carried on result.raw.
interface SlotRaw {
  spins: readonly (readonly bigint[])[]; // each spin is a 3-tuple of reel values 0..7
  payouts: readonly bigint[];
  rounds: number;
}

type Reels = [number, number, number];

const IDLE: Reels = [5, 5, 5]; // 7️⃣ 7️⃣ 7️⃣

const randomReels = (): Reels => [
  Math.floor(Math.random() * SYMBOLS.length),
  Math.floor(Math.random() * SYMBOLS.length),
  Math.floor(Math.random() * SYMBOLS.length),
];

export default function SlotMachinePage() {
  const [wager, setWager] = useState(MAX_WAGER_PER_ROUND_ETH);
  const [rounds, setRounds] = useState(1);
  const [spinReels, setSpinReels] = useState<Reels>(IDLE);
  const { stage, error, result, isPlaying, play, retry } = useCasinoGame<SlotRaw>();

  const valid = Number(wager) > 0 && Number(wager) <= MAX;

  // Cycle the reels while a spin is in flight; clean up when it stops (SSR-safe:
  // effects only run in the browser, initial render is the deterministic IDLE triple).
  useEffect(() => {
    if (typeof window === "undefined" || !isPlaying) return;
    const id = window.setInterval(() => setSpinReels(randomReels()), 90);
    return () => window.clearInterval(id);
  }, [isPlaying]);

  const onPlay = () => {
    const perRound = parseEther(wager);
    play({
      functionName: "playSlots",
      playArgs: [perRound, rounds],
      wager: perRound * BigInt(rounds),
      outcomeEvent: "Slot_Outcome_Event",
    });
  };

  // Final spin once we have a result, cycling reels while playing, else idle.
  const reels: Reels = (() => {
    if (result) {
      const spins = result.raw.spins;
      const last = spins[spins.length - 1];
      return [Number(last[0]), Number(last[1]), Number(last[2])];
    }
    return isPlaying ? spinReels : IDLE;
  })();

  return (
    <main className="relative flex flex-col items-center justify-center bg-white px-5 py-[130px] bg-[linear-gradient(to_right,#80808022_1px,transparent_1px),linear-gradient(to_bottom,#80808022_1px,transparent_1px)] bg-[size:70px_70px]">
      <div className="grid w-full max-w-4xl items-center gap-8 md:grid-cols-2">
        {/* Visual */}
        <div className="flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 rounded-base border-4 border-black bg-[#3D6EF5] p-5 shadow-[6px_6px_0_0_#000]">
            <div className="flex gap-3">
              {reels.map((v, i) => (
                <div
                  key={i}
                  className={`flex h-28 w-24 items-center justify-center rounded-base border-4 border-black text-5xl shadow-[3px_3px_0_0_#000] ${
                    isPlaying ? "animate-pulse bg-yellow-300" : "bg-white"
                  }`}
                >
                  {SYMBOLS[v]}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-5 rounded-base border-4 border-black bg-white p-5 shadow-[6px_6px_0_0_#000]">
          <h1 className="font-heading text-2xl">Slots</h1>

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
