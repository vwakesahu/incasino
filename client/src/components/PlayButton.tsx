"use client";

import { Loader2 } from "lucide-react";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";

/** Big Play button that doubles as a connect-gate and shows a spinner while running. */
export function PlayButton({
  onPlay,
  isPlaying,
  disabled = false,
  label = "Play",
}: {
  onPlay: () => void;
  isPlaying: boolean;
  disabled?: boolean;
  label?: string;
}) {
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  if (!isConnected) {
    return (
      <button
        onClick={openConnectModal}
        className="w-full rounded-base border-4 border-black bg-yellow-300 px-4 py-3 font-heading text-lg text-black shadow-[4px_4px_0_0_#000] transition-transform hover:-translate-y-0.5"
      >
        Connect Wallet
      </button>
    );
  }

  return (
    <button
      onClick={onPlay}
      disabled={disabled || isPlaying}
      className="flex w-full items-center justify-center gap-2 rounded-base border-4 border-black bg-[#3D6EF5] px-4 py-3 font-heading text-lg text-white shadow-[4px_4px_0_0_#000] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
    >
      {isPlaying ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" /> Playing…
        </>
      ) : (
        label
      )}
    </button>
  );
}

export default PlayButton;
