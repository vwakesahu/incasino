import CustomTable from "@/components/Table";
import { RecentBetsProvider } from "@/hooks/useRecentBets";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <RecentBetsProvider>
      <main>{children}</main>
      <div className="not-prose flex w-full items-center justify-center z-[15] relative mb-5 bg-white bg-[radial-gradient(#cacbce_1px,transparent_1px)] px-10 py-20 [background-size:16px_16px] m750:px-5 m750:py-10">
        <CustomTable />
      </div>
    </RecentBetsProvider>
  );
}
