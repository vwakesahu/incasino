import { toast } from "@/components/ui/use-toast";
import { parseEther } from "viem";
import { handRockABI, handRockAddress } from "../contract";
import { runGame } from "../inco";
import { setToken } from "@/redux/slices/tokenSlice";
import type { AppDispatch } from "@/redux/store";
import type { GameContext } from "@/types";

interface RpsOutcome {
  houseActions: readonly number[]; // {0,1,2}
}

export const playHandRock = async (
  ctx: GameContext,
  wager: string,
  bets: number,
  userChoiced: number,
  stopGain: string,
  stopLoss: string,
  setTokenAction: typeof setToken,
  ready: boolean,
  dispath: AppDispatch,
  setIsPlaying: (playing: boolean) => void,
  stopPlaying: (moves: number[]) => void
) => {
  const contractWager = parseEther(wager);
  const stopGainWei = stopGain ? parseEther(stopGain) : 0n;
  const stopLossWei = stopLoss ? parseEther(stopLoss) : 0n;
  const totalWager = contractWager * BigInt(bets);

  setIsPlaying(true);
  try {
    const outcome = await runGame<RpsOutcome>(ctx, {
      gameAddress: handRockAddress,
      gameABI: handRockABI,
      wager: totalWager,
      playArgs: [contractWager, userChoiced, bets, stopGainWei, stopLossWei],
      outcomeEvent: "RPS_Outcome_Event",
      onStage: (s) => {
        if (s === "revealing") toast({ title: "Revealing the house move…" });
      },
    });
    if (!outcome) throw new Error("no outcome event");

    const modArr = outcome.houseActions.map((n: number) => Number(n));
    setIsPlaying(false);
    stopPlaying(modArr);
  } catch (error) {
    setIsPlaying(false);
    console.log(error);
    toast({ title: "Error Occured!" });
  }
};
