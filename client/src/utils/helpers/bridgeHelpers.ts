import { toast } from "@/components/ui/use-toast";
import { writeContract, waitForTransactionReceipt } from "@wagmi/core";
import { wagmiConfig } from "@/wagmi/config";
import { tokenABI, tokenContractAddress } from "../contract";
import { fetchTokens } from "./webHelpers";
import { setToken } from "@/redux/slices/tokenSlice";
import type { AppDispatch } from "@/redux/store";
import type { GameContext } from "@/types";

export const mintToken = async (
  ctx: GameContext,
  setLoading: (loading: boolean) => void,
  setIsMintLoading: (loading: boolean) => void,
  setCrntState: (state: number) => void,
  setTokenAction: typeof setToken,
  ready: boolean,
  dispatch: AppDispatch
) => {
  try {
    // faucet(): self-mints the bet token to the connected wallet.
    const hash = await writeContract(wagmiConfig, {
      address: tokenContractAddress,
      abi: tokenABI,
      functionName: "faucet",
    });

    // Tx submitted (user signed): show the "Transaction Initiated" step.
    setLoading(true);
    setIsMintLoading(true);
    setCrntState(0);

    await waitForTransactionReceipt(wagmiConfig, { hash });

    // Mined: advance to "Token Minted Successfully..." and refresh balance.
    setCrntState(1);
    fetchTokens(ctx, setTokenAction, ready, dispatch);
    setTimeout(() => {
      setLoading(false);
      setIsMintLoading(false);
      toast({ title: "Tokens minted successfully!" });
    }, 1000);
  } catch (error) {
    console.log(error);
    toast({ title: "Error Occured!" });
    setLoading(false);
    setIsMintLoading(false);
  }
};
