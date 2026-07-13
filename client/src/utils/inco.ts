import { Lightning } from "@inco/lightning-js/lite";
import { pad, parseEventLogs, toHex } from "viem";
import type { Address, Hex } from "viem";
import { readContract, writeContract, waitForTransactionReceipt } from "@wagmi/core";
import { wagmiConfig } from "@/wagmi/config";
import { casinoABI, casinoAddress } from "./contract";
import type { GameContext, GameStage, PlayArgs, PlayResult, RoundResult } from "@/types";

/** Fired on `window` after a game settles, so balances/tables can refresh. */
export const BALANCE_REFRESH_EVENT = "inco:balance-refresh";

// Singleton Lightning SDK bound to Base Sepolia (Inco testnet).
type Zap = Awaited<ReturnType<typeof Lightning.baseSepoliaTestnet>>;
let zapPromise: Promise<Zap> | null = null;
export function getZap(): Promise<Zap> {
  if (!zapPromise) zapPromise = Lightning.baseSepoliaTestnet();
  return zapPromise;
}

/** Solidity DecryptionAttestation { bytes32 handle; bytes32 value; }. */
export interface SolAttestation {
  handle: Hex;
  value: Hex;
}

/** Fetch the covalidator attestation for a revealed handle, formatted for settle(). */
export async function revealAndFormat(
  seedHandle: Hex,
  outerRetries = 40,
  delayMs = 3000
): Promise<{ attestation: SolAttestation; signatures: Hex[] }> {
  const zap = await getZap();
  let lastErr: Error | undefined;
  for (let i = 0; i < outerRetries; i++) {
    try {
      const [res] = await zap.attestedReveal([seedHandle], {
        backoffConfig: { maxRetries: 8, baseDelayInMs: 2000, backoffFactor: 1.2 },
      });
      const raw: bigint | boolean = res.plaintext.value;
      const value = pad(toHex(typeof raw === "boolean" ? (raw ? 1 : 0) : raw), { size: 32 });
      const signatures = res.covalidatorSignatures.map((s: Uint8Array) => toHex(s));
      return { attestation: { handle: res.handle as Hex, value }, signatures };
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr ?? new Error("attestedReveal failed after retries");
}

export interface RunGameArgs {
  functionName: string; // e.g. "playCoinFlip"
  playArgs: PlayArgs;
  wager: bigint; // total wager (wagerPerRound * rounds)
  outcomeEvent: string; // e.g. "CoinFlip_Outcome_Event"
  onStage?: (stage: GameStage) => void;
}

interface BetPlacedArgs {
  gameId: bigint;
  seedHandle: Hex;
}

interface OutcomeArgs {
  payout: bigint;
  payouts?: readonly bigint[];
}

/**
 * Full two-phase ETH casino flow, shared by every game:
 *   play (value = wager + fee, locks bet + draws sealed seed) -> BetPlaced
 *   -> attestedReveal (covalidator) -> settle (verifies attestation, pays out)
 *   -> the game's *_Outcome_Event. Returns a normalised {@link PlayResult}.
 */
export async function runGame<TRaw = unknown>(
  _ctx: GameContext,
  { functionName, playArgs, wager, outcomeEvent, onStage }: RunGameArgs
): Promise<PlayResult<TRaw>> {
  const fee = (await readContract(wagmiConfig, {
    address: casinoAddress,
    abi: casinoABI,
    functionName: "getFee",
  })) as bigint;

  // 1. play(): locks the wager (as ETH value) + draws + reveals the sealed seed.
  onStage?.("betting");
  const playHash = await writeContract(wagmiConfig, {
    address: casinoAddress,
    abi: casinoABI,
    functionName,
    args: playArgs,
    value: wager + fee,
  });
  const playReceipt = await waitForTransactionReceipt(wagmiConfig, { hash: playHash });

  const placed = parseEventLogs({ abi: casinoABI, eventName: "BetPlaced", logs: playReceipt.logs });
  if (placed.length === 0) throw new Error("no BetPlaced event");
  const { gameId, seedHandle } = placed[0].args as unknown as BetPlacedArgs;

  // 2. Reveal the seed off-chain via the covalidator.
  onStage?.("revealing");
  const { attestation, signatures } = await revealAndFormat(seedHandle);

  // 3. settle(): verifies the attestation on-chain and pays out.
  onStage?.("settling");
  const settleHash = await writeContract(wagmiConfig, {
    address: casinoAddress,
    abi: casinoABI,
    functionName: "settle",
    args: [gameId, attestation, signatures],
  });
  const settleReceipt = await waitForTransactionReceipt(wagmiConfig, { hash: settleHash });

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(BALANCE_REFRESH_EVENT));
  }

  const out = parseEventLogs({ abi: casinoABI, eventName: outcomeEvent, logs: settleReceipt.logs });
  if (out.length === 0) throw new Error("no outcome event");
  const args = out[0].args as unknown as OutcomeArgs;

  const payout = args.payout ?? 0n;
  const rounds: RoundResult[] = args.payouts
    ? args.payouts.map((p) => ({ won: p > 0n, payout: p }))
    : [{ won: payout > 0n, payout }];

  onStage?.("done");
  return {
    wager,
    payout,
    net: payout - wager,
    rounds,
    raw: args as unknown as TRaw,
  };
}

// Read the current Inco fee (wei) for display / value calc.
export async function getIncoFee(): Promise<bigint> {
  return (await readContract(wagmiConfig, {
    address: casinoAddress,
    abi: casinoABI,
    functionName: "getFee",
  })) as bigint;
}

export type { Address };
