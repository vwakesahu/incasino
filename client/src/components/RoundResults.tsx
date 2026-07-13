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

/**
 * Inline strip of per-round win/loss chips + net total.
 * `count` (default all) limits how many rounds are shown, so the strip can
 * build up live during a sequential reveal.
 */
export function RoundResults({ result, count }: { result: PlayResult | null; count?: number }) {
  if (!result || result.rounds.length === 0) return null;

  const total = result.rounds.length;
  const shownN = count === undefined ? total : Math.max(0, Math.min(count, total));
  const shown = result.rounds.slice(0, shownN);
  if (shown.length === 0) return null;

  const wins = shown.filter((r) => r.won).length;
  const perRound = result.wager / BigInt(total);
  const paid = shown.reduce((a, r) => a + r.payout, 0n);
  const net = paid - perRound * BigInt(shown.length);
  const up = net >= 0n;
  const partial = shownN < total;

  return (
    <div className="flex flex-col gap-3 rounded-base border-4 border-black bg-white p-4 text-left shadow-[4px_4px_0_0_#000]">
      <div className="flex items-center justify-between">
        <span className="font-heading text-sm">
          Won {wins}/{partial ? `${shownN}` : total}
        </span>
        <span
          className={`flex items-center gap-1 rounded-base border-2 border-black px-2 py-1 font-heading text-sm ${
            up ? "bg-green-400" : "bg-red-400"
          }`}
        >
          {up ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          {up ? "+" : ""}
          {fmt(net)} ETH
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {shown.map((r, i) => (
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
