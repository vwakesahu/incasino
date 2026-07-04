"use client";
import Link from "next/link";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import arrow from "../../public/svgs/arrow.svg";
import herostar2 from "../../public/svgs/herostar2.svg";
import CustomMarquee from "@/components/CustomMarquee";

export default function Home() {
  return (
    <div>
      <main className="relative flex min-h-[100svh] flex-col items-center justify-center bg-bg px-5 py-[150px] text-center font-bold">
        <h1 className="text-5xl font-heading m1000:text-4xl m800:text-3xl m500:text-2xl m400:text-xl">
          Layer for web3 gaming.
        </h1>

        <p className="mb-[50px] mt-[30px] font-base text-2xl m800:text-lg m400:text-base">
          Play-Earn-Win on Confidential On-chain Casino
        </p>

        <Link
          className="flex items-center rounded-base border-2 font-base border-black bg-main px-10 py-3 text-[22px] shadow-base transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none m800:px-8 m800:py-2.5 m800:text-lg m400:px-6 m400:py-2 m400:text-base"
          href={"/games"}
        >
          Play now
          <img
            className="ml-[15px] w-[18px] m400:ml-4 m400:w-[15px]"
            src={arrow.src}
            alt="arrow"
          />
        </Link>
        {/* {authenticated ? (
          <div
            className="flex items-center rounded-base border-2 font-base border-black bg-main px-10 py-3 text-[22px] shadow-base transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none m800:px-8 m800:py-2.5 m800:text-lg m400:px-6 m400:py-2 m400:text-base"
            onClick={logout}
          >
            Log Out
            <img
              className="ml-[15px] w-[18px] m400:ml-4 m400:w-[15px]"
              src={arrow.src}
              alt="arrow"
            />
          </div>
        ) : (
          <div
            className="flex items-center rounded-base border-2 font-base border-black bg-main px-10 py-3 text-[22px] shadow-base transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none m800:px-8 m800:py-2.5 m800:text-lg m400:px-6 m400:py-2 m400:text-base"
            onClick={login}
          >
            Log in
            <img
              className="ml-[15px] w-[18px] m400:ml-4 m400:w-[15px]"
              src={arrow.src}
              alt="arrow"
            />
          </div>
        )} */}
        {/* <div
          className="flex items-center rounded-base border-2 font-base border-black bg-main px-10 py-3 text-[22px] shadow-base transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none m800:px-8 m800:py-2.5 m800:text-lg m400:px-6 m400:py-2 m400:text-base"
          onClick={login}
        >
          Play now
          <img
            className="ml-[15px] w-[18px] m400:ml-4 m400:w-[15px]"
            src={arrow.src}
            alt="arrow"
          />
        </div> */}
        <svg
          className="absolute left-[20%] top-[25%] w-[80px] m1500:left-[15%] m1500:top-[20%] m1500:w-[50px] m1100:hidden"
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M46.9395 14.107L50 4.80124L53.0605 14.107C58.1702 29.6438 70.3562 41.8298 85.893 46.9395L95.1988 50L85.893 53.0605C70.3562 58.1702 58.1702 70.3562 53.0605 85.893L50 95.1988L46.9395 85.893C41.8298 70.3562 29.6438 58.1702 14.107 53.0605L4.80124 50L14.107 46.9395C29.6438 41.8298 41.8298 29.6438 46.9395 14.107Z"
            className="fill-main"
            stroke="black"
            strokeWidth="3"
          />
        </svg>

        <img
          className="absolute bottom-[25%] right-[20%] w-[80px] m1500:bottom-[20%] m1500:right-[15%] m1500:w-[50px] m1100:hidden"
          src={herostar2.src}
          alt="hero star 2"
        />
      </main>
      <div>
        <CustomMarquee direction={"left"} />
        <div className="grid grid-cols-2 border-b-4 border-t-4 border-black m700:grid-cols-1">
          <section className="border-b-4 border-r-4 border-black bg-bg p-14 py-16 m1300:p-10 m1300:py-12 m800:p-6 m800:py-8 m700:border-r-0 m700:bg-main">
            <h2 className="mb-6 font-heading text-4xl m1300:text-3xl m800:text-2xl m500:text-xl">
              Win Big Daily
            </h2>

            <p className="text-2xl font-base m1300:text-xl m800:text-lg m500:text-base">
              Play-Earn-Win on Confidential On-chain Casino.
            </p>
          </section>
          <section className="border-b-4 border-black bg-main p-14 py-16 m1300:p-10 m1300:py-12 m800:p-6 m800:py-8 m700:bg-bg">
            <h2 className="mb-6 font-heading text-4xl m1300:text-3xl m800:text-2xl m500:text-xl">
              Play, Earn, Win
            </h2>

            <p className="text-2xl font-base m1300:text-xl m800:text-lg m500:text-base">
              Play-Earn-Win on Confidential On-chain Casino.
            </p>
          </section>
          <section className="border-r-4 border-black bg-main p-14 py-16 m1300:p-10 m1300:py-12 m800:p-6 m800:py-8 m700:border-b-4 m700:border-r-0">
            <h2 className="mb-6 font-heading text-4xl m1300:text-3xl m800:text-2xl m500:text-xl">
              Secure Casino Gaming
            </h2>

            <p className="text-2xl font-base m1300:text-xl m800:text-lg m500:text-base">
              Play-Earn-Win on Confidential On-chain Casino.
            </p>
          </section>
          <section className="bg-bg p-14 py-16 m1300:p-10 m1300:py-12 m800:p-6 m800:py-8">
            <h2 className="mb-6 text-4xl font-heading m1300:text-3xl m800:text-2xl m500:text-xl">
              Ultimate Web3 Casino
            </h2>

            <p className="text-2xl font-base m1300:text-xl m800:text-lg m500:text-base">
              Play-Earn-Win on Confidential On-chain Casino.
            </p>
          </section>
        </div>
        <section className="border-t-4 border-t-black border-b-4 bg-bg py-20 m500:py-14 font-base lg:py-[100px]">
          <h2 className="mb-10 px-5 text-center text-4xl font-heading m1300:text-3xl m700:text-2xl m500:text-xl lg:mb-20">
            Frequently asked questions
          </h2>

          <div className="mx-auto grid w-[700px] max-w-full px-5">
            <Accordion
              className="text-base sm:text-lg"
              type="single"
              collapsible
            >
              <AccordionItem className="mb-2" value="item-1">
                <AccordionTrigger>Is the casino provably fair?</AccordionTrigger>
                <AccordionContent className="text-sm sm:text-base">
                  Yes. Each round&apos;s outcome is a random value drawn and
                  sealed inside Inco&apos;s TEE, and only revealed at settlement,  where the contract verifies a covalidator attestation
                  on-chain. Neither you, the house, nor a validator can see or
                  bias the result before your bet is locked.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem className="mb-2" value="item-2">
                <AccordionTrigger>
                  Which network and token does it use?
                </AccordionTrigger>
                <AccordionContent className="text-sm sm:text-base">
                  It runs on Base Sepolia (Inco Lightning). You bet with a free
                  test USDC token, grab some from the Deposit page&apos;s
                  faucet. No real money is involved.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem className="mb-2" value="item-3">
                <AccordionTrigger>How does a round work?</AccordionTrigger>
                <AccordionContent className="text-sm sm:text-base">
                  Two steps. First you place your bet, which locks your wager
                  and draws the sealed random seed on-chain. Then the outcome is
                  revealed and settled, any winnings are paid to your wallet
                  automatically.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-4">
                <AccordionTrigger>Do I need to connect a wallet?</AccordionTrigger>
                <AccordionContent className="text-sm sm:text-base">
                  Yes,  connect any EVM wallet (MetaMask, Rabby, WalletConnect,
                  and more) with the Connect button. Make sure it&apos;s on Base
                  Sepolia; you&apos;ll be prompted to switch if not.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>
        <CustomMarquee direction={"right"} />
        <section className="border-t-4 border-t-black inset-0 w-full flex flex-col items-center justify-center bg-main bg-[linear-gradient(to_right,#00000033_1px,transparent_1px),linear-gradient(to_bottom,#00000033_1px,transparent_1px)] bg-[size:70px_70px] px-5 py-[200px] m1000:py-[150px] m500:py-[120px]">
          <h2 className="text-center font-heading text-5xl m1000:text-3xl m500:text-2xl m400:text-xl">
            Craft Your Winning Strategy Today.
          </h2>

          <Link
            className="mt-[50px] flex font-base items-center rounded-base border-2 border-black bg-white px-10 py-3 text-[22px] shadow-base transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none m800:px-8 m800:py-2.5 m800:text-lg m400:px-6 m400:py-2 m400:text-base"
            href={"/games"}
          >
            Play now
            <img
              className="ml-[15px] w-[18px] m400:ml-4 m400:w-[15px]"
              src={arrow.src}
              alt="arrow"
            />
          </Link>
        </section>
      </div>
    </div>
  );
}
