"use client";

import { useEffect, useState } from "react";
import { parseEther } from "viem";
import { SkipForward } from "lucide-react";
import { WagerRounds } from "@/components/WagerRounds";
import { PlayButton } from "@/components/PlayButton";
import { GameStatus } from "@/components/GameStatus";
import { RoundResults } from "@/components/RoundResults";
import { useCasinoGame } from "@/hooks/useCasinoGame";
import { useSequentialReveal } from "@/hooks/useSequentialReveal";
import { useWinFx } from "@/hooks/useWinFx";
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
  const celebrate = useWinFx();
  const reveal = useSequentialReveal(result, {
    onLand: (r) => {
      if (r.won) celebrate();
    },
  });

  const revealing = result !== null && !reveal.done;
  const busy = isPlaying || revealing;
  const spinningNow = isPlaying || (revealing && reveal.spinning);

  const valid = Number(wager) > 0 && Number(wager) <= MAX && !busy;

  // Cycle the reels while a spin is in flight; clean up when it stops (SSR-safe:
  // effects only run in the browser, initial render is the deterministic IDLE triple).
  useEffect(() => {
    if (typeof window === "undefined" || !spinningNow) return;
    const id = window.setInterval(() => setSpinReels(randomReels()), 90);
    return () => window.clearInterval(id);
  }, [spinningNow]);

  const onPlay = () => {
    const perRound = parseEther(wager);
    play({
      functionName: "playSlots",
      playArgs: [perRound, rounds],
      wager: perRound * BigInt(rounds),
      outcomeEvent: "Slot_Outcome_Event",
    });
  };

  const onSkip = () => {
    reveal.skip();
    if (result && result.net > 0n) celebrate();
  };

  // Which round is currently resting on the reels (-1 while spinning / idle).
  const landedIdx = result && reveal.active >= 0 && !reveal.spinning ? reveal.active : -1;
  const wonThis = landedIdx >= 0 ? result!.rounds[landedIdx].won : null;

  const reels: Reels =
    landedIdx >= 0
      ? [
          Number(result!.raw.spins[landedIdx][0]),
          Number(result!.raw.spins[landedIdx][1]),
          Number(result!.raw.spins[landedIdx][2]),
        ]
      : spinningNow
        ? spinReels
        : IDLE;

  const reelBox = spinningNow
    ? "animate-pulse bg-yellow-300"
    : wonThis === true
      ? "bg-green-300 ring-4 ring-green-400"
      : wonThis === false
        ? "bg-red-300 ring-4 ring-red-400"
        : "bg-white";

  return (
    <main className="relative flex flex-col items-center justify-center bg-white px-5 py-[130px] bg-[linear-gradient(to_right,#80808022_1px,transparent_1px),linear-gradient(to_bottom,#80808022_1px,transparent_1px)] bg-[size:70px_70px]">
      <div className="grid w-full max-w-4xl items-center gap-8 md:grid-cols-2">
        {/* Visual */}
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="flex flex-col items-center gap-4 rounded-base border-4 border-black bg-[#3D6EF5] p-5 shadow-[6px_6px_0_0_#000]">
            <div className="flex gap-3">
              {reels.map((v, i) => (
                <div
                  key={i}
                  className={`flex h-28 w-24 items-center justify-center rounded-base border-4 border-black text-5xl shadow-[3px_3px_0_0_#000] ${reelBox}`}
                >
                  {SYMBOLS[v]}
                </div>
              ))}
            </div>
          </div>

          {revealing && (
            <div className="flex items-center gap-3">
              <span className="rounded-base border-2 border-black bg-yellow-300 px-3 py-1 font-heading text-sm">
                Round {reveal.active + 1} / {result!.rounds.length}
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
          <h1 className="font-heading text-2xl">Slots</h1>

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
          {result && <RoundResults result={result} count={reveal.done ? undefined : reveal.revealed} />}
        </div>
      </div>
    </main>
  );
}
