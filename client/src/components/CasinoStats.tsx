"use client";
import { useRecentBets } from "@/hooks/useRecentBets";

export default function CasinoStats() {
  const { stats, loading } = useRecentBets();
  const show = (v: string | number): string => (loading ? "…" : String(v));

  return (
    <div className="grid grid-cols-3 border-t-4 border-black m700:grid-cols-1">
      <section className="border-b-4 border-r-4 border-black bg-white p-14 py-16 m1300:p-10 m1300:py-12 m800:p-6 m800:py-8 m700:border-r-0 m700:bg-main">
        <h2 className="mb-6 font-heading text-4xl m1300:text-3xl m800:text-2xl m500:text-xl">
          Total Users
        </h2>

        <p className="font-base text-6xl m1300:text-5xl m800:text-4xl m500:text-3xl">
          {show(stats.totalPlayers.toLocaleString())}
        </p>
      </section>
      <section className="border-b-4 md:border-r-4 border-black bg-main p-14 py-16 m1300:p-10 m1300:py-12 m800:p-6 m800:py-8 m700:bg-bg">
        <h2 className="mb-6 font-heading text-4xl m1300:text-3xl m800:text-2xl m500:text-xl">
          Total Wagered
        </h2>

        <p className="font-base text-6xl m1300:text-5xl m800:text-4xl m500:text-3xl">
          {show(stats.totalWagered)}{" "}
          <span className="text-3xl m800:text-xl">USDC</span>
        </p>
      </section>
      <section className="border-b-4 border-black bg-main md:bg-white p-14 py-16 m1300:p-10 m1300:py-12 m800:p-6 m800:py-8">
        <h2 className="mb-6 text-4xl font-heading m1300:text-3xl m800:text-2xl m500:text-xl">
          Total Bets
        </h2>

        <p className="font-base text-6xl m1300:text-5xl m800:text-4xl m500:text-3xl">
          {show(stats.totalBets.toLocaleString())}
        </p>
      </section>
    </div>
  );
}
