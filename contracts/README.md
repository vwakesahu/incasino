# Incasino — Contracts (Inco Lightning)

Confidential, provably fair casino games built on the Inco Lightning SDK
(`@inco/lightning` for Solidity, `@inco/lightning-js` for the covalidator reveal).
Six games (CoinFlip, Dice, Mines, Plinko, RockPaperScissors, SlotMachine) plus a
mock USDC bet token, with a TypeScript deploy script and TypeScript Hardhat tests
that run the full play to settle loop against live Base Sepolia.

## Why each game is two phase

Inco has no synchronous on chain decryption. `e.rand()` returns an encrypted
handle; turning it into plaintext is asynchronous. The covalidator (a TEE)
decrypts the revealed handle off chain and signs a decryption attestation, which
is then verified on chain. So a one transaction casino game is not possible, and
each game becomes a two step flow:

```
play(...)   lock the wager, reserve the worst case payout, draw ONE sealed seed
            with e.rand() and reveal it. The seed is opaque to the player, the
            house, and the mempool, and the bet is already committed, so nobody
            can pick favourable rolls.

  (off chain) the covalidator decrypts the revealed seed and signs an attestation

settle(...) submit the attestation. The contract verifies the signature and that
            the attested handle matches the stored seed, then derives the outcome
            deterministically from the single sealed value and pays out.
```

This is fairer than a naive on chain RNG: there is zero block based entropy
(no `block.timestamp` / `block.number`), so a validator cannot bias outcomes. Every
sub outcome is derived from the one attested seed with `keccak(seed, i)` (see
`CasinoBase._word`).

## Layout

```
CasinoBase.sol          shared base: sealed RNG draw, reveal, attestation
                        settlement, ERC20 bankroll + liability reservation
MockUSDC.sol            plain ERC20 bet token with a faucet, balances stay public
CoinFlip.sol            \
Dice.sol                 |
Mines.sol                |  each: play() reserves liability and opens a game,
Plinko.sol               |        settle() derives the outcome from the seed
RockPaperScissors.sol    |
SlotMachine.sol         /
scripts/deploy.ts       deploy USDC + games, fund each bankroll, save addresses
test/casino.test.ts     full play to reveal to settle tests for every game
test/helpers.ts         Lightning SDK init + attestation formatting
```

All Inco interaction is encapsulated in `CasinoBase`; each game is pure plaintext
logic (outcome math + payout) on top of the attested seed.

## Setup

```bash
npm install
cp .env.example .env
```

`.env` needs a funded Base Sepolia key:

```
PRIVATE_KEY_BASE_SEPOLIA=0xyourkey
BASE_SEPOLIA_RPC_URL=https://base-sepolia-rpc.publicnode.com
ETHERSCAN_API_KEY=yourkey     # for contract verification
```

## Run on Base Sepolia

```bash
npm run compile
npm run deploy:baseSepolia    # deploy + fund all games, writes deployments/baseSepolia.json
npm test                      # full play -> reveal -> attestation -> settle, reusing that deploy
```

The Inco fee is `1e12` wei per randomness draw (read via `getFee()`). Tests reuse
the deployment, so deploy first. The covalidator quorum is 2 of 2, and a reveal can
take a few minutes, so tests poll for state and read payouts from the `BetSettled`
event to tolerate replica lag.

Last green run against live Base Sepolia:

```
Confidential Casino (Inco Lightning)
  ✔ CoinFlip / Dice / Mines / Plinko / RockPaperScissors / SlotMachine
  CasinoBase safety
    ✔ rejects a second settlement of the same game
    ✔ rejects an attestation whose handle does not match the game seed
    ✔ rejects play() before the bankroll is initialized
    ✔ caps owner withdrawal to non reserved bankroll
  10 passing
```

Prefer `https://base-sepolia-rpc.publicnode.com`. The official `https://sepolia.base.org`
is load balanced and intermittently throws DNS/write errors and read after write lag.

## Verify on Basescan

```bash
npx hardhat verify --network baseSepolia <address> <constructorArgs>
```

## Game mapping

| Game | Entrypoints | Max payout reserved |
|------|-------------|---------------------|
| CoinFlip | `play` -> `settle` | `numBets x 1.98x` |
| Dice | `play` -> `settle` | inverse probability x 0.98 |
| Mines | `play` -> `settle` | `wager x points x mines` |
| Plinko | `play` -> `settle` | `16x` |
| RockPaperScissors | `play` -> `settle` | `numBets x 1.75x` |
| SlotMachine | `play` -> `settle` | `5.25x` (6-6-6) |

### Bankroll safety (in `CasinoBase`)

- Liability reservation: every `play()` reserves the worst case payout and refuses
  bets the bankroll cannot cover (`betToken.balanceOf(this) >= totalActiveLiability + maxPayout`).
- Permissionless settle: anyone can submit the public attestation; the payout
  always goes to the stored player.
- `expireGame(gameId)`: after `GAME_TIMEOUT` (1h) it refunds a stuck game's wager
  and releases its liability, a safety valve if the covalidator stalls.
- `withdraw` is capped to non reserved funds, so it cannot rug active games.
- `nonReentrant` on every state changing path; `.safeTransfer` for ERC20.

## Notes

- The bet token (MockUSDC) is a plain public ERC20 by design. The privacy here
  lives in the sealed RNG, not in balances.
- Provably fair here means a TEE attestation, not a zero knowledge proof. Players
  trust the Inco covalidator enclave signature.
- `expireGame` refunds the wager (not winnings) on timeout. Since `settle` is
  permissionless, the normal path is for the frontend to settle immediately.
