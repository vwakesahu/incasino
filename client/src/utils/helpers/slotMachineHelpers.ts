import { toast } from "@/components/ui/use-toast";
import { parseEther } from "viem";
import { slotMachineAddress, slotMachineABI } from "../contract";
import { runGame } from "../inco";
import { setToken } from "@/redux/slices/tokenSlice";
import type { AppDispatch } from "@/redux/store";
import type { GameContext } from "@/types";

interface SlotOutcome {
  spin: readonly number[]; // uint8[3] reel values
}

export const spinSlotMachine = async (
  ctx: GameContext,
  wager: string,
  setTokenAction: typeof setToken,
  ready: boolean,
  dispath: AppDispatch,
  setIsRunning: (running: boolean) => void,
  setNumbers: (reels: number[]) => void
) => {
  const contractWager = parseEther(wager);

  setIsRunning(true);
  try {
    const outcome = await runGame<SlotOutcome>(ctx, {
      gameAddress: slotMachineAddress,
      gameABI: slotMachineABI,
      wager: contractWager,
      playArgs: [contractWager],
      outcomeEvent: "Slot_Outcome_Event",
      onStage: (s) => {
        if (s === "revealing") toast({ title: "Spinning the reels…" });
      },
    });
    if (!outcome) throw new Error("no outcome event");

    setNumbers(outcome.spin.map((n: number) => Number(n)));
    setIsRunning(false);
  } catch (error) {
    setIsRunning(false);
    console.log(error);
    toast({ title: "Error Occured!" });
  }
};
