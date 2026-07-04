import type { Address } from "viem";

export interface GameContext {
  address: Address;
}

export type GameStage = "approving" | "betting" | "revealing" | "settling";

export type ContractArg =
  | string
  | number
  | bigint
  | boolean
  | readonly ContractArg[];

export type PlayArgs = readonly ContractArg[];
