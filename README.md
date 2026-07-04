# Incasino

A confidential, provably fair on-chain casino built on Inco Lightning. Six classic games (Coin Flip, Dice, Mines, Plinko, Rock Paper Scissors, Slots) where the randomness is drawn and sealed inside a TEE, so nobody (not the player, not the house, not a validator) can see or bias the outcome before a bet is locked.

It runs on Base Sepolia with a free test token, so you can try everything without spending real money.

> A quick note on wording: Inco is TEE based (Trusted Execution Environment), not FHE. The API uses "encrypted" terminology, but under the hood it is encrypt/decrypt inside a TEE, not fully homomorphic encryption. So "provably fair" here means a covalidator attestation, not a zero knowledge proof.

## How a round works

Because there is no synchronous on-chain decryption, every game is a two step flow:

1. `play(...)` locks your wager, reserves the worst case payout from the house bankroll, draws a single sealed random seed with `e.rand()`, and reveals it. The wager is taken before the reveal, so the outcome is unknowable at the moment you commit.
2. `settle(gameId, attestation, signatures)` submits the covalidator's decryption attestation. The contract checks the signature and that the attested handle matches the stored seed, then derives the result and pays out.

Everything is computed from that one sealed seed with zero block based entropy, which is what makes it fair.

## Deployed contracts (Base Sepolia)

All contracts are verified on Basescan. The bet token is a plain public ERC20 on purpose: the privacy here lives in the sealed RNG, not in balances.

| Contract | Address | Explorer |
|----------|---------|----------|
| MockUSDC (bet token) | `0x3df930c383f646aa60220d8567a6080a7521588c` | [view](https://sepolia.basescan.org/address/0x3df930c383f646aa60220d8567a6080a7521588c#code) |
| CoinFlip | `0xb78e66761bc497c02c8deb669a1e8a23389c434a` | [view](https://sepolia.basescan.org/address/0xb78e66761bc497c02c8deb669a1e8a23389c434a#code) |
| Dice | `0x2cf2d5ae7258625ae49f8c658ef1b5d8e8da77a0` | [view](https://sepolia.basescan.org/address/0x2cf2d5ae7258625ae49f8c658ef1b5d8e8da77a0#code) |
| Mines | `0x23282ca7ada3b20df4f98e1090017beb067db3bd` | [view](https://sepolia.basescan.org/address/0x23282ca7ada3b20df4f98e1090017beb067db3bd#code) |
| Plinko | `0x45dbc9182809b48522c8e8e9bb5e28ab00a25ba4` | [view](https://sepolia.basescan.org/address/0x45dbc9182809b48522c8e8e9bb5e28ab00a25ba4#code) |
| RockPaperScissors | `0xf16b1e3a22143f4fcb6966cda6cb211614b038e0` | [view](https://sepolia.basescan.org/address/0xf16b1e3a22143f4fcb6966cda6cb211614b038e0#code) |
| SlotMachine | `0x6b1a4eb2a1734f917c688990dba3cdb6718e7124` | [view](https://sepolia.basescan.org/address/0x6b1a4eb2a1734f917c688990dba3cdb6718e7124#code) |

Network: Base Sepolia, chain id 84532. Explorer: https://sepolia.basescan.org

## Repository layout

```
contracts-inco/   Solidity contracts on Inco Lightning, TypeScript tests, deploy script
client/           Next.js frontend (App Router, TypeScript, wagmi + RainbowKit + viem)
```

`contracts-inco/CasinoBase.sol` holds the shared logic (sealed RNG draw, reveal, attestation settlement, ERC20 bankroll with liability reservation). Each game is a small contract with its own payout math on top of it.

## Running the contracts

```bash
cd contracts-inco
npm install
npm run compile
npm test                     # runs the play -> reveal -> settle suite on Base Sepolia
npm run deploy:baseSepolia   # deploy + fund, writes deployments/baseSepolia.json
```

Testing and deploying against Base Sepolia needs a funded key. Copy `.env.example` to `.env` and set:

```
PRIVATE_KEY_BASE_SEPOLIA=0xyourkey
ETHERSCAN_API_KEY=yourkey     # for contract verification
```

To verify a contract yourself:

```bash
npx hardhat verify --network baseSepolia <address> <constructorArgs>
```

## Running the frontend

```bash
cd client
npm install
npm run dev
```

Optional environment (in `client/.env.local`):

```
NEXT_PUBLIC_WC_PROJECT_ID=your_walletconnect_id   # for WalletConnect; injected wallets work without it
NEXT_PUBLIC_BASE_SEPOLIA_RPC=https://your-rpc      # a keyed RPC, used first with public ones as fallback
```

Connect a wallet (MetaMask, Rabby, WalletConnect, and more), make sure it is on Base Sepolia, grab some test tokens from the Deposit page, and play. Winnings are paid to your wallet automatically once a round settles.

## Tech stack

- Contracts: Solidity 0.8.30, `@inco/lightning`, OpenZeppelin, Hardhat
- Frontend: Next.js, React, TypeScript, Tailwind CSS, wagmi, viem, RainbowKit
- SDK: `@inco/lightning-js` for the covalidator reveal and attestation

## Links

- Inco: https://www.inco.org
- Inco docs: https://docs.inco.org
- Base Sepolia explorer: https://sepolia.basescan.org
- Base Sepolia faucet: https://www.alchemy.com/faucets/base-sepolia
