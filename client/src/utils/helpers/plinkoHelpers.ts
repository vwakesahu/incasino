import { toast } from "@/components/ui/use-toast";
import { parseEther } from "viem";
import { plinkoAddress, plinkoABI } from "../contract";
import { runGame } from "../inco";
import { setToken } from "@/redux/slices/tokenSlice";
import type { AppDispatch } from "@/redux/store";
import type { GameContext } from "@/types";

interface PlinkoOutcome {
  randomBits: readonly number[]; // uint8[8] of 0/1
}

export const playPlinkoGame = async (
  ctx: GameContext,
  wager: string,
  setTokenAction: typeof setToken,
  ready: boolean,
  dispatch: AppDispatch,
  setNumbers?: (n: number) => void
): Promise<number | null> => {
  const contractWager = parseEther(wager);

  try {
    const outcome = await runGame<PlinkoOutcome>(ctx, {
      gameAddress: plinkoAddress,
      gameABI: plinkoABI,
      wager: contractWager,
      playArgs: [contractWager],
      outcomeEvent: "Plinko_Outcome_Event",
      onStage: (s) => {
        if (s === "revealing") toast({ title: "Dropping the ball…" });
      },
    });
    if (!outcome) throw new Error("no outcome event");

    // net position: right (+1) / left (-1)
    return outcome.randomBits.reduce(
      (acc: number, bit: number) => acc + (Number(bit) === 1 ? 1 : -1),
      0
    );
  } catch (error) {
    console.log(error);
    toast({ title: "Error Occurred!" });
    return null;
  }
};
