import { toast } from "@/components/ui/use-toast";
import { parseEther } from "viem";
import { diceABI, diceAddress } from "../contract";
import { runGame } from "../inco";
import type { GameContext } from "@/types";

interface DiceOutcome {
  diceValue: number; // 0..100
}

export const playDiceGame = async (
  ctx: GameContext,
  wager: string,
  userChoiced: number[],
  handleStop: (roll: number) => void,
  isOver: boolean
) => {
  const contractWager = parseEther(wager);

  try {
    const outcome = await runGame<DiceOutcome>(ctx, {
      gameAddress: diceAddress,
      gameABI: diceABI,
      wager: contractWager,
      playArgs: [userChoiced[0], isOver, contractWager],
      outcomeEvent: "Dice_Outcome_Event",
      onStage: (s) => {
        if (s === "revealing") toast({ title: "Revealing roll…" });
      },
    });
    if (!outcome) throw new Error("no outcome event");

    handleStop(Number(outcome.diceValue));
  } catch (error) {
    handleStop(45);
    console.log(error);
    toast({ title: "Error Occured!" });
  }
};
