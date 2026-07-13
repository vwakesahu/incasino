"use client";

import { useState } from "react";
import { parseEther } from "viem";
import { Github, ArrowUpRight, Minus, Plus } from "lucide-react";
import { WagerRounds } from "@/components/WagerRounds";
import { PlayButton } from "@/components/PlayButton";
import { GameStatus } from "@/components/GameStatus";
import { RoundResults } from "@/components/RoundResults";
import { Label } from "@/components/ui/label";
import { useCasinoGame } from "@/hooks/useCasinoGame";
import { MAX_WAGER_PER_ROUND_ETH } from "@/utils/contract";

const MAX = Number(MAX_WAGER_PER_ROUND_ETH);
const SIZE = 5; // 5x5 board
const MIN_MINES = 1;
const MAX_MINES = 5;
const MAX_PICKS = 10;

/** Outcome-event args for Mines — each point is [row, col]. */
interface MinesRaw {
  selectedPoints: readonly (readonly bigint[])[];
  minePositions: readonly (readonly bigint[])[];
}

const clampMines = (n: number) => Math.max(MIN_MINES, Math.min(MAX_MINES, n));

export default function MinesPage() {
  const [selected, setSelected] = useState<number[][]>([]);
  const [numMines, setNumMines] = useState(3);
  const [wager, setWager] = useState(MAX_WAGER_PER_ROUND_ETH);
  const [rounds, setRounds] = useState(1); // unused (single board) — WagerRounds needs it
  const { stage, error, result, isPlaying, play, retry, reset } = useCasinoGame<MinesRaw>();

  const revealed = result !== null;

  const mineSet = new Set(
    (result?.raw.minePositions ?? []).map(([r, c]) => `${Number(r)},${Number(c)}`)
  );

  const valid =
    selected.length >= 1 &&
    selected.length <= MAX_PICKS &&
    numMines >= MIN_MINES &&
    numMines <= MAX_MINES &&
    Number(wager) > 0 &&
    Number(wager) <= MAX;

  const toggle = (row: number, col: number) => {
    if (revealed || isPlaying) return;
    setSelected((prev) => {
      const exists = prev.some(([r, c]) => r === row && c === col);
      if (exists) return prev.filter(([r, c]) => !(r === row && c === col));
      if (prev.length >= MAX_PICKS) return prev;
      return [...prev, [row, col]];
    });
  };

  const onPlay = () => {
    const perRound = parseEther(wager);
    play({
      functionName: "playMines",
      playArgs: [selected, numMines, perRound],
      wager: perRound,
      outcomeEvent: "Mines_Outcome_Event",
    });
  };

  const newGame = () => {
    setSelected([]);
    reset();
  };

  const cell = (row: number, col: number): { cls: string; content: string } => {
    const isSelected = selected.some(([r, c]) => r === row && c === col);
    if (!revealed) {
      return {
        cls: isSelected
          ? "bg-yellow-300"
          : "bg-white hover:-translate-y-0.5 hover:bg-[#3D6EF5]/10",
        content: "",
      };
    }
    const isMine = mineSet.has(`${row},${col}`);
    if (isMine && isSelected) return { cls: "bg-red-400", content: "💥" };
    if (isMine) return { cls: "bg-red-400", content: "💣" };
    if (isSelected) return { cls: "bg-green-400", content: "💎" };
    return { cls: "bg-white opacity-50", content: "" };
  };

  return (
    <main className="relative flex flex-col items-center justify-center bg-white px-5 py-[130px] bg-[linear-gradient(to_right,#80808022_1px,transparent_1px),linear-gradient(to_bottom,#80808022_1px,transparent_1px)] bg-[size:70px_70px]">
      {/* Advanced Mines banner (kept verbatim) */}
      <div className="mb-8 flex w-full max-w-3xl flex-col items-center justify-between gap-4 rounded-base border-4 border-black bg-[#3D6EF5] px-5 py-4 text-white shadow-[6px_6px_0_0_#000] sm:flex-row">
        <div className="flex items-center gap-3 text-left">
          <span className="whitespace-nowrap rounded-full border-2 border-black bg-yellow-300 px-2 py-0.5 text-xs font-bold text-black">
            NEW
          </span>
          <div>
            <p className="font-heading text-lg leading-tight">Advanced Mines</p>
            <p className="text-sm font-normal text-white/90">
              A fuller version with more features, built on Inco.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <a
            href="https://github.com/Inco-fhevm/mines"
            target="_blank"
            rel="noopener noreferrer"
            title="View code on GitHub"
            aria-label="View Advanced Mines code on GitHub"
            className="flex items-center justify-center rounded-base border-2 border-black bg-white p-2 text-black transition-transform hover:-translate-y-0.5"
          >
            <Github className="h-5 w-5" />
          </a>
          <a
            href="https://inmines.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-base border-2 border-black bg-yellow-300 px-4 py-2 font-heading text-black transition-transform hover:-translate-y-0.5"
          >
            Play Advanced <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </div>

      {/* Board | Controls */}
      <div className="grid w-full max-w-4xl items-start gap-8 md:grid-cols-2">
        {/* Board */}
        <div className="flex items-start justify-center">
          <div className="grid w-full max-w-[380px] grid-cols-5 gap-2">
            {Array.from({ length: SIZE }).flatMap((_, row) =>
              Array.from({ length: SIZE }).map((_, col) => {
                const { cls, content } = cell(row, col);
                return (
                  <button
                    key={`${row}-${col}`}
                    type="button"
                    onClick={() => toggle(row, col)}
                    disabled={isPlaying || revealed}
                    className={`flex aspect-square items-center justify-center rounded-base border-4 border-black text-2xl shadow-[3px_3px_0_0_#000] transition-transform disabled:cursor-not-allowed ${cls}`}
                  >
                    {content}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-5 rounded-base border-4 border-black bg-white p-5 shadow-[6px_6px_0_0_#000]">
          <h1 className="font-heading text-2xl">Mines</h1>

          {/* Mines stepper */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label>Mines</Label>
              <span className="text-xs font-base text-black/60">
                {MIN_MINES}–{MAX_MINES}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isPlaying || revealed || numMines <= MIN_MINES}
                onClick={() => setNumMines(clampMines(numMines - 1))}
                className="flex h-10 w-10 items-center justify-center rounded-base border-2 border-black bg-white transition-transform hover:-translate-y-0.5 disabled:opacity-40"
              >
                <Minus className="h-4 w-4" />
              </button>
              <div className="flex h-10 flex-1 items-center justify-center rounded-base border-2 border-black bg-white font-heading text-lg">
                {numMines}
              </div>
              <button
                type="button"
                disabled={isPlaying || revealed || numMines >= MAX_MINES}
                onClick={() => setNumMines(clampMines(numMines + 1))}
                className="flex h-10 w-10 items-center justify-center rounded-base border-2 border-black bg-white transition-transform hover:-translate-y-0.5 disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <WagerRounds
            wager={wager}
            setWager={setWager}
            rounds={rounds}
            setRounds={setRounds}
            showRounds={false}
            disabled={isPlaying || revealed}
          />

          {!revealed && (
            <p className="text-xs font-base text-black/60">
              {selected.length === 0
                ? "Pick 1–10 tiles, then Play"
                : `${selected.length}/${MAX_PICKS} tile${selected.length > 1 ? "s" : ""} selected`}
            </p>
          )}

          {revealed ? (
            <button
              type="button"
              onClick={newGame}
              className="w-full rounded-base border-4 border-black bg-yellow-300 px-4 py-3 font-heading text-lg text-black shadow-[4px_4px_0_0_#000] transition-transform hover:-translate-y-0.5"
            >
              New game
            </button>
          ) : (
            <PlayButton onPlay={onPlay} isPlaying={isPlaying} disabled={!valid} />
          )}

          <GameStatus stage={stage} error={error} onRetry={retry} />
          <RoundResults result={result} />
        </div>
      </div>
    </main>
  );
}
