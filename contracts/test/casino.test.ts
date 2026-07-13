import { expect } from "chai";
import hre from "hardhat";
import { parseEther, parseEventLogs, type PublicClient, type Hex } from "viem";
import * as fs from "fs";
import * as path from "path";
import { initZap, revealAndFormat, sleep, type Zap } from "./helpers";

const WAGER = parseEther("0.0005"); // MAX_WAGER_PER_ROUND
const FUND = parseEther("0.05");

describe("Casino (Inco Lightning, ETH)", function () {
  let zap: Zap;
  let publicClient: PublicClient;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let casino: any;
  let fee: bigint;

  before(async function () {
    publicClient = (await hre.viem.getPublicClient()) as unknown as PublicClient;
    const chainId = await publicClient.getChainId();
    zap = await initZap(chainId);
    const [wallet] = await hre.viem.getWalletClients();

    if (chainId === 31337) {
      // Local node: deploy + fund fresh.
      casino = await hre.viem.deployContract("Casino");
      const fundTx = await wallet.sendTransaction({ to: casino.address, value: FUND });
      await publicClient.waitForTransactionReceipt({ hash: fundTx });
    } else {
      // Live network: reuse the deployed + funded Casino.
      const file = path.join(__dirname, "..", "deployments", `${hre.network.name}.json`);
      const dep = JSON.parse(fs.readFileSync(file, "utf8"));
      casino = await hre.viem.getContractAt("Casino", dep.Casino);
    }

    try {
      fee = (await casino.read.getFee()) as bigint;
    } catch {
      fee = 1000000000000n;
    }
  });

  // Place a bet (play tx hash), read BetPlaced, reveal, settle, return payout.
  async function settleFrom(playHash: Hex): Promise<bigint> {
    const receipt = await publicClient.waitForTransactionReceipt({ hash: playHash });
    const placed = parseEventLogs({ abi: casino.abi, eventName: "BetPlaced", logs: receipt.logs });
    expect(placed.length).to.equal(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { gameId, seedHandle } = (placed[0] as any).args as { gameId: bigint; seedHandle: Hex };

    const { attestation, signatures } = await revealAndFormat(zap, seedHandle);
    const sTx = await casino.write.settle([gameId, attestation, signatures]);
    const sReceipt = await publicClient.waitForTransactionReceipt({ hash: sTx });
    // Poll until settlement is visible on the queried replica.
    for (let i = 0; i < 30; i++) {
      const g = await casino.read.getGame([gameId]);
      if (g.settled === true) break;
      await sleep(2000);
    }
    const settled = parseEventLogs({ abi: casino.abi, eventName: "BetSettled", logs: sReceipt.logs });
    expect(settled.length).to.equal(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (settled[0] as any).args.payout as bigint;
  }

  const value = (rounds: number) => WAGER * BigInt(rounds) + fee;

  it("CoinFlip: multi-round settles", async function () {
    const rounds = 3;
    const h = await casino.write.playCoinFlip([WAGER, true, rounds], { value: value(rounds) });
    const payout = await settleFrom(h);
    expect(payout <= (WAGER * BigInt(rounds) * 19800n) / 10000n).to.equal(true);
  });

  it("Dice: multi-round settles", async function () {
    const rounds = 2;
    const h = await casino.write.playDice([50, true, WAGER, rounds], { value: value(rounds) });
    const payout = await settleFrom(h);
    const perRound = (((WAGER * 100n) / 50n) * 98n) / 100n;
    expect(payout <= perRound * BigInt(rounds)).to.equal(true);
  });

  it("Mines: single board settles", async function () {
    const points = [
      [1, 2],
      [0, 4],
      [3, 1],
    ];
    const numMines = 4;
    const h = await casino.write.playMines([points, numMines, WAGER], { value: value(1) });
    const payout = await settleFrom(h);
    expect(payout <= WAGER * BigInt(points.length * numMines)).to.equal(true);
  });

  it("Plinko: multi-round settles", async function () {
    const rounds = 2;
    const h = await casino.write.playPlinko([WAGER, rounds], { value: value(rounds) });
    const payout = await settleFrom(h);
    expect(payout <= WAGER * 16n * BigInt(rounds)).to.equal(true);
  });

  it("RockPaperScissors: multi-round settles", async function () {
    const rounds = 2;
    const h = await casino.write.playRPS([0, WAGER, rounds], { value: value(rounds) });
    const payout = await settleFrom(h);
    expect(payout <= (WAGER * BigInt(rounds) * 7n) / 4n).to.equal(true);
  });

  it("SlotMachine: multi-round settles", async function () {
    const rounds = 2;
    const h = await casino.write.playSlots([WAGER, rounds], { value: value(rounds) });
    const payout = await settleFrom(h);
    expect(payout <= ((WAGER * 21n) / 4n) * BigInt(rounds)).to.equal(true);
  });

  describe("safety", function () {
    it("rejects a wager above the per-round cap", async function () {
      const tooHigh = WAGER + 1n;
      await expect(
        casino.write.playCoinFlip([tooHigh, true, 1], { value: tooHigh + fee })
      ).to.be.rejected;
    });

    it("rejects rounds above MAX_ROUNDS", async function () {
      await expect(
        casino.write.playCoinFlip([WAGER, true, 11], { value: WAGER * 11n + fee })
      ).to.be.rejected;
    });

    it("rejects insufficient value (no fee)", async function () {
      await expect(casino.write.playSlots([WAGER, 1], { value: WAGER })).to.be.rejected;
    });

    it("caps owner withdrawal to available bankroll", async function () {
      const available = (await casino.read.availableBankroll()) as bigint;
      await expect(casino.write.withdraw([available + parseEther("1")])).to.be.rejected;
    });
  });
});
