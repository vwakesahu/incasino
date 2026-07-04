import { toast } from "@/components/ui/use-toast";
import { parseEther } from "viem";
import { minesAddress, minesABI } from "../contract";
import { runGame } from "../inco";
import { setToken } from "@/redux/slices/tokenSlice";
import type { AppDispatch } from "@/redux/store";
import type { GameContext } from "@/types";

interface MinesOutcome {
  minePositions: readonly (readonly number[])[]; // uint8[2][]
}

export const playMineGame = async (
  ctx: GameContext,
  wager: string,
  setTokenAction: typeof setToken,
  ready: boolean,
  dispath: AppDispatch,
  numberOfMines: number,
  minesBettingPositions: number[][]
): Promise<readonly (readonly number[])[] | false> => {
  const wagerValue = parseEther(wager);

  try {
    const outcome = await runGame<MinesOutcome>(ctx, {
      gameAddress: minesAddress,
      gameABI: minesABI,
      wager: wagerValue,
      playArgs: [minesBettingPositions, numberOfMines, wagerValue],
      outcomeEvent: "Mines_Outcome_Event",
      onStage: (s) => {
        if (s === "revealing") toast({ title: "Revealing board…" });
      },
    });
    if (!outcome) throw new Error("no outcome event");

    return outcome.minePositions;
  } catch (error) {
    console.log(error);
    toast({ title: "Error Occured!" });
    return false;
  }
};
