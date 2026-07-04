import { expect } from "chai";
import hre from "hardhat";
import { parseUnits, getAddress, parseEventLogs, type PublicClient } from "viem";
import * as fs from "fs";
import * as path from "path";
import { initZap, revealAndFormat, type Zap } from "./helpers";

const GAME_NAMES = ["CoinFlip", "Dice", "Mines", "Plinko", "RockPaperScissors", "SlotMachine"];

const FUNDING = parseUnits("100000", 18);
const WAGER = parseUnits("10", 18);
const STOP_GAIN = parseUnits("100000", 18);
const STOP_LOSS = 0n;

describe("Confidential Casino (Inco Lightning)", function () {
  let zap: Zap;
  let publicClient: PublicClient;
  let player: `0x${string}`;
  let fee: bigint;

  let usdc: any;
  const games: Record<string, any> = {};

  before(async function () {
    publicClient = (await hre.viem.getPublicClient()) as unknown as PublicClient;
    const chainId = await publicClient.getChainId();
    zap = await initZap(chainId);
    const [wallet] = await hre.viem.getWalletClients();
    player = wallet.account.address;

    if (chainId === 31337) {
      // Local node: deploy + fund fresh.
      usdc = await hre.viem.deployContract("MockUSDC");
      for (const name of GAME_NAMES) {
        const game = await hre.viem.deployContract(name, [usdc.address]);
        const aTx = await usdc.write.approve([game.address, FUNDING]);
        await publicClient.waitForTransactionReceipt({ hash: aTx });
        for (let i = 0; i < 30; i++) {
          const allowed = (await usdc.read.allowance([player, game.address])) as bigint;
          if (allowed >= FUNDING) break;
          await new Promise((r) => setTimeout(r, 2000));
        }
        const iTx = await game.write.initialize([FUNDING]);
        await publicClient.waitForTransactionReceipt({ hash: iTx });
        games[name] = game;
      }
    } else {
      // Live network: reuse the already-deployed + funded contracts.
      const file = path.join(__dirname, "..", "deployments", `${hre.network.name}.json`);
      const dep = JSON.parse(fs.readFileSync(file, "utf8"));
      usdc = await hre.viem.getContractAt("MockUSDC", dep.MockUSDC);
      for (const name of GAME_NAMES) {
        games[name] = await hre.viem.getContractAt(name, dep.games[name]);
      }
    }

    try {
      fee = (await games.CoinFlip.read.getFee()) as bigint;
    } catch {
      fee = 1000000000000n; // devnet fee fallback
    }
  });

  async function approveAndNextId(game: any, wager: bigint): Promise<bigint> {
    const aTx = await usdc.write.approve([game.address, wager]);
    await publicClient.waitForTransactionReceipt({ hash: aTx });
    // Public RPCs are load-balanced; poll until the allowance is visible.
    for (let i = 0; i < 30; i++) {
      const allowed = (await usdc.read.allowance([player, game.address])) as bigint;
      if (allowed >= wager) break;
      await new Promise((r) => setTimeout(r, 2000));
    }
    return (await game.read.nextGameId()) as bigint;
  }

  const ZERO32 = ("0x" + "00".repeat(32)) as `0x${string}`;

  // Poll getGame until the play tx is visible on the queried replica (RPC lag).
  async function seedOf(game: any, gameId: bigint): Promise<`0x${string}`> {
    for (let i = 0; i < 30; i++) {
      const pending = await game.read.getGame([gameId]);
      const h = pending.seed as `0x${string}`;
      if (h !== ZERO32) return h;
      await new Promise((r) => setTimeout(r, 2000));
    }
    return ZERO32;
  }

  // Full play -> reveal -> settle, returns the payout from the BetSettled event
  // (authoritative; balance-delta reads are unreliable on a laggy public RPC).
  async function settleGame(game: any, gameId: bigint): Promise<bigint> {
    const seedHandle = await seedOf(game, gameId);
    const { attestation, signatures } = await revealAndFormat(zap, seedHandle);

    const sTx = await game.write.settle([gameId, attestation, signatures]);
    const receipt = await publicClient.waitForTransactionReceipt({ hash: sTx });

    const logs = parseEventLogs({ abi: game.abi, eventName: "BetSettled", logs: receipt.logs });
    expect(logs.length).to.equal(1);
    return (logs[0] as any).args.payout as bigint;
  }

  it("CoinFlip: places a bet and settles via attestation", async function () {
    const game = games.CoinFlip;
    const liabilityBefore = (await game.read.totalActiveLiability()) as bigint;
    const gameId = await approveAndNextId(game, WAGER);

    const pTx = await game.write.play([WAGER, true, 1, STOP_GAIN, STOP_LOSS], { value: fee });
    await publicClient.waitForTransactionReceipt({ hash: pTx });

    // Liability reserved while pending (poll for RPC visibility).
    let pending = liabilityBefore;
    for (let i = 0; i < 30; i++) {
      pending = (await game.read.totalActiveLiability()) as bigint;
      if (pending > liabilityBefore) break;
      await new Promise((r) => setTimeout(r, 2000));
    }
    expect(pending > liabilityBefore).to.equal(true);

    const payout = await settleGame(game, gameId);
    expect(payout === 0n || payout === (WAGER * 19800n) / 10000n).to.equal(true);

    // Liability released after settle (poll for RPC visibility).
    let after = pending;
    for (let i = 0; i < 30; i++) {
      after = (await game.read.totalActiveLiability()) as bigint;
      if (after === liabilityBefore) break;
      await new Promise((r) => setTimeout(r, 2000));
    }
    expect(after).to.equal(liabilityBefore);
  });

  it("Dice: places a bet and settles via attestation", async function () {
    const game = games.Dice;
    const gameId = await approveAndNextId(game, WAGER);
    const pTx = await game.write.play([50, true, WAGER], { value: fee });
    await publicClient.waitForTransactionReceipt({ hash: pTx });

    const payout = await settleGame(game, gameId);
    const winPayout = (((WAGER * 100n) / 50n) * 98n) / 100n;
    expect(payout === 0n || payout === winPayout).to.equal(true);
  });

  it("Mines: places a bet and settles via attestation", async function () {
    const game = games.Mines;
    const points = [
      [1, 2],
      [0, 4],
      [3, 1],
    ];
    const numMines = 4;
    const gameId = await approveAndNextId(game, WAGER);
    const pTx = await game.write.play([points, numMines, WAGER], { value: fee });
    await publicClient.waitForTransactionReceipt({ hash: pTx });

    const payout = await settleGame(game, gameId);
    const winPayout = WAGER * BigInt(points.length * numMines);
    expect(payout === 0n || payout === winPayout).to.equal(true);
  });

  it("Plinko: places a bet and settles via attestation", async function () {
    const game = games.Plinko;
    const gameId = await approveAndNextId(game, WAGER);
    const pTx = await game.write.play([WAGER], { value: fee });
    await publicClient.waitForTransactionReceipt({ hash: pTx });

    const payout = await settleGame(game, gameId);
    expect(payout <= WAGER * 16n).to.equal(true);
  });

  it("RockPaperScissors: places a bet and settles via attestation", async function () {
    const game = games.RockPaperScissors;
    const gameId = await approveAndNextId(game, WAGER);
    const pTx = await game.write.play([WAGER, 0, 1, STOP_GAIN, STOP_LOSS], { value: fee });
    await publicClient.waitForTransactionReceipt({ hash: pTx });

    const payout = await settleGame(game, gameId);
    expect(payout === 0n || payout === WAGER || payout === (WAGER * 7n) / 4n).to.equal(true);
  });

  it("SlotMachine: places a bet and settles via attestation", async function () {
    const game = games.SlotMachine;
    const gameId = await approveAndNextId(game, WAGER);
    const pTx = await game.write.play([WAGER], { value: fee });
    await publicClient.waitForTransactionReceipt({ hash: pTx });

    const payout = await settleGame(game, gameId);
    expect(payout <= (WAGER * 21n) / 4n).to.equal(true);
  });

  describe("CasinoBase safety", function () {
    it("rejects a second settlement of the same game", async function () {
      const game = games.Dice;
      const gameId = await approveAndNextId(game, WAGER);
      const pTx = await game.write.play([50, true, WAGER], { value: fee });
      await publicClient.waitForTransactionReceipt({ hash: pTx });

      const { attestation, signatures } = await revealAndFormat(zap, await seedOf(game, gameId));
      const sTx = await game.write.settle([gameId, attestation, signatures]);
      await publicClient.waitForTransactionReceipt({ hash: sTx });

      // Poll until the first settlement is visible, so the second is simulated
      // against the settled state (else a stale replica won't revert).
      for (let i = 0; i < 30; i++) {
        const g = await game.read.getGame([gameId]);
        if (g.settled === true) break;
        await new Promise((r) => setTimeout(r, 2000));
      }

      await expect(game.write.settle([gameId, attestation, signatures])).to.be.rejected;
    });

    it("rejects an attestation whose handle does not match the game seed", async function () {
      const game = games.Dice;
      const gameId = await approveAndNextId(game, WAGER);
      const pTx = await game.write.play([50, true, WAGER], { value: fee });
      await publicClient.waitForTransactionReceipt({ hash: pTx });

      const { attestation, signatures } = await revealAndFormat(zap, await seedOf(game, gameId));
      const badHandle = ("0x" + "11".repeat(32)) as `0x${string}`;
      const bad = { handle: badHandle, value: attestation.value };
      await expect(game.write.settle([gameId, bad, signatures])).to.be.rejected;
    });

    it("rejects play() before the bankroll is initialized", async function () {
      const fresh = await hre.viem.deployContract("Dice", [usdc.address]);
      const aTx = await usdc.write.approve([fresh.address, WAGER]);
      await publicClient.waitForTransactionReceipt({ hash: aTx });
      await expect(fresh.write.play([50, true, WAGER], { value: fee })).to.be.rejected;
    });

    it("caps owner withdrawal to non-reserved bankroll", async function () {
      const game = games.Plinko;
      const available = (await game.read.availableBankroll()) as bigint;
      await expect(game.write.withdraw([available + parseUnits("1", 18)])).to.be.rejected;
      expect(getAddress(player)).to.be.a("string");
    });
  });
});
