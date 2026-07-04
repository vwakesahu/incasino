"use client";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRecentBets } from "@/hooks/useRecentBets";

const CustomTable = () => {
  const { bets, loading } = useRecentBets();

  return (
    <div className="grid place-items-center w-full max-w-5xl">
      <h1 className="font-semibold text-2xl w-full my-8">Live Bets</h1>
      <Table>
        <TableCaption>
          {loading
            ? "Loading recent bets…"
            : bets.length === 0
            ? "No recent bets yet, be the first to play!"
            : "Recent settled bets on-chain (Base Sepolia)."}
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Time</TableHead>
            <TableHead>Game</TableHead>
            <TableHead>Player</TableHead>
            <TableHead>Wager</TableHead>
            <TableHead>Multiplier</TableHead>
            <TableHead className="text-right">Profit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bets.map((bet, index) => (
            <TableRow
              key={bet.key}
              className={`${index % 2 === 0 ? "bg-bg" : "bg-white"}`}>
              <TableCell className="font-base">{bet.time}</TableCell>
              <TableCell>{bet.game}</TableCell>
              <TableCell>{bet.player}</TableCell>
              <TableCell>{bet.wager}</TableCell>
              <TableCell>{bet.multiplier}</TableCell>
              <TableCell
                className={`text-right ${bet.won ? "text-green-600" : "text-red-600"}`}>
                {bet.profit}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default CustomTable;
