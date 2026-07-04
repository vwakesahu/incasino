"use client";
import clsx from "clsx";
import { ChevronDown, LogOutIcon } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { GiToken } from "react-icons/gi";
import { RiLuggageDepositFill } from "react-icons/ri";
import { useAccount, useDisconnect } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { fetchTokens } from "@/utils/helpers/webHelpers";
import { BALANCE_REFRESH_EVENT } from "@/utils/inco";
import { setToken } from "@/redux/slices/tokenSlice";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { useGameContext } from "@/hooks/useGameContext";

export default function NavDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const { ctx, ready } = useGameContext();
  const { token } = useAppSelector((state) => state.tokens);
  const accountAddress = address?.slice(0, 6)?.toLowerCase();
  const dispatch = useAppDispatch();

  const handleLogout = () => {
    disconnect();
    setIsOpen(false);
  };

  useEffect(() => {
    if (ctx && ready) {
      fetchTokens(ctx, setToken, ready, dispatch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, ready]);

  useEffect(() => {
    const refresh = () => {
      if (ctx && ready) fetchTokens(ctx, setToken, ready, dispatch);
    };
    window.addEventListener(BALANCE_REFRESH_EVENT, refresh);
    return () => window.removeEventListener(BALANCE_REFRESH_EVENT, refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, ready]);

  return (
    <div className="relative">
      {isConnected ? (
        <button
          onBlur={() => [setIsOpen(false)]}
          onClick={() => {
            setIsOpen(!isOpen);
          }}
          className="flex items-center gap-2 text-xl font-base"
        >
          <div className="flex items-center gap-2 hover:text-yellow-500 font-semibold">
            <GiToken className="" />

            <p> {token === "0" ? "0" : token.slice(0, -18)}</p>
          </div>

          <ChevronDown
            className={clsx(
              isOpen ? "rotate-180" : "rotate-0",
              "h-5 w-5 transition-transform"
            )}
            color="black"
          />
        </button>
      ) : (
        <button
          onBlur={() => [setIsOpen(false)]}
          onClick={openConnectModal}
          className="flex items-center gap-2 text-xl font-base"
        >
          Login
        </button>
      )}

      <div
        className={clsx(
          isOpen
            ? "visible top-12 opacity-100 right-1"
            : "invisible top-10 right-1 opacity-0",
          "absolute flex w-[150px] flex-col rounded-base border-2 border-black bg-white text-lg font-base transition-all"
        )}
      >
        <div
          onClick={() => setIsOpen(false)}
          className="text-left flex items-center rounded-t-base px-4 py-3 border-b-2 border-b-black"
        >
          {accountAddress}....
        </div>

        <Link
          href={"/deposit"}
          onClick={() => setIsOpen(false)}
          className="text-left flex items-center px-4 py-3 border-b-2 border-b-black hover:bg-main"
        >
          <RiLuggageDepositFill className="h-6 w-6 m500:h-4 m500:w-4 mr-[15px] m400:ml-4 m400:w-[12px]" />
          Deposit
        </Link>

        <div
          onClick={handleLogout}
          className="text-left flex items-center px-4 py-3 border-b-2 border-b-black hover:bg-red-500 hover:text-white cursor-pointer"
        >
          <LogOutIcon className="h-6 w-6 m500:h-4 m500:w-4 mr-[15px] m400:ml-4 m400:w-[12px]" />
          Logout
        </div>
      </div>
    </div>
  );
}
