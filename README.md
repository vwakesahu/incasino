# Incasino

A confidential on-chain casino built on Inco Lightning. Six games (Coin Flip, Dice, Mines, Plinko, Rock Paper Scissors, Slots) that run on Base Sepolia. You bet with native test ETH, no token or deposit step.

## How a round works

Inco has no synchronous on-chain decryption, so every game is two steps:

1. `play...(...)` locks your wager (sent as ETH) and draws a random seed with `e.rand()`.
2. `settle(gameId, attestation, signatures)` submits the covalidator attestation and pays out.

Bets are capped at 0.0005 ETH per round, and quick games can run up to 10 rounds in one go.

## Deployed contract (Base Sepolia)

One contract holds the ETH bankroll and all six games. Verified on Basescan.

| Contract | Address |
|----------|---------|
| Casino | [`0x5b5d7d4ad82bac6419c205c395fd208901592357`](https://sepolia.basescan.org/address/0x5b5d7d4ad82bac6419c205c395fd208901592357#code) |

Chain id 84532. The owner funds and withdraws the bankroll from the `/owner` page.

## Layout

```
contracts/   Solidity Casino contract, tests, deploy script
client/      Next.js frontend (wagmi + RainbowKit + viem)
```

## Run the contracts

```bash
cd contracts
npm install
cp .env.example .env          # set PRIVATE_KEY_BASE_SEPOLIA
npm run compile
npm run deploy:baseSepolia    # deploys + funds the bankroll, writes deployments/baseSepolia.json
npm test
```

## Run the frontend

```bash
cd client
npm install
npm run dev
```

Connect a wallet on Base Sepolia, get some test ETH from a faucet, and play.

## Links

- Inco: https://www.inco.org
- Inco docs: https://docs.inco.org
- Explorer: https://sepolia.basescan.org
- Base Sepolia faucet: https://www.alchemy.com/faucets/base-sepolia
