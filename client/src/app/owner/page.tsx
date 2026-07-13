"use client";

import { useEffect, useState } from "react";
import { formatEther, parseEther } from "viem";
import { Loader2, ShieldCheck } from "lucide-react";
import {
  useAccount,
  useBalance,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { casinoABI, casinoAddress } from "@/utils/contract";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const eth = (v?: bigint) => (v === undefined ? "—" : Number(formatEther(v)).toFixed(5));

export default function OwnerPage() {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  const { data: bal, refetch: refetchBal } = useBalance({ address: casinoAddress });
  const { data: owner } = useReadContract({ address: casinoAddress, abi: casinoABI, functionName: "owner" });
  const { data: liability, refetch: refetchLia } = useReadContract({
    address: casinoAddress,
    abi: casinoABI,
    functionName: "totalActiveLiability",
  });
  const { data: available, refetch: refetchAvail } = useReadContract({
    address: casinoAddress,
    abi: casinoABI,
    functionName: "availableBankroll",
  });

  const isOwner = Boolean(address && owner && address.toLowerCase() === String(owner).toLowerCase());

  const [depositAmt, setDepositAmt] = useState("0.01");
  const [withdrawAmt, setWithdrawAmt] = useState("");

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) {
      refetchBal();
      refetchLia();
      refetchAvail();
    }
  }, [isSuccess, refetchBal, refetchLia, refetchAvail]);

  const busy = isPending || isConfirming;

  const deposit = () =>
    writeContract({
      address: casinoAddress,
      abi: casinoABI,
      functionName: "depositBankroll",
      value: parseEther(depositAmt || "0"),
    });

  const withdraw = () =>
    writeContract({
      address: casinoAddress,
      abi: casinoABI,
      functionName: "withdraw",
      args: [parseEther(withdrawAmt || "0")],
    });

  const withdrawAll = () =>
    writeContract({ address: casinoAddress, abi: casinoABI, functionName: "withdrawAll" });

  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center bg-white px-5 py-[130px] bg-[linear-gradient(to_right,#80808022_1px,transparent_1px),linear-gradient(to_bottom,#80808022_1px,transparent_1px)] bg-[size:70px_70px]">
      <div className="w-full max-w-md rounded-base border-4 border-black bg-white p-6 shadow-[6px_6px_0_0_#000]">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="h-6 w-6" />
          <h1 className="font-heading text-2xl">House bankroll</h1>
        </div>

        {!isConnected ? (
          <button
            onClick={openConnectModal}
            className="w-full rounded-base border-4 border-black bg-yellow-300 px-4 py-3 font-heading text-lg shadow-[4px_4px_0_0_#000]"
          >
            Connect Wallet
          </button>
        ) : !isOwner ? (
          <p className="rounded-base border-2 border-black bg-red-400 p-3 font-base text-sm">
            Only the contract owner can manage the bankroll.
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: "Balance", v: bal?.value },
                { label: "Reserved", v: liability as bigint | undefined },
                { label: "Available", v: available as bigint | undefined },
              ].map((s) => (
                <div key={s.label} className="rounded-base border-2 border-black p-2">
                  <div className="text-xs font-base text-black/60">{s.label}</div>
                  <div className="font-heading text-sm">{eth(s.v)}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dep">Deposit ETH</Label>
              <div className="flex gap-2">
                <Input id="dep" type="number" step="0.001" value={depositAmt} onChange={(e) => setDepositAmt(e.target.value)} />
                <button
                  onClick={deposit}
                  disabled={busy}
                  className="shrink-0 rounded-base border-2 border-black bg-green-400 px-4 font-heading disabled:opacity-50"
                >
                  Deposit
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wd">Withdraw ETH</Label>
              <div className="flex gap-2">
                <Input id="wd" type="number" step="0.001" placeholder="amount" value={withdrawAmt} onChange={(e) => setWithdrawAmt(e.target.value)} />
                <button
                  onClick={withdraw}
                  disabled={busy || !withdrawAmt}
                  className="shrink-0 rounded-base border-2 border-black bg-white px-4 font-heading disabled:opacity-50"
                >
                  Withdraw
                </button>
              </div>
              <button
                onClick={withdrawAll}
                disabled={busy}
                className="mt-1 rounded-base border-2 border-black bg-[#3D6EF5] px-4 py-2 font-heading text-white disabled:opacity-50"
              >
                Withdraw all available
              </button>
            </div>

            {busy && (
              <div className="flex items-center gap-2 text-sm font-base">
                <Loader2 className="h-4 w-4 animate-spin" /> Waiting for confirmation…
              </div>
            )}
            {error && (
              <p className="text-sm font-base text-red-600">
                {error.message.split("\n")[0]}
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
