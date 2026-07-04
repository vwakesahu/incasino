# Incasino

A confidential, fair on-chain casino built on Inco Lightning. Six games (Coin Flip, Dice, Mines, Plinko, Rock Paper Scissors, Slots) where the random outcome stays hidden until your bet is locked, so nobody can see or bias it in advance.

Runs on Base Sepolia with a free test token.

## How a round works

Inco has no synchronous on-chain decryption, so every game is two steps:

1. `play(...)` locks your wager, reserves the worst case payout, draws one random seed with `e.rand()`, and reveals it. The wager is taken first, so the outcome is unknowable when you commit.
2. `settle(gameId, attestation, signatures)` submits the covalidator attestation. The contract checks it matches the stored seed, derives the result, and pays out.

Every outcome comes from that one seed with zero block based entropy.

## Deployed contracts (Base Sepolia)

All verified on Basescan. The bet token is a plain public ERC20 on purpose.

| Contract | Address | Explorer |
|----------|---------|----------|
| MockUSDC (bet token) | `0x3df930c383f646aa60220d8567a6080a7521588c` | [view](https://sepolia.basescan.org/address/0x3df930c383f646aa60220d8567a6080a7521588c#code) |
| CoinFlip | `0xb78e66761bc497c02c8deb669a1e8a23389c434a` | [view](https://sepolia.basescan.org/address/0xb78e66761bc497c02c8deb669a1e8a23389c434a#code) |
| Dice | `0x2cf2d5ae7258625ae49f8c658ef1b5d8e8da77a0` | [view](https://sepolia.basescan.org/address/0x2cf2d5ae7258625ae49f8c658ef1b5d8e8da77a0#code) |
| Mines | `0x23282ca7ada3b20df4f98e1090017beb067db3bd` | [view](https://sepolia.basescan.org/address/0x23282ca7ada3b20df4f98e1090017beb067db3bd#code) |
| Plinko | `0x45dbc9182809b48522c8e8e9bb5e28ab00a25ba4` | [view](https://sepolia.basescan.org/address/0x45dbc9182809b48522c8e8e9bb5e28ab00a25ba4#code) |
| RockPaperScissors | `0xf16b1e3a22143f4fcb6966cda6cb211614b038e0` | [view](https://sepolia.basescan.org/address/0xf16b1e3a22143f4fcb6966cda6cb211614b038e0#code) |
| SlotMachine | `0x6b1a4eb2a1734f917c688990dba3cdb6718e7124` | [view](https://sepolia.basescan.org/address/0x6b1a4eb2a1734f917c688990dba3cdb6718e7124#code) |

Network: Base Sepolia, chain id 84532.

## Layout

```
contracts/   Solidity contracts on Inco Lightning, TypeScript tests, deploy script
client/      Next.js frontend (App Router, TypeScript, wagmi + RainbowKit + viem)
```

## Run the contracts

```bash
cd contracts
npm install
cp .env.example .env          # set PRIVATE_KEY_BASE_SEPOLIA and ETHERSCAN_API_KEY
npm run compile
npm run deploy:baseSepolia    # deploy + fund, writes deployments/baseSepolia.json
npm test                      # play -> reveal -> settle suite on Base Sepolia
```

## Run the frontend

```bash
cd client
npm install
npm run dev
```

Optional `client/.env.local`:

```
NEXT_PUBLIC_WC_PROJECT_ID=your_walletconnect_id   # injected wallets work without it
NEXT_PUBLIC_BASE_SEPOLIA_RPC=https://your-rpc      # used first, public RPCs as fallback
```

Connect a wallet on Base Sepolia, grab test tokens from the Deposit page, and play. Winnings are paid to your wallet once a round settles.

## Tech stack

- Contracts: Solidity 0.8.30, `@inco/lightning`, OpenZeppelin, Hardhat
- Frontend: Next.js, React, TypeScript, Tailwind CSS, wagmi, viem, RainbowKit
- SDK: `@inco/lightning-js` for the covalidator reveal and attestation

## Links

- Inco: https://www.inco.org
- Inco docs: https://docs.inco.org
- Base Sepolia explorer: https://sepolia.basescan.org
- Base Sepolia faucet: https://www.alchemy.com/faucets/base-sepolia
