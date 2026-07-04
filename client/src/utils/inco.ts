import { Lightning } from "@inco/lightning-js/lite";
import { maxUint256, pad, parseEventLogs, toHex } from "viem";
import type { Abi, Address, Hex } from "viem";
import { readContract, writeContract, waitForTransactionReceipt } from "@wagmi/core";
import { wagmiConfig } from "@/wagmi/config";
import { tokenABI, tokenContractAddress } from "./contract";
import type { GameContext, GameStage, PlayArgs } from "@/types";

/** Fired on `window` after a game settles, so the UI can refresh the balance. */
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

/**
 * Fetch the covalidator attestation for a publicly-revealed handle, formatted
 * for the contract's settle(). Retries to absorb covalidator latency.
 */
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
  gameAddress: Address;
  gameABI: Abi;
  wager: bigint; // total tokens to pull (wager * numBets for multi-bet games)
  playArgs: PlayArgs;
  outcomeEvent: string; // e.g. "CoinFlip_Outcome_Event"
  onStage?: (stage: GameStage) => void;
}

interface BetPlacedArgs {
  gameId: bigint;
  seedHandle: Hex;
}

/**
 * Full two-phase confidential casino flow, shared by every game:
 *   approve -> play (locks bet + draws sealed seed) -> BetPlaced (gameId + seed)
 *   -> attestedReveal (covalidator) -> settle (verifies attestation, pays out)
 *   -> the game's *_Outcome_Event.
 *
 * @typeParam TOutcome the game's Outcome-event args shape (caller-supplied).
 * @returns the decoded Outcome args, or undefined if the event was not emitted.
 */
export async function runGame<TOutcome>(
  ctx: GameContext,
  { gameAddress, gameABI, wager, playArgs, outcomeEvent, onStage }: RunGameArgs
): Promise<TOutcome | undefined> {
  const fee = (await readContract(wagmiConfig, {
    address: gameAddress,
    abi: gameABI,
    functionName: "getFee",
  })) as bigint;

  // 1. Approve the bet token once (MaxUint256) if allowance is insufficient.
  onStage?.("approving");
  const allowance = (await readContract(wagmiConfig, {
    address: tokenContractAddress,
    abi: tokenABI,
    functionName: "allowance",
    args: [ctx.address, gameAddress],
  })) as bigint;
  if (allowance < wager) {
    const approveHash = await writeContract(wagmiConfig, {
      address: tokenContractAddress,
      abi: tokenABI,
      functionName: "approve",
      args: [gameAddress, maxUint256],
    });
    await waitForTransactionReceipt(wagmiConfig, { hash: approveHash });
  }

  // 2. play(): locks the wager + draws + reveals the sealed seed.
  onStage?.("betting");
  const predictedId = (await readContract(wagmiConfig, {
    address: gameAddress,
    abi: gameABI,
    functionName: "nextGameId",
  })) as bigint;

  const playHash = await writeContract(wagmiConfig, {
    address: gameAddress,
    abi: gameABI,
    functionName: "play",
    args: playArgs,
    value: fee,
  });
  const playReceipt = await waitForTransactionReceipt(wagmiConfig, { hash: playHash });

  let gameId = predictedId;
  let seedHandle: Hex;
  const placed = parseEventLogs({ abi: gameABI, eventName: "BetPlaced", logs: playReceipt.logs });
  if (placed.length > 0) {
    const args = placed[0].args as BetPlacedArgs;
    gameId = args.gameId;
    seedHandle = args.seedHandle;
  } else {
    const game = (await readContract(wagmiConfig, {
      address: gameAddress,
      abi: gameABI,
      functionName: "getGame",
      args: [predictedId],
    })) as { seed: Hex };
    seedHandle = game.seed;
  }

  // 3. Reveal the seed off-chain via the covalidator.
  onStage?.("revealing");
  const { attestation, signatures } = await revealAndFormat(seedHandle);

  // 4. settle(): verifies the attestation on-chain and pays out.
  onStage?.("settling");
  const settleHash = await writeContract(wagmiConfig, {
    address: gameAddress,
    abi: gameABI,
    functionName: "settle",
    args: [gameId, attestation, signatures],
  });
  const settleReceipt = await waitForTransactionReceipt(wagmiConfig, { hash: settleHash });

  // Nudge the UI to refresh the wallet's token balance after a settled game.
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(BALANCE_REFRESH_EVENT));
  }

  const out = parseEventLogs({ abi: gameABI, eventName: outcomeEvent, logs: settleReceipt.logs });
  return out.length > 0 ? (out[0].args as TOutcome) : undefined;
}
