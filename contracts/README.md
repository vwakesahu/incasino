# Incasino — Contracts (Inco Lightning)

Confidential casino games on the Inco Lightning SDK. Six games (CoinFlip, Dice, Mines, Plinko, RockPaperScissors, SlotMachine) plus a mock USDC bet token, with a TypeScript deploy script and Hardhat tests that run on Base Sepolia.

## How a round works

Inco has no synchronous on-chain decryption, so each game is two steps:

1. `play(...)` locks the wager and draws a random seed with `e.rand()`.
2. `settle(gameId, attestation, signatures)` submits the covalidator attestation. The contract checks it matches the stored seed, derives the outcome, and pays out.

## Layout

```
CasinoBase.sol          shared base: RNG draw, reveal, settlement, bankroll
MockUSDC.sol            plain ERC20 bet token
CoinFlip / Dice / Mines / Plinko / RockPaperScissors / SlotMachine
scripts/deploy.ts       deploy and fund the games, save addresses
test/casino.test.ts     play -> settle tests for every game
```

## Run on Base Sepolia

```bash
npm install
cp .env.example .env          # set PRIVATE_KEY_BASE_SEPOLIA
npm run compile
npm run deploy:baseSepolia    # writes deployments/baseSepolia.json
npm test
```

The bet token (MockUSDC) is a plain public ERC20; the privacy is in the RNG, not balances.
