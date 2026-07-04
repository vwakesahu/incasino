import { toast } from "@/components/ui/use-toast";
import { parseEther } from "viem";
import { coinFlipAddress, conflipABI } from "../contract";
import { fetchTokens } from "./webHelpers";
import { runGame } from "../inco";
import { setToken } from "@/redux/slices/tokenSlice";
import type { AppDispatch } from "@/redux/store";
import type { GameContext } from "@/types";

interface CoinFlipOutcome {
  coinOutcomes: readonly number[]; // 1 = heads, 0 = tails
}

export const playFlipGame = async (
  ctx: GameContext,
  wager: string,
  bets: number,
  userChoiced: string,
  stopGain: string,
  stopLoss: string,
  setTokenAction: typeof setToken,
  ready: boolean,
  dispath: AppDispatch,
  stopFlipping: (result: readonly number[] | string) => void,
  setResult: (result: readonly number[] | string) => void,
  setOpen: (open: boolean) => void
) => {
  const contractWager = parseEther(wager);
  const stopGainWei = stopGain ? parseEther(stopGain) : 0n;
  const stopLossWei = stopLoss ? parseEther(stopLoss) : 0n;
  const isHeads = userChoiced === "heads";
  const totalWager = contractWager * BigInt(bets);

  try {
    const outcome = await runGame<CoinFlipOutcome>(ctx, {
      gameAddress: coinFlipAddress,
      gameABI: conflipABI,
      wager: totalWager,
      playArgs: [contractWager, isHeads, bets, stopGainWei, stopLossWei],
      outcomeEvent: "CoinFlip_Outcome_Event",
      onStage: (s) => {
        if (s === "revealing") toast({ title: "Revealing outcome…" });
      },
    });
    if (!outcome) throw new Error("no outcome event");

    setOpen(true);
    fetchTokens(ctx, setTokenAction, ready, dispath);
    stopFlipping(outcome.coinOutcomes);
  } catch (error) {
    stopFlipping("Coin");
    console.log(error);
    toast({ title: "Error Occured!" });
  }
};
