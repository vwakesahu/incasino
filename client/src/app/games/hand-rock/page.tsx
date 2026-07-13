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

// Outcome-event args emitted by playRPS, used for the vs. visual.
interface RPSRaw {
  houseActions: readonly bigint[];
  payouts: readonly bigint[];
  rounds: number;
}

const MOVES = ["✊", "✋", "✌️"] as const;
const LABELS = ["Rock", "Paper", "Scissors"] as const;

export default function RockPaperScissorsPage() {
  const [action, setAction] = useState(0);
  const [wager, setWager] = useState(MAX_WAGER_PER_ROUND_ETH);
  const [rounds, setRounds] = useState(1);
  const { stage, error, result, isPlaying, play, retry } = useCasinoGame<RPSRaw>();

  const valid = Number(wager) > 0 && Number(wager) <= MAX;

  const house = result?.raw.houseActions;
  const houseLast = house && house.length > 0 ? Number(house[house.length - 1]) : null;

  const onPlay = () => {
    const perRound = parseEther(wager);
    play({
      functionName: "playRPS",
      playArgs: [action, perRound, rounds],
      wager: perRound * BigInt(rounds),
      outcomeEvent: "RPS_Outcome_Event",
    });
  };

  return (
    <main className="relative flex flex-col items-center justify-center bg-white px-5 py-[130px] bg-[linear-gradient(to_right,#80808022_1px,transparent_1px),linear-gradient(to_bottom,#80808022_1px,transparent_1px)] bg-[size:70px_70px]">
      <div className="grid w-full max-w-4xl items-center gap-8 md:grid-cols-2">
        {/* Visual */}
        <div className="flex items-center justify-center gap-4">
          <div
            className={`flex h-40 w-40 items-center justify-center rounded-full border-4 border-black text-6xl font-heading shadow-[6px_6px_0_0_#000] ${
              isPlaying ? "animate-pulse bg-yellow-300" : "bg-[#3D6EF5] text-white"
            }`}
          >
            {MOVES[action]}
          </div>

          {houseLast !== null && (
            <>
              <span className="font-heading text-2xl">vs</span>
              <div className="flex h-40 w-40 items-center justify-center rounded-full border-4 border-black bg-white text-6xl font-heading shadow-[6px_6px_0_0_#000]">
                {MOVES[houseLast]}
              </div>
            </>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-5 rounded-base border-4 border-black bg-white p-5 shadow-[6px_6px_0_0_#000]">
          <h1 className="font-heading text-2xl">Rock Paper Scissors</h1>

          <div className="grid grid-cols-3 gap-3">
            {LABELS.map((label, i) => (
              <button
                key={label}
                onClick={() => setAction(i)}
                disabled={isPlaying}
                className={`flex flex-col items-center gap-1 rounded-base border-4 border-black px-2 py-3 font-heading transition-transform hover:-translate-y-0.5 ${
                  action === i ? "bg-[#3D6EF5] text-white" : "bg-white"
                }`}
              >
                <span className="text-3xl">{MOVES[i]}</span>
                <span className="text-sm">{label}</span>
              </button>
            ))}
          </div>

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
