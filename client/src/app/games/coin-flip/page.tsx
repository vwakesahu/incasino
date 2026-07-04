"use client";
import React, { useEffect, useState } from "react";
import CoinFlipForm from "@/modules/coin-flip/coinFlipInputForm";
import { toast } from "@/components/ui/use-toast";
import CoinFlip from "@/modules/coin-flip";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import PlayButton from "@/components/PlayButton";
import { fetchTokens } from "@/utils/helpers/webHelpers";
import { useGameContext } from "@/hooks/useGameContext";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { setToken } from "@/redux/slices/tokenSlice";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { playFlipGame } from "@/utils/helpers/coinFlipHelpers";
import CoinFlipAlert from "@/modules/coin-flip/coinFlipAlert";

const Index = () => {
  const [isFlipping, setIsFlipping] = useState(false);
  const [result, setResult] = useState<string | readonly number[] | readonly string[]>(["Coin"]);
  const [, setIsBtnDisbled] = useState(false);
  const [wager, setWager] = useState<string | number>(0);
  const [bet, setBet] = useState<string | number>(1);
  const [totalwager, setTotalwager] = useState(0);
  const [maxPayout, setMaxPayout] = useState(0);
  const [stopOnLoss, setStopOnLoss] = useState<string | number>(0);
  const [takeprofit, setTakeprofit] = useState<string | number>(0);
  const [userChoiced, setUserChoiced] = useState<string | undefined>();
  const [open, setOpen] = useState(false);

  const { ctx, ready, address } = useGameContext();
  const { token } = useAppSelector((state) => state.tokens);
  const dispath = useAppDispatch();

  useEffect(() => {
    if (ctx && ready) {
      fetchTokens(ctx, setToken, ready, dispath);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, ready]);

  const startFlipping = () => {
    if (!ctx) {
      toast({ title: "Please connect your wallet!" });
      return;
    }
    if (!wager) {
      toast({
        title: "Please, add valid wager",
      });
      return;
    }
    if (!bet || Number(bet) <= 0) {
      toast({
        title: "Please, place valid bet!",
      });
      return;
    }
    if (!userChoiced) {
      toast({
        title: "Please, Choose heads or tails!",
      });
      return;
    }
    setIsFlipping(true);
    setIsBtnDisbled(true);
    setResult("loading");
    playFlipGame(
      ctx,
      String(wager),
      Number(bet),
      userChoiced,
      String(takeprofit ? takeprofit : maxPayout.toString()),
      String(stopOnLoss),
      setToken,
      ready,
      dispath,
      stopFlipping,
      setResult,
      setOpen
    );
  };

  useEffect(() => {
    // Calculate total wager and round to nearest integer
    setTotalwager(Math.round(Number(wager) * Number(bet)));
  }, [wager, bet]);

  useEffect(() => {
    if (takeprofit !== 0 && takeprofit !== undefined) {
      setMaxPayout(Math.round(Number(takeprofit)));
    } else if (takeprofit === 0 && takeprofit !== undefined) {
      const calculatedPayout = Math.round(Number(wager) * Number(bet) * 1.98);
      setMaxPayout(calculatedPayout);
    }
  }, [wager, bet, takeprofit]);

  const stopFlipping = (value: readonly number[] | string) => {
    setIsBtnDisbled(false);
    setIsFlipping(false);
    setResult(value);
  };

  return (
    <>
      <div>
        <CoinFlipAlert
          open={open}
          setOpen={setOpen}
          coins={result as readonly number[]}
          userChoice={userChoiced}
        />
        <main className="relative flex flex-col items-center justify-center bg-white px-5 py-[150px] text-center font-bold bg-[linear-gradient(to_right,#80808033_1px,transparent_1px),linear-gradient(to_bottom,#80808033_1px,transparent_1px)] bg-[size:70px_70px]">
          <div className="grid gap-4 grid-cols-2">
            <div className="max-w-[70%] flex flex-col gap-4">
              <CoinFlipForm
                id={"wager"}
                label={"Wager"}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWager(e.target.value)}
                placeholder={"Choose Wager"}
                type={"number"}
                value={wager}
              />
              <CoinFlipForm
                id={"bets"}
                label={"Bets"}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBet(e.target.value)}
                placeholder={""}
                type={"number"}
                value={bet}
              />

              <div className="grid grid-cols-2 gap-4">
                <CoinFlipForm
                  id={"totalwager"}
                  label={"Total Wager"}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {}}
                  placeholder={"-"}
                  value={totalwager}
                  className={"cursor-not-allowed"}
                />{" "}
                <CoinFlipForm
                  id={"maxpayout"}
                  label={"Max Payout"}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {}}
                  placeholder={"-"}
                  value={maxPayout}
                  className={"cursor-not-allowed"}
                />
              </div>

              <div>
                <RadioGroup
                  className="flex"
                  onValueChange={(e) => setUserChoiced(e)}
                >
                  <div className={`flex items-center space-x-2`}>
                    <RadioGroupItem value="heads" id="r1" />
                    <Label htmlFor="r1">Heads</Label>
                  </div>
                  <div className={`flex items-center space-x-2`}>
                    <RadioGroupItem value="tails" id="r2" />
                    <Label htmlFor="r2">Tails</Label>
                  </div>
                </RadioGroup>
              </div>

              <Accordion
                className="w-full lg:w-[unset] bg-white border-none shadow-none"
                type="single"
                collapsible
              >
                <AccordionItem className="max-w-full" value="item-1">
                  <AccordionTrigger className="bg-transparent">
                    Advanced
                  </AccordionTrigger>
                  <AccordionContent className="grid grid-cols-2 gap-4">
                    <CoinFlipForm
                      id={"stoponloss"}
                      label={"Stop on Loss"}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStopOnLoss(e.target.value)}
                      placeholder={"-"}
                      type={"number"}
                      value={stopOnLoss}
                    />{" "}
                    <CoinFlipForm
                      id={"takeprofit"}
                      label={"Take Profit"}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTakeprofit(e.target.value)}
                      placeholder={"-"}
                      type={"number"}
                      value={takeprofit}
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              <PlayButton handler={startFlipping} tokens={token} />
            </div>
            <div className="md:flex hidden relative">
              <div className="w-[550px]">
                <CoinFlip
                  isFlipping={isFlipping}
                  result={result as string}
                  setUserChoiced={setUserChoiced}
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default Index;
