"use client";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Button } from "./ui/button";
import Link from "next/link";

const PlayButton = ({
  handler,
  tokens,
}: {
  handler: () => void;
  tokens?: string;
}) => {
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  return (
    <div className="w-full">
      {isConnected ? (
        <div className="w-full">
          {tokens && tokens === "0" ? (
            <Link href={"/deposit"}>
              <Button onClick={handler} className="bg-main w-full">
                Buy Token
              </Button>
            </Link>
          ) : (
            <Button onClick={handler} className="bg-main w-full">
              Play
            </Button>
          )}
        </div>
      ) : (
        <Button onClick={openConnectModal} className="bg-main w-full">
          Connect Wallet
        </Button>
      )}
    </div>
  );
};

export default PlayButton;
