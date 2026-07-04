import { toast } from "@/components/ui/use-toast";
import { readContract } from "@wagmi/core";
import { wagmiConfig } from "@/wagmi/config";
import { tokenABI, tokenContractAddress } from "../contract";
import { setToken } from "@/redux/slices/tokenSlice";
import type { AppDispatch } from "@/redux/store";
import type { GameContext } from "@/types";

export const fetchTokens = async (
  ctx: GameContext | null,
  setTokens: typeof setToken,
  ready: boolean,
  dispatch: AppDispatch
) => {
  if (!ctx || !ready) return;
  try {
    const balance = (await readContract(wagmiConfig, {
      address: tokenContractAddress,
      abi: tokenABI,
      functionName: "balanceOf",
      args: [ctx.address],
    })) as bigint;
    dispatch(setTokens(balance.toString()));
  } catch (error) {
    console.log(error);
    toast({ title: "Error Occured!" });
  }
};
