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

interface CoinFlipRaw {
  outcomes: readonly bigint[]; // 1 = heads, 0 = tails
  payouts: readonly bigint[];
  rounds: number;
}

export default function CoinFlipPage() {
  const [choice, setChoice] = useState<"heads" | "tails">("heads");
  const [wager, setWager] = useState(MAX_WAGER_PER_ROUND_ETH);
  const [rounds, setRounds] = useState(1);
  const { stage, error, result, isPlaying, play, retry } = useCasinoGame<CoinFlipRaw>();
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

  useEffect(() => {
    if (spinningNow) {
      controls.start({
        rotateY: 360,
        transition: { rotateY: { repeat: Infinity, duration: 0.6, ease: "linear" } },
      });
    } else {
      controls.start({ rotateY: 0, transition: { duration: 0.3 } });
    }
  }, [spinningNow, controls]);

  const valid = Number(wager) > 0 && Number(wager) <= MAX && !busy;

  const landedIdx = result && reveal.active >= 0 && !reveal.spinning ? reveal.active : -1;
  const face =
    landedIdx >= 0
      ? Number(result!.raw.outcomes[landedIdx]) === 1
        ? "H"
        : "T"
      : choice === "heads"
        ? "H"
        : "T";
  const wonThis = landedIdx >= 0 ? result!.rounds[landedIdx].won : null;
  const ring = wonThis === true ? "ring-8 ring-green-400" : wonThis === false ? "ring-8 ring-red-400" : "";

  const onPlay = () => {
    const perRound = parseEther(wager);
    play({
      functionName: "playCoinFlip",
      playArgs: [perRound, choice === "heads", rounds],
      wager: perRound * BigInt(rounds),
      outcomeEvent: "CoinFlip_Outcome_Event",
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
          <motion.div
            animate={controls}
            className={`flex h-52 w-52 items-center justify-center rounded-full border-4 border-black bg-white shadow-[6px_6px_0_0_#000] ${ring}`}
          >
            {landedIdx >= 0 ? (
              <span className="text-7xl font-heading">{face}</span>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/coin-flip/main.webp" alt="coin" className="h-full w-full object-contain p-5" />
            )}
          </motion.div>

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
          <h1 className="font-heading text-2xl">Coin Flip</h1>

          <div className="grid grid-cols-2 gap-3">
            {(["heads", "tails"] as const).map((side) => (
              <button
                key={side}
                onClick={() => setChoice(side)}
                disabled={busy}
                className={`rounded-base border-4 border-black px-4 py-3 font-heading text-lg capitalize transition-transform hover:-translate-y-0.5 disabled:opacity-60 ${
                  choice === side ? "bg-[#3D6EF5] text-white" : "bg-white"
                }`}
              >
                {side}
              </button>
            ))}
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
