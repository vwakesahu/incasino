"use client";

import { useState } from "react";
import { parseEther } from "viem";
import { SkipForward } from "lucide-react";
import Marquee from "@/components/ui/marquee";
import { WagerRounds } from "@/components/WagerRounds";
import { PlayButton } from "@/components/PlayButton";
import { GameStatus } from "@/components/GameStatus";
import { RoundResults } from "@/components/RoundResults";
import { InfoButton } from "@/components/InfoButton";
import { useCasinoGame } from "@/hooks/useCasinoGame";
import { useSequentialReveal } from "@/hooks/useSequentialReveal";
import { useWinFx } from "@/hooks/useWinFx";
import { MAX_WAGER_PER_ROUND_ETH } from "@/utils/contract";

const MAX = Number(MAX_WAGER_PER_ROUND_ETH);

// Reel value (0..7) → symbol.
const SYMBOLS = ["🍒", "🍋", "🔔", "⭐", "💎", "7️⃣", "🍉", "🍇"] as const;

interface SlotRaw {
  spins: readonly (readonly bigint[])[]; // each spin is a 3-tuple of reel values 0..7
  payouts: readonly bigint[];
  rounds: number;
}

type Reels = [number, number, number];
const IDLE: Reels = [5, 5, 5]; // 7️⃣ 7️⃣ 7️⃣

// A vertically-scrolling reel of symbols (used while spinning).
function Reel({ reverse }: { reverse?: boolean }) {
  return (
    <Marquee
      vertical
      reverse={reverse}
      className={`[--duration:0.5s] ${reverse ? "border-x-2 border-black" : ""}`}
    >
      {SYMBOLS.map((s, i) => (
        <div key={i} className="flex items-center justify-center py-0.5 text-3xl m800:text-2xl">
          {s}
        </div>
      ))}
    </Marquee>
  );
}

export default function SlotMachinePage() {
  const [wager, setWager] = useState(MAX_WAGER_PER_ROUND_ETH);
  const [rounds, setRounds] = useState(1);
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
      : IDLE;

  const windowBg =
    wonThis === true
      ? "bg-green-300 ring-4 ring-green-400"
      : wonThis === false
        ? "bg-red-300 ring-4 ring-red-400"
        : "bg-white";

  return (
    <main className="relative flex flex-col items-center justify-center bg-white px-5 py-[130px] bg-[linear-gradient(to_right,#80808022_1px,transparent_1px),linear-gradient(to_bottom,#80808022_1px,transparent_1px)] bg-[size:70px_70px]">
      <div className="grid w-full max-w-4xl items-center gap-8 md:grid-cols-2">
        {/* Visual: the slot-machine cabinet with reels in its window */}
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="relative w-[360px] max-w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/svgs/slot-machine.svg" alt="slot machine" className="w-full" />
            <div className="absolute left-[17%] top-[34%] h-[25.4%] w-[58.2%]">
              <div
                className={`grid h-full w-full grid-cols-3 overflow-hidden rounded-lg border-2 border-black transition-colors ${windowBg}`}
              >
                {spinningNow ? (
                  <>
                    <Reel />
                    <Reel reverse />
                    <Reel />
                  </>
                ) : (
                  reels.map((v, i) => (
                    <div
                      key={i}
                      className={`flex items-center justify-center text-3xl m800:text-2xl ${
                        i === 1 ? "border-x-2 border-black" : ""
                      }`}
                    >
                      {SYMBOLS[v]}
                    </div>
                  ))
                )}
              </div>
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
          <div className="flex items-center justify-between">
            <h1 className="font-heading text-2xl">Slots</h1>
            <InfoButton>
              <p>Spin three reels. Winning combos:</p>
              <p>
                7️⃣7️⃣7️⃣ → <b>5x</b> · any triple → up to <b>5.25x</b> · two 7️⃣ → <b>1.5x</b>
              </p>
              <p>
                A 3-in-a-row run (0.66x) or any pair (0.33x) pays back less than your stake, so only
                triples and double-7s are net wins.
              </p>
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
          {result && <RoundResults result={result} count={reveal.done ? undefined : reveal.revealed} />}
        </div>
      </div>
    </main>
  );
}
