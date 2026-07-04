// Inco Lightning casino — Base Sepolia (chainId 84532).
// Addresses from contracts-inco/deployments/baseSepolia.json.
import type { Abi, Address } from "viem";

import ConflipABI from "@/abi/coinFlip.json";
import SlotMachineABI from "@/abi/slotMachine.json";
import TokenABI from "@/abi/token.json";
import HandRockABI from "@/abi/handrock.json";
import MinesABI from "@/abi/mines.json";
import PlinkoABI from "@/abi/plinko.json";
import DiceABI from "@/abi/dice.json";

export const conflipABI = ConflipABI as Abi;
export const coinFlipAddress: Address = "0xb78e66761bc497c02c8deb669a1e8a23389c434a";

export const slotMachineABI = SlotMachineABI as Abi;
export const slotMachineAddress: Address = "0x6b1a4eb2a1734f917c688990dba3cdb6718e7124";

export const tokenABI = TokenABI as Abi;
export const tokenContractAddress: Address = "0x3df930c383f646aa60220d8567a6080a7521588c";

export const handRockABI = HandRockABI as Abi;
export const handRockAddress: Address = "0xf16b1e3a22143f4fcb6966cda6cb211614b038e0";

export const minesABI = MinesABI as Abi;
export const minesAddress: Address = "0x23282ca7ada3b20df4f98e1090017beb067db3bd";

export const plinkoABI = PlinkoABI as Abi;
export const plinkoAddress: Address = "0x45dbc9182809b48522c8e8e9bb5e28ab00a25ba4";

export const diceABI = DiceABI as Abi;
export const diceAddress: Address = "0x2cf2d5ae7258625ae49f8c658ef1b5d8e8da77a0";
