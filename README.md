# Incasino

A confidential on-chain casino built on Inco Lightning. Six games (Coin Flip, Dice, Mines, Plinko, Rock Paper Scissors, Slots) that run on Base Sepolia with a free test token.

## How a round works

Inco has no synchronous on-chain decryption, so every game is two steps:

1. `play(...)` locks your wager and draws a random seed with `e.rand()`.
2. `settle(gameId, attestation, signatures)` submits the covalidator attestation and pays out.

## Deployed contracts (Base Sepolia)

All verified on Basescan.

| Contract | Address |
|----------|---------|
| MockUSDC (bet token) | [`0x3df930c383f646aa60220d8567a6080a7521588c`](https://sepolia.basescan.org/address/0x3df930c383f646aa60220d8567a6080a7521588c#code) |
| CoinFlip | [`0xb78e66761bc497c02c8deb669a1e8a23389c434a`](https://sepolia.basescan.org/address/0xb78e66761bc497c02c8deb669a1e8a23389c434a#code) |
| Dice | [`0x2cf2d5ae7258625ae49f8c658ef1b5d8e8da77a0`](https://sepolia.basescan.org/address/0x2cf2d5ae7258625ae49f8c658ef1b5d8e8da77a0#code) |
| Mines | [`0x23282ca7ada3b20df4f98e1090017beb067db3bd`](https://sepolia.basescan.org/address/0x23282ca7ada3b20df4f98e1090017beb067db3bd#code) |
| Plinko | [`0x45dbc9182809b48522c8e8e9bb5e28ab00a25ba4`](https://sepolia.basescan.org/address/0x45dbc9182809b48522c8e8e9bb5e28ab00a25ba4#code) |
| RockPaperScissors | [`0xf16b1e3a22143f4fcb6966cda6cb211614b038e0`](https://sepolia.basescan.org/address/0xf16b1e3a22143f4fcb6966cda6cb211614b038e0#code) |
| SlotMachine | [`0x6b1a4eb2a1734f917c688990dba3cdb6718e7124`](https://sepolia.basescan.org/address/0x6b1a4eb2a1734f917c688990dba3cdb6718e7124#code) |

Chain id 84532.

## Layout

```
contracts/   Solidity contracts, tests, deploy script
client/      Next.js frontend (wagmi + RainbowKit + viem)
```

## Run the contracts

```bash
cd contracts
npm install
cp .env.example .env          # set PRIVATE_KEY_BASE_SEPOLIA
npm run compile
npm run deploy:baseSepolia
npm test
```

## Run the frontend

```bash
cd client
npm install
npm run dev
```

Connect a wallet on Base Sepolia and get test tokens from the Deposit page.

## Links

- Inco: https://www.inco.org
- Inco docs: https://docs.inco.org
- Explorer: https://sepolia.basescan.org
