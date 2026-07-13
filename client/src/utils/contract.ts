// Inco Lightning casino — Base Sepolia (chainId 84532).
// Single monolithic Casino contract (ETH bankroll + all six games).
// Address from contracts/deployments/baseSepolia.json.
import type { Abi, Address } from "viem";

import CasinoABI from "@/abi/casino.json";

export const casinoABI = CasinoABI as Abi;
export const casinoAddress: Address = "0x5b5d7d4ad82bac6419c205c395fd208901592357";

// On-chain caps (mirror Casino.sol).
export const MAX_WAGER_PER_ROUND_ETH = "0.0005";
export const MAX_ROUNDS = 10;
