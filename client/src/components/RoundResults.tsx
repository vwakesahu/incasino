"use client";

import { formatEther } from "viem";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { PlayResult } from "@/types";

const fmt = (wei: bigint) => {
  const s = formatEther(wei < 0n ? -wei : wei);
  const n = Number(s);
  const body = n === 0 ? "0" : n.toLocaleString(undefined, { maximumFractionDigits: 6 });
  return `${wei < 0n ? "-" : ""}${body}`;
};

/** Inline strip of per-round win/loss chips + net total. Replaces the old dialog. */
export function RoundResults({ result }: { result: PlayResult | null }) {
  if (!result) return null;

  const wins = result.rounds.filter((r) => r.won).length;
  const total = result.rounds.length;
  const up = result.net >= 0n;

  return (
    <div className="flex flex-col gap-3 rounded-base border-4 border-black bg-white p-4 text-left shadow-[4px_4px_0_0_#000]">
      <div className="flex items-center justify-between">
        <span className="font-heading text-sm">
          Won {wins}/{total}
        </span>
        <span
          className={`flex items-center gap-1 rounded-base border-2 border-black px-2 py-1 font-heading text-sm ${
            up ? "bg-green-400" : "bg-red-400"
          }`}
        >
          {up ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          {up ? "+" : ""}
          {fmt(result.net)} ETH
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {result.rounds.map((r, i) => (
          <span
            key={i}
            title={`Round ${i + 1}: ${r.won ? `+${fmt(r.payout)} ETH` : "loss"}`}
            className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-black text-xs font-heading ${
              r.won ? "bg-green-400" : "bg-gray-200 text-black/40"
            }`}
          >
            {r.won ? "W" : "L"}
          </span>
        ))}
      </div>
    </div>
  );
}
