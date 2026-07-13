import hre from "hardhat";
import { parseEther, formatEther } from "viem";
import * as fs from "fs";
import * as path from "path";

// Small bankroll (limited testnet ETH). Override with BANKROLL_ETH.
const BANKROLL = parseEther(process.env.BANKROLL_ETH || "0.05");

async function main() {
  const networkName = hre.network.name;
  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();

  console.log("──────────────────────────────────────────────");
  console.log(`Network : ${networkName}`);
  console.log(`Deployer: ${deployer.account.address}`);
  console.log("──────────────────────────────────────────────");

  const casino = await hre.viem.deployContract("Casino");
  console.log(`Casino  : ${casino.address}`);

  // Fund the bankroll (receive() accepts ETH).
  const tx = await deployer.sendTransaction({ to: casino.address, value: BANKROLL });
  await publicClient.waitForTransactionReceipt({ hash: tx });
  console.log(`Bankroll: ${formatEther(BANKROLL)} ETH`);

  const out = {
    network: networkName,
    chainId: hre.network.config.chainId,
    deployer: deployer.account.address,
    Casino: casino.address,
    timestamp: new Date().toISOString(),
  };
  const dir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${networkName}.json`);
  fs.writeFileSync(file, JSON.stringify(out, null, 2));

  console.log("──────────────────────────────────────────────");
  console.log(`Saved deployment to ${file}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
