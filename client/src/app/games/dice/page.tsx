"use client";

import { useEffect, useState } from "react";
import { parseEther } from "viem";
import { motion, useAnimation } from "framer-motion";
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

// Shape of the Dice_Outcome_Event args, surfaced via PlayResult.raw.
interface DiceRaw {
  rolls: readonly bigint[]; // each 0..100
  payouts: readonly bigint[];
  rounds: number;
}

export default function DicePage() {
  const [guess, setGuess] = useState(50);
  const [isOver, setIsOver] = useState(true);
  const [wager, setWager] = useState(MAX_WAGER_PER_ROUND_ETH);
  const [rounds, setRounds] = useState(1);
  const { stage, error, result, isPlaying, play, retry } = useCasinoGame<DiceRaw>();
  const celebrate = useWinFx();
  const reveal = useSequentialReveal(result, {
    onLand: (r) => {
      if (r.won) celebrate();
    },
  });

  const controls = useAnimation();
  const revealing = result !== null && !reveal.done;
  const busy = isPlaying || revealing;
  const spinningNow = isPlaying || (revealing && reveal.spinning);

  // Cycle a fake roll while spinning so the number visibly churns.
  const [spinRoll, setSpinRoll] = useState(0);
  useEffect(() => {
    if (!spinningNow) return;
    const id = window.setInterval(() => setSpinRoll(Math.floor(Math.random() * 101)), 60);
    return () => window.clearInterval(id);
  }, [spinningNow]);

  useEffect(() => {
    if (spinningNow) {
      controls.start({
        scale: [1, 1.08, 1],
        transition: { repeat: Infinity, duration: 0.4, ease: "easeInOut" },
      });
    } else {
      controls.start({ scale: 1, transition: { duration: 0.2 } });
    }
  }, [spinningNow, controls]);

  const chance = isOver ? 100 - guess : guess; // % (always 1..99)
  const multiplier = ((100 / chance) * 0.98).toFixed(2);

  // Winning zone on the 0..100 track (over → right of guess, under → left).
  const winLeft = isOver ? guess : 0;
  const winWidth = isOver ? 100 - guess : guess;

  const valid = guess >= 1 && guess <= 99 && Number(wager) > 0 && Number(wager) <= MAX && !busy;

  // Round currently landed on screen (-1 while spinning / before start).
  const landedIdx = result && reveal.active >= 0 && !reveal.spinning ? reveal.active : -1;
  const landedRoll = landedIdx >= 0 ? Number(result!.raw.rolls[landedIdx]) : null;
  const wonThis = landedIdx >= 0 ? result!.rounds[landedIdx].won : null;

  // What the big number + track marker show: cycling while spinning, the
  // landed roll once a round settles, otherwise nothing (idle shows the guess).
  const displayRoll = spinningNow ? spinRoll : landedRoll;
  const bigNumber = spinningNow ? spinRoll : landedRoll !== null ? landedRoll : guess;
  const boxClass = spinningNow
    ? "animate-pulse bg-yellow-300"
    : landedRoll !== null
    ? wonThis
      ? "bg-green-400"
      : "bg-red-400"
    : "bg-white text-black/30";

  const onPlay = () => {
    const perRound = parseEther(wager);
    play({
      functionName: "playDice",
      playArgs: [guess, isOver, perRound, rounds],
      wager: perRound * BigInt(rounds),
      outcomeEvent: "Dice_Outcome_Event",
    });
  };

  const onSkip = () => {
    reveal.skip();
    if (result && result.net > 0n) celebrate();
  };

  return (
    <main className="relative flex flex-col items-center justify-center bg-white px-5 py-[130px] bg-[linear-gradient(to_right,#80808022_1px,transparent_1px),linear-gradient(to_bottom,#80808022_1px,transparent_1px)] bg-[size:70px_70px]">
      <div className="grid w-full max-w-4xl items-center gap-8 md:grid-cols-2">
        {/* Visual */}
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="flex w-full max-w-sm flex-col gap-6 rounded-base border-4 border-black bg-white p-6 shadow-[6px_6px_0_0_#000]">
            <div className="flex items-center justify-center">
              <motion.div
                animate={controls}
                className={`flex h-28 w-28 items-center justify-center rounded-base border-4 border-black text-5xl font-heading shadow-[4px_4px_0_0_#000] ${boxClass}`}
              >
                {bigNumber}
              </motion.div>
            </div>

            {/* 0..100 track: green winning side + guess marker + roll marker */}
            <div className="relative h-8 w-full overflow-hidden rounded-base border-4 border-black bg-gray-200">
              <div
                className="absolute inset-y-0 bg-green-400"
                style={{ left: `${winLeft}%`, width: `${winWidth}%` }}
              />
              <div
                className="absolute inset-y-0 w-1 -translate-x-1/2 bg-black"
                style={{ left: `${guess}%` }}
              />
              {displayRoll !== null && (
                <div
                  className="absolute inset-y-0 w-1.5 -translate-x-1/2 bg-[#3D6EF5]"
                  style={{ left: `${displayRoll}%` }}
                />
              )}
            </div>

            <div className="flex items-center justify-between font-heading text-sm">
              <span>0</span>
              <span className="rounded-base border-2 border-black bg-yellow-300 px-2 py-0.5">
                {isOver ? "over" : "under"} {guess}
              </span>
              <span>100</span>
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
          <h1 className="font-heading text-2xl">Dice</h1>

          <div className="grid grid-cols-2 gap-3">
            {([
              { label: "Over", val: true },
              { label: "Under", val: false },
            ] as const).map((opt) => (
              <button
                key={opt.label}
                onClick={() => setIsOver(opt.val)}
                disabled={busy}
                className={`rounded-base border-4 border-black px-4 py-3 font-heading text-lg transition-transform hover:-translate-y-0.5 disabled:opacity-60 ${
                  isOver === opt.val ? "bg-[#3D6EF5] text-white" : "bg-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-heading text-sm">Roll {isOver ? "over" : "under"}</span>
              <span className="rounded-base border-2 border-black bg-yellow-300 px-2 py-0.5 font-heading text-sm">
                {guess}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={99}
              value={guess}
              disabled={busy}
              onChange={(e) => setGuess(Number(e.target.value))}
              className="w-full accent-[#3D6EF5] disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-base border-2 border-black bg-white p-2 text-center">
              <div className="text-xs font-base text-black/60">Win chance</div>
              <div className="font-heading text-lg">{chance}%</div>
            </div>
            <div className="rounded-base border-2 border-black bg-white p-2 text-center">
              <div className="text-xs font-base text-black/60">Multiplier</div>
              <div className="font-heading text-lg">{multiplier}x</div>
            </div>
          </div>

          <WagerRounds
            wager={wager}
            setWager={setWager}
            rounds={rounds}
            setRounds={setRounds}
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
