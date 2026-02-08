const { ethers, upgrades } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying TokenVaultV1 with account:", deployer.address);

  // Deploy MockERC20 for testing
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const mockToken = await MockERC20.deploy();
  await mockToken.waitForDeployment();
  console.log("MockERC20 deployed to:", await mockToken.getAddress());

  // Deploy TokenVaultV1 as upgradeable proxy
  const TokenVaultV1 = await ethers.getContractFactory("TokenVaultV1");
  const DEPOSIT_FEE = 100; // 1%
  
  const tokenVault = await upgrades.deployProxy(
    TokenVaultV1,
    [await mockToken.getAddress(), deployer.address, DEPOSIT_FEE],
    { initializer: "initialize", kind: "uups" }
  );
  await tokenVault.waitForDeployment();

  console.log("TokenVaultV1 Proxy deployed to:", await tokenVault.getAddress());
  console.log("TokenVaultV1 Implementation deployed to:", await upgrades.erc1967.getImplementationAddress(await tokenVault.getAddress()));
  console.log("Admin address:", await tokenVault.getAdmin());
  console.log("Deposit fee:", await tokenVault.depositFee());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
