"use client";
import GameInputForm from "@/components/GameInputForm";
import { Button } from "@/components/ui/button";
// import { Slider } from "@/components/ui/slider";
import { setToken } from "@/redux/slices/tokenSlice";
import { playMineGame } from "@/utils/helpers/minesHelpers";
import React, { useEffect, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { useGameContext } from "@/hooks/useGameContext";
import { useAppDispatch } from "@/redux/hooks";
import { toast } from "@/components/ui/use-toast";
import { Label } from "@/components/ui/label";

const Page = () => {
  const [wager, setWager] = useState<string | number>(0);
  const [bet] = useState<string | number>(1);
  const [, setTotalwager] = useState(0);
  const [, setMaxPayout] = useState(0);
  const [takeprofit] = useState<string | number>(0);
  const { ctx, ready } = useGameContext();
  const dispath = useAppDispatch();
  const [difficulty, setDifficulty] = useState([1]);

  const [selectedMines, setSelectedMines] = useState<number[][]>([]);
  const [minesState, setMinesState] = useState<readonly (readonly number[])[]>([]);
  const [gameStarted, setGameStarted] = useState(false);

  const handleClick = (row: number, col: number) => {
    if (minesState.length > 0) return; // Disable selection if the game has started
    const newSelection = [...selectedMines, [row, col]];
    setSelectedMines(newSelection);
  };

  const startGame = async () => {
    if (gameStarted) {
      alert("Please reset the game before starting a new one.");
      return;
    }
    // Call smart contract to send selected mines and fetch actual mine positions
    const response = await fetchMinesFromContract(selectedMines);
    if (!response) return;
    setMinesState(response);
    setGameStarted(true);
    checkResults(response);
  };

  const resetGame = () => {
    setSelectedMines([]);
    setMinesState([]);
    setGameStarted(false);
  };

  const fetchMinesFromContract = async (selectedMines: number[][]) => {
    if (!ctx) {
      toast({ title: "Please connect your wallet!" });
      return;
    }
    const arr = await playMineGame(
      ctx,
      String(wager),
      setToken,
      ready,
      dispath,
      difficulty[0],
      selectedMines
    );
    return arr;
  };

  const checkResults = (mines: readonly (readonly number[])[]) => {
    // Check if the user has won or lost
    const userMines = new Set(selectedMines.map(([r, c]) => `${r},${c}`));
    let won = true;
    for (const [r, c] of mines) {
      if (userMines.has(`${r},${c}`)) {
        won = false;
        break;
      }
    }
    alert(won ? "You Win!" : "You Lose!");
  };

  useEffect(() => {
    // Calculate total wager and round to nearest integer
    setTotalwager(Math.round(Number(wager) * Number(bet)));
  }, [wager, bet]);

  useEffect(() => {
    if (takeprofit !== 0 && takeprofit !== undefined) {
      setMaxPayout(Math.round(Number(takeprofit)));
    } else if (takeprofit === 0 && takeprofit !== undefined) {
      const calculatedPayout = Math.round(Number(wager) * Number(bet) * 1.98);
      setMaxPayout(calculatedPayout);
    }
  }, [wager, bet, takeprofit]);
  return (
    <main className="relative flex flex-col items-center justify-center bg-white px-5 py-[150px] text-center font-bold bg-[linear-gradient(to_right,#80808033_1px,transparent_1px),linear-gradient(to_bottom,#80808033_1px,transparent_1px)] bg-[size:70px_70px]">
      <div className="grid gap-4 grid-cols-2">
        <div className="max-w-[70%] flex flex-col gap-4">
          <GameInputForm
            id={"wager"}
            label={"Wager"}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWager(e.target.value)}
            placeholder={"Choose Wager"}
            type={"number"}
            value={wager}
          />
          {/* <GameInputForm
            id={"bets"}
            label={"Bets"}
            onChange={(e) => setBet(e.target.value)}
            placeholder={""}
            type={"number"}
            value={bet}
          />

          <div className="grid grid-cols-2 gap-4">
            <GameInputForm
              id={"totalwager"}
              label={"Total Wager"}
              onChange={(e) => {}}
              placeholder={"-"}
              value={totalwager}
              className={"cursor-not-allowed"}
            />{" "}
            <GameInputForm
              id={"maxpayout"}
              label={"Max Payout"}
              onChange={(e) => {}}
              placeholder={"-"}
              value={maxPayout}
              className={"cursor-not-allowed"}
            />
          </div> */}

          {/* <div>
            <RadioGroup
              // defaultValue="comfortable"
              className="flex"
              onValueChange={(e) => setUserChoiced(e)}
            >
              <div className={`flex items-center space-x-2`}>
                <RadioGroupItem value="heads" id="r1" />
                <Label htmlFor="r1">Heads</Label>
              </div>
              <div className={`flex items-center space-x-2`}>
                <RadioGroupItem value="tails" id="r2" />
                <Label htmlFor="r2">Tails</Label>
              </div>
            </RadioGroup>
          </div> */}

          {/* <Accordion
            className="w-full lg:w-[unset] bg-white border-none shadow-none"
            type="single"
            collapsible
          >
            <AccordionItem className="max-w-full" value="item-1">
              <AccordionTrigger className="bg-transparent">
                Advanced
              </AccordionTrigger>
              <AccordionContent className="grid grid-cols-2 gap-4">
                <GameInputForm
                  id={"stoponloss"}
                  label={"Stop on Loss"}
                  onChange={(e) => setStopOnLoss(e.target.value)}
                  placeholder={"-"}
                  type={"number"}
                  value={stopOnLoss}
                />{" "}
                <GameInputForm
                  id={"takeprofit"}
                  label={"Take Profit"}
                  onChange={(e) => setTakeprofit(e.target.value)}
                  placeholder={"-"}
                  type={"number"}
                  value={takeprofit}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion> */}
          <SliderMines setValue={setDifficulty} value={difficulty} />
          {!gameStarted && (
            <p className="text-sm font-normal text-gray-500 text-left">
              {selectedMines.length === 0
                ? "👉 Select your tiles on the board first then “Start Game” unlocks."
                : `${selectedMines.length} tile${
                    selectedMines.length > 1 ? "s" : ""
                  } selected — ready to start.`}
            </p>
          )}
          <div className="mb-4 clear-start w-full flex">
            <Button
              onClick={startGame}
              className="px-4 py-2 bg-blue-600 text-white rounded mr-2 w-full"
              disabled={selectedMines.length === 0}
            >
              Start Game
            </Button>
            <Button
              onClick={resetGame}
              className="px-4 py-2 bg-red-600 text-white rounded w-full"
            >
              Reset
            </Button>
          </div>
          {/* {!isSettingMines ? (
            <Button onClick={handleOpenCells}>Open Selected Cells</Button>
          ) : (
            <PlayButton handler={play} tokens={token} />
          )} */}
        </div>
        <div className="md:flex hidden relative">
          <Mines
            selectedMines={selectedMines}
            setSelectedMines={setSelectedMines}
            minesState={minesState}
            setMinesState={setMinesState}
            gameStarted={gameStarted}
            setGameStarted={setGameStarted}
            handleClick={handleClick}
            startGame={startGame}
            checkResults={checkResults}
            resetGame={resetGame}
            fetchMinesFromContract={fetchMinesFromContract}
          />
        </div>
      </div>
    </main>
  );
};

