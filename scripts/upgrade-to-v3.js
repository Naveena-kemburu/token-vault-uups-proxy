const { ethers, upgrades } = require("hardhat");

async function main() {
  const [upgrader] = await ethers.getSigners();
  console.log("Upgrading TokenVault to V3 with account:", upgrader.address);

  const PROXY_ADDRESS = process.env.PROXY_ADDRESS || "";
  if (!PROXY_ADDRESS) {
    console.error("Please set PROXY_ADDRESS environment variable");
    process.exit(1);
  }

  const TokenVaultV3 = await ethers.getContractFactory("TokenVaultV3");
  console.log("Upgrading TokenVault to V3...");
  
  const tokenVault = await upgrades.upgradeProxy(PROXY_ADDRESS, TokenVaultV3);
  await tokenVault.waitForDeployment();

  console.log("TokenVault upgraded to V3");
  console.log("Proxy address:", await tokenVault.getAddress());
  console.log("New implementation address:", await upgrades.erc1967.getImplementationAddress(await tokenVault.getAddress()));
  console.log("Version:", await tokenVault.getImplementationVersion());

  // Initialize V3 with withdrawal delay
  const WITHDRAWAL_DELAY = 86400; // 1 day in seconds
  const tx = await tokenVault.initializeV3(WITHDRAWAL_DELAY);
  await tx.wait();
  console.log("V3 initialized with withdrawal delay:", WITHDRAWAL_DELAY, "seconds");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
