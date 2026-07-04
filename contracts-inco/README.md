# Inco FHE Casino — Contracts (Inco Lightning SDK)

Confidential casino games migrated from **Zama fhEVM** to the **Inco Lightning SDK**
(`@inco/lightning` + `@inco/js`). Six games (CoinFlip, Dice, Mines, Plinko,
RockPaperScissors, SlotMachine) plus a mock USDC bet token, with a TypeScript
deploy script and TypeScript Hardhat tests that run the full encrypt → settle
loop against a local Inco node.

> This is the new `contracts-inco/` workspace. The original fhEVM contracts are
> left untouched in [`../Contracts/`](../Contracts/) for reference/diffing. The
> frontend in [`../client/`](../client/) was intentionally **not** modified — see
> [Frontend impact](#frontend-impact).

---

## Why the migration changed the contract design

The original games generated randomness with:

```solidity
uint32 r = TFHE.decrypt(TFHE.randEuint32());   // synchronous on-chain decryption
```

…then branched on `r` in plaintext and paid out **in the same transaction**.

The Inco Lightning SDK has **no synchronous on-chain decryption**. `e.rand()` /
`e.randBounded()` return *encrypted handles*; turning a handle into plaintext is
**asynchronous** — the covalidator (a TEE) decrypts it off-chain and signs a
**decryption attestation**, which is then verified on-chain. So a one-transaction
casino game is no longer possible.

Each game is now a **two-phase, provably-fair RNG flow** (the inco-skill
"archetype 7" pattern, settled with Model A attestation verification):

```
play(...)   ── lock the wager, reserve the worst-case payout, draw ONE sealed
               seed with e.rand(), e.reveal() it.  The seed is opaque to the
               player, the house, and the mempool — and the bet is already
               committed, so no one can pick favourable rolls.

  (off-chain) the covalidator decrypts the revealed seed and signs an attestation

settle(...) ── submit the attestation; the contract verifies the signature AND
               that the attested handle matches the stored seed, then derives the
               outcome deterministically from the single sealed value and pays out.
```

### This is *more* private/fair than the original

The original mixed `block.timestamp` / `block.number` into the "random" array —
**miner-predictable**, so a validator could bias outcomes. The new design draws a
single full-width seed inside the TEE with **zero block-data entropy**, keeps it
sealed until an explicit reveal, and derives every sub-outcome deterministically
from that one attested value (`keccak(seed, i)` — see `CasinoBase._word`). One
sealed seed ⇒ one Inco fee, one attestation, no leakage.

---

## Layout

```
contracts/
  CasinoBase.sol          shared base: sealed RNG draw, reveal, attestation
                          settlement, ERC20 bankroll + liability reservation
  MockUSDC.sol            plain ERC20 bet token (+ faucet) — balances stay public
  CoinFlip.sol            \
  Dice.sol                 |
  Mines.sol                |  each: play() reserves liability + opens a game,
  Plinko.sol               |        settle() derives the outcome from the seed
  RockPaperScissors.sol    |
  SlotMachine.sol         /
scripts/deploy.ts         deploy USDC + games, fund each bankroll, save addresses
test/casino.test.ts       full play → reveal → settle tests for every game
test/helpers.ts           Lightning SDK init + attestation formatting
docker-compose.yaml       Inco local node (anvil + covalidator)
```

All Inco interaction is encapsulated in `CasinoBase`; each game is pure plaintext
logic (outcome math + payout) on top of the attested seed.

---

## Prerequisites

- Node.js + npm (Node 20 LTS recommended; Hardhat warns on Node 23)
- Docker (for the local Inco node)
- Foundry's `cast` is handy for debugging but not required

## Setup

```bash
cd contracts-inco
npm install
cp .env.example .env      # optional: only needed for Base Sepolia
```

> **Versions are pinned to the matched devnet pair `@inco/lightning@1.0.0-devnet-9`
> / `@inco/js@1.0.0-devnet-9`** (executor `0xB3C06f0Ed967a7E366ba31C67927DDf93d7c1154`).
> Bumping one without the other causes ABI/address skew and silent reverts.

## Run on devnet (Base Sepolia) — primary path

Inco **devnet** runs on Base Sepolia (chainId 84532) with a **hosted covalidator**
(`*.basesep.devnet.inco.org`) — no Docker needed.

```bash
# .env
PRIVATE_KEY_BASE_SEPOLIA=0x...        # a funded Base Sepolia key
BASE_SEPOLIA_RPC_URL=https://base-sepolia-rpc.publicnode.com

npm run compile
npm run deploy:devnet     # deploy + fund all games, writes deployments/devnet.json
npm run test:devnet       # full play -> reveal -> attestation -> settle, reusing that deploy
```

The Inco fee on devnet is `1e12` wei per randomness draw (read via `getFee()`).
Tests reuse the `deploy:devnet` deployment, so deploy first.

Last green run against live devnet:

```
Confidential Casino (Inco Lightning)
  ✔ CoinFlip / Dice / Mines / Plinko / RockPaperScissors / SlotMachine
  CasinoBase safety
    ✔ rejects a second settlement of the same game
    ✔ rejects an attestation whose handle does not match the game seed
    ✔ rejects play() before the bankroll is initialized
    ✔ caps owner withdrawal to non-reserved bankroll
  10 passing (4m)
```

> **RPC note:** prefer `https://base-sepolia-rpc.publicnode.com`. The official
> `https://sepolia.base.org` is load-balanced and intermittently throws DNS/write
> errors and read-after-write lag. Tests poll for state visibility and read payouts
> from the `BetSettled` event to tolerate replica lag.

## Run on a local node (alternative)

```bash
npm run node:up      # docker compose up -d  (anvil :8545 + covalidator :50055)
npm run compile
npm test             # hardhat test --network anvil
npm run deploy:local
npm run node:down
```

On **Apple Silicon** the local-node images are amd64-only (run under Rosetta;
`platform: linux/amd64` is set in `docker-compose.yaml`). The hardhat `anvil`
network uses `http://localhost:8545` (not `127.0.0.1`) so it reaches the Docker
node even if another anvil squats IPv4 `127.0.0.1:8545`.

---

## Old → new game mapping

| Game | Old entrypoint (one tx) | New entrypoints (two tx) | Max payout reserved |
|------|-------------------------|--------------------------|---------------------|
| CoinFlip | `COINFLIP_PLAY` | `play` → `settle` | `numBets × 1.98×` |
| Dice | `DICE_PLAY` | `play` → `settle` | inverse-probability × 0.98 |
| Mines | `MINES_PLAY` | `play` → `settle` | `wager × points × mines` |
| Plinko | `PLINKO_PLAY` | `play` → `settle` | `16×` |
| RockPaperScissors | `ROCKPAPERSCISSORS_PLAY` | `play` → `settle` | `numBets × 1.75×` |
| SlotMachine | `SLOTMACHINE_PLAY` | `play` → `settle` | `5.25×` (6-6-6) |

Payout multipliers and game rules are preserved from the originals. (A latent
underflow in the original SlotMachine sequence check — `n - 1` when `n == 0` — was
fixed in the process.)

### Bankroll safety (in `CasinoBase`)

- **Liability reservation:** every `play()` reserves the *worst-case* payout and
  refuses bets the bankroll can't cover (`betToken.balanceOf(this) ≥ totalActiveLiability + maxPayout`).
- **Permissionless settle:** anyone can submit the public attestation; the payout
  always goes to the stored player.
- **`expireGame(gameId)`:** after `GAME_TIMEOUT` (1h), refunds a stuck game's wager
  and releases its liability — a safety valve if the covalidator stalls.
- **`withdraw`** is capped to non-reserved funds (can't rug active games).
- `nonReentrant` on every state-changing path; `.safeTransfer` for ERC20.

---

## Frontend impact (deferred, per request)

The UI in `../client/` was **not** changed. Because synchronous settlement is
gone, the contract ABI changed (`*_PLAY` one-shot → `play`/`settle` two-phase),
so the client will eventually need rewiring to:

1. call `play(...)` with `msg.value = getFee()` and read the `BetPlaced` event for
   the `gameId` + seed handle,
2. fetch the attestation off-chain via `@inco/js` `attestedReveal([seedHandle])`
   (see `test/helpers.ts` `revealAndFormat`),
3. call `settle(gameId, attestation, signatures)` and read `BetSettled` for the
   payout.

`test/helpers.ts` + `test/casino.test.ts` are the reference for that client flow.

## Notes / trade-offs

- The bet token (USDC) is a **plain, public ERC20** by design — privacy here lives
  in the sealed RNG, not in balances, and keeping it public means the existing UI's
  balance reads still work. Making balances confidential would be a separate change.
- "Provably fair" here means **TEE attestation, not zk** — players trust the Inco
  covalidator/enclave signature, not a zero-knowledge proof.
- `expireGame` refunds the *wager* (not winnings) on timeout; a winner who never
  settles before the timeout gets their stake back. Since `settle` is
  permissionless, the normal path is for the frontend to settle immediately.
