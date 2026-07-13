"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePublicClient } from "wagmi";
import { formatUnits, getAddress, parseAbiItem, type Address } from "viem";
import { casinoAddress } from "@/utils/contract";
import { BALANCE_REFRESH_EVENT } from "@/utils/inco";

// Casino.Kind enum order.
const GAME_BY_KIND = ["Coin Flip", "Dice", "Mines", "Plinko", "Rock Paper Scissors", "Slots"];

const BET_SETTLED = parseAbiItem(
  "event BetSettled(uint256 indexed gameId, address indexed player, uint256 wager, uint256 payout, uint256 randomSeed, uint8 kind)"
);

// Small window so a single getLogs is accepted by every free RPC (~1h of bets).
const LOOKBACK_BLOCKS = 2000n;
const MAX_ROWS = 8;

export interface RecentBet {
  key: string;
  time: string;
  game: string;
  player: string;
  wager: string;
  multiplier: string;
  profit: string;
  won: boolean;
}

export interface CasinoStats {
  totalBets: number;
  totalWagered: string;
  totalPlayers: number;
}

interface RecentBetsValue {
  bets: RecentBet[];
  stats: CasinoStats;
  loading: boolean;
}

const EMPTY: RecentBetsValue = {
  bets: [],
  stats: { totalBets: 0, totalWagered: "0", totalPlayers: 0 },
  loading: true,
};

const RecentBetsContext = createContext<RecentBetsValue>(EMPTY);

export const useRecentBets = (): RecentBetsValue => useContext(RecentBetsContext);

const fmt = (wei: bigint): string =>
  Number(formatUnits(wei, 18)).toLocaleString(undefined, { maximumFractionDigits: 5 });

const shortAddr = (a: Address): string => `${a.slice(0, 6)}…${a.slice(-4)}`;

const ago = (seconds: number): string => {
  if (seconds < 60) return `${Math.max(0, Math.round(seconds))}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`;
  return `${Math.round(seconds / 86400)}d ago`;
};

export function RecentBetsProvider({ children }: { children: ReactNode }) {
  const publicClient = usePublicClient();
  const [value, setValue] = useState<RecentBetsValue>(EMPTY);

  useEffect(() => {
    if (!publicClient) return;
    let cancelled = false;

    const load = async () => {
      try {
        const latest = await publicClient.getBlockNumber();
        const fromBlock = latest > LOOKBACK_BLOCKS ? latest - LOOKBACK_BLOCKS : 0n;

        const logs = await publicClient.getLogs({
          address: casinoAddress,
          event: BET_SETTLED,
          fromBlock,
          toBlock: latest,
        });

        const all = [...logs].sort((a, b) => Number(b.blockNumber - a.blockNumber));

        const players = new Set<string>();
        let wagered = 0n;
        for (const log of all) {
          const player = log.args.player;
          if (player) players.add(player.toLowerCase());
          wagered += log.args.wager ?? 0n;
        }

        const bets: RecentBet[] = all.slice(0, MAX_ROWS).map((log) => {
          const wager = log.args.wager ?? 0n;
          const payout = log.args.payout ?? 0n;
          const profit = payout - wager;
          const won = profit > 0n;
          const multiplier = wager > 0n ? Number(payout) / Number(wager) : 0;
          const secondsAgo = Number(latest - log.blockNumber) * 2;
          const player = log.args.player;
          const kind = Number(log.args.kind ?? 0);
          return {
            key: `${log.transactionHash}-${log.logIndex}`,
            time: ago(secondsAgo),
            game: GAME_BY_KIND[kind] ?? "Game",
            player: player ? shortAddr(getAddress(player)) : "—",
            wager: fmt(wager),
            multiplier: `${multiplier.toFixed(2)}x`,
            profit: `${profit >= 0n ? "+" : "-"}${fmt(profit >= 0n ? profit : -profit)}`,
            won,
          };
        });

        if (!cancelled) {
          setValue({
            bets,
            stats: {
              totalBets: all.length,
              totalWagered: fmt(wagered),
              totalPlayers: players.size,
            },
            loading: false,
          });
        }
      } catch (error) {
        console.log("recent bets fetch failed", error);
        if (!cancelled) setValue((v) => ({ ...v, loading: false }));
      }
    };

    load();

    const onSettled = () => {
      window.setTimeout(() => {
        if (!cancelled) load();
      }, 3000);
    };
    window.addEventListener(BALANCE_REFRESH_EVENT, onSettled);

    return () => {
      cancelled = true;
      window.removeEventListener(BALANCE_REFRESH_EVENT, onSettled);
    };
  }, [publicClient]);

  return <RecentBetsContext.Provider value={value}>{children}</RecentBetsContext.Provider>;
}
