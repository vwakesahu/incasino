import hre from "hardhat";
import { parseUnits, formatUnits } from "viem";
import * as fs from "fs";
import * as path from "path";

const GAME_NAMES = [
  "CoinFlip",
  "Dice",
  "Mines",
  "Plinko",
  "RockPaperScissors",
  "SlotMachine",
] as const;

const HOUSE_FUNDING = parseUnits("100000", 18);

async function main() {
  const networkName = hre.network.name;
  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();

  console.log("──────────────────────────────────────────────");
  console.log(`Network : ${networkName}`);
  console.log(`Deployer: ${deployer.account.address}`);
  console.log("──────────────────────────────────────────────");

  const usdc = await hre.viem.deployContract("MockUSDC");
  console.log(`MockUSDC          : ${usdc.address}`);

  const games: Record<string, `0x${string}`> = {};
  for (const name of GAME_NAMES) {
    const game = await hre.viem.deployContract(name, [usdc.address]);
    games[name] = game.address;
    console.log(`${name.padEnd(18)}: ${game.address}`);
  }

  console.log("──────────────────────────────────────────────");
  console.log(`Funding each game with ${formatUnits(HOUSE_FUNDING, 18)} USDC...`);
  const owner = deployer.account.address;
  for (const name of GAME_NAMES) {
    const gameAddr = games[name];
    const approveTx = await usdc.write.approve([gameAddr, HOUSE_FUNDING]);
    await publicClient.waitForTransactionReceipt({ hash: approveTx });

    // Public RPCs are load-balanced; poll until the allowance is visible.
    for (let i = 0; i < 30; i++) {
      const allowed = (await usdc.read.allowance([owner, gameAddr])) as bigint;
      if (allowed >= HOUSE_FUNDING) break;
      await new Promise((r) => setTimeout(r, 2000));
    }

    const game = await hre.viem.getContractAt(name, gameAddr);
    const initTx = await game.write.initialize([HOUSE_FUNDING]);
    await publicClient.waitForTransactionReceipt({ hash: initTx });
    console.log(`  ${name} funded + initialized`);
  }

  const out = {
    network: networkName,
    chainId: hre.network.config.chainId,
    deployer: deployer.account.address,
    MockUSDC: usdc.address,
    games,
    timestamp: new Date().toISOString(),
  };
  const dir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${networkName}.json`);
  fs.writeFileSync(file, JSON.stringify(out, null, 2));

  console.log("──────────────────────────────────────────────");
  console.log(`Saved deployment to ${file}`);
  console.log("All contracts deployed, funded, and initialized.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