export default Page;

const Mines = ({
  selectedMines,
  setSelectedMines,
  minesState,
  setMinesState,
  gameStarted,
  setGameStarted,
  handleClick,
  startGame,
  checkResults,
  resetGame,
  fetchMinesFromContract,
}: {
  selectedMines: number[][];
  setSelectedMines: React.Dispatch<React.SetStateAction<number[][]>>;
  minesState: readonly (readonly number[])[];
  setMinesState: React.Dispatch<
    React.SetStateAction<readonly (readonly number[])[]>
  >;
  gameStarted: boolean;
  setGameStarted: React.Dispatch<React.SetStateAction<boolean>>;
  handleClick: (row: number, col: number) => void;
  startGame: () => Promise<void>;
  checkResults: (mines: readonly (readonly number[])[]) => void;
  resetGame: () => void;
  fetchMinesFromContract: (
    selectedMines: number[][]
  ) => Promise<readonly (readonly number[])[] | false | undefined>;
}) => {
  return (
    <div className="w-[550px] h-[550px] flex flex-col items-center justify-center">
      <div className="w-[475px] h-[475px]">
        {/* <div className="w-full h-full grid grid-cols-5 grid-rows-5 gap-4">
          {board.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`w-full h-full cursor-pointer border-4 border-black rounded-base ${
                  revealed[rowIndex][colIndex]
                    ? cell
                      ? "bg-red-500"
                      : "bg-green-500"
                    : selected[rowIndex][colIndex]
                    ? "bg-yellow-500"
                    : "bg-blue-500"
                }`}
                onClick={() => handleCellClick(rowIndex, colIndex)}
              >
                {revealed[rowIndex][colIndex] ? (
                  <img
                    src={cell ? revealedMineImg : revealedSafeImg}
                    alt={cell ? "Mine" : "Safe"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={selected[rowIndex][colIndex] ? selectedImg : hiddenImg}
                    alt={selected[rowIndex][colIndex] ? "Selected" : "Hidden"}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            ))
          )}
        </div> */}
        <div className="grid grid-rows-5 grid-cols-5 gap-1">
          {Array.from({ length: 5 }).map((_, row) =>
            Array.from({ length: 5 }).map((_, col) => {
              let color = "bg-blue-500";
              if (selectedMines.some(([r, c]) => r === row && c === col)) {
                color = "bg-yellow-500";
              } else if (
                minesState.length > 0 &&
                minesState.some(([r, c]) => r === row && c === col)
              ) {
                color = "bg-red-500";
              } else if (
                minesState.length > 0 &&
                !minesState.some(([r, c]) => r === row && c === col)
              ) {
                color = "bg-green-500";
              }

              return (
                <div
                  key={`${row}-${col}`}
                  className={`w-full h-24 border-4 border-black rounded-base ${color}`}
                  onClick={() => handleClick(row, col)}
                ></div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export function SliderMines({
  value,
  setValue,
  ...props
}: {
  value: number[];
  setValue: (value: number[]) => void;
}) {
  return (
    <div className="w-full flex flex-col items-start gap-2">
      <div className="flex w-full items-center justify-between">
        <Label>Difficulty</Label>
        <Label>{value}</Label>
      </div>

      <Slider
        defaultValue={value}
        max={4}
        step={1}
        onValueChange={(e) => setValue(e)}
        // className={`${value === 0 ? "bg-red-500" : ""}`}
        {...props}
      />
    </div>
  );
}
