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

export default function CoinFlipPage() {
  const [choice, setChoice] = useState<"heads" | "tails">("heads");
  const [wager, setWager] = useState(MAX_WAGER_PER_ROUND_ETH);
  const [rounds, setRounds] = useState(1);
  const { stage, error, result, isPlaying, play, retry } = useCasinoGame();

  const valid = Number(wager) > 0 && Number(wager) <= MAX;

  const onPlay = () => {
    const perRound = parseEther(wager);
    play({
      functionName: "playCoinFlip",
      playArgs: [perRound, choice === "heads", rounds],
      wager: perRound * BigInt(rounds),
      outcomeEvent: "CoinFlip_Outcome_Event",
    });
  };

  return (
    <main className="relative flex flex-col items-center justify-center bg-white px-5 py-[130px] bg-[linear-gradient(to_right,#80808022_1px,transparent_1px),linear-gradient(to_bottom,#80808022_1px,transparent_1px)] bg-[size:70px_70px]">
      <div className="grid w-full max-w-4xl items-center gap-8 md:grid-cols-2">
        {/* Visual */}
        <div className="flex items-center justify-center">
          <div
            className={`flex h-52 w-52 items-center justify-center rounded-full border-4 border-black text-6xl font-heading shadow-[6px_6px_0_0_#000] ${
              isPlaying ? "animate-spin bg-yellow-300" : choice === "heads" ? "bg-[#3D6EF5] text-white" : "bg-white"
            }`}
          >
            {choice === "heads" ? "H" : "T"}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-5 rounded-base border-4 border-black bg-white p-5 shadow-[6px_6px_0_0_#000]">
          <h1 className="font-heading text-2xl">Coin Flip</h1>

          <div className="grid grid-cols-2 gap-3">
            {(["heads", "tails"] as const).map((side) => (
              <button
                key={side}
                onClick={() => setChoice(side)}
                disabled={isPlaying}
                className={`rounded-base border-4 border-black px-4 py-3 font-heading text-lg capitalize transition-transform hover:-translate-y-0.5 ${
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
