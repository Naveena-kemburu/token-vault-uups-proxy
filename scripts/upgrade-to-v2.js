const { ethers, upgrades } = require("hardhat");

async function main() {
  const [upgrader] = await ethers.getSigners();
  console.log("Upgrading TokenVault to V2 with account:", upgrader.address);

  // Get the proxy address (replace with your deployed proxy address)
  const PROXY_ADDRESS = process.env.PROXY_ADDRESS || "";
  if (!PROXY_ADDRESS) {
    console.error("Please set PROXY_ADDRESS environment variable");
    process.exit(1);
  }

  const TokenVaultV2 = await ethers.getContractFactory("TokenVaultV2");
  console.log("Upgrading TokenVault...");
  
  const tokenVault = await upgrades.upgradeProxy(PROXY_ADDRESS, TokenVaultV2);
  await tokenVault.waitForDeployment();

  console.log("TokenVault upgraded to V2");
  console.log("Proxy address:", await tokenVault.getAddress());
  console.log("New implementation address:", await upgrades.erc1967.getImplementationAddress(await tokenVault.getAddress()));
  console.log("Version:", await tokenVault.getImplementationVersion());

  // Initialize V2 specific functionality
  const YIELD_RATE = 500; // 5%
  const tx = await tokenVault.initializeV2(YIELD_RATE);
  await tx.wait();
  console.log("V2 initialized with yield rate:", YIELD_RATE);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
