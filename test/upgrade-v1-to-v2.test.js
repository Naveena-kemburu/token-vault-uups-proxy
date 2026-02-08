const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Upgrade V1 to V2", function () {
  let tokenVault;
  let mockToken;
  let owner;
  let user1;
  const DEPOSIT_FEE = 100;
  const YIELD_RATE = 500; // 5%

  beforeEach(async function () {
    [owner, user1] = await ethers.getSigners();

    // Deploy Mock ERC20
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockToken = await MockERC20.deploy();
    await mockToken.waitForDeployment();

    // Deploy V1
    const TokenVaultV1 = await ethers.getContractFactory("TokenVaultV1");
    tokenVault = await upgrades.deployProxy(
      TokenVaultV1,
      [await mockToken.getAddress(), owner.address, DEPOSIT_FEE],
      { initializer: "initialize", kind: "uups" }
    );
    await tokenVault.waitForDeployment();

    // Mint tokens
    await mockToken.mint(user1.address, ethers.parseEther("1000"));
  });

  describe("State Preservation During Upgrade", function () {
    it("should preserve balances after upgrade", async function () {
      const depositAmount = ethers.parseEther("100");
      await mockToken.connect(user1).approve(await tokenVault.getAddress(), depositAmount);
      await tokenVault.connect(user1).deposit(depositAmount);

      const balanceBefore = await tokenVault.balanceOf(user1.address);

      // Upgrade to V2
      const TokenVaultV2 = await ethers.getContractFactory("TokenVaultV2");
      const upgraded = await upgrades.upgradeProxy(await tokenVault.getAddress(), TokenVaultV2);

      expect(await upgraded.balanceOf(user1.address)).to.equal(balanceBefore);
    });

    it("should preserve total deposits after upgrade", async function () {
      const depositAmount = ethers.parseEther("100");
      await mockToken.connect(user1).approve(await tokenVault.getAddress(), depositAmount);
      await tokenVault.connect(user1).deposit(depositAmount);

      const totalBefore = await tokenVault.totalDeposits();

      const TokenVaultV2 = await ethers.getContractFactory("TokenVaultV2");
      const upgraded = await upgrades.upgradeProxy(await tokenVault.getAddress(), TokenVaultV2);

      expect(await upgraded.totalDeposits()).to.equal(totalBefore);
    });

    it("should preserve admin and roles after upgrade", async function () {
      const TokenVaultV2 = await ethers.getContractFactory("TokenVaultV2");
      const upgraded = await upgrades.upgradeProxy(await tokenVault.getAddress(), TokenVaultV2);

      expect(await upgraded.getAdmin()).to.equal(owner.address);
      const UPGRADER_ROLE = await upgraded.UPGRADER_ROLE();
      expect(await upgraded.hasRole(UPGRADER_ROLE, owner.address)).to.be.true;
    });
  });

  describe("New V2 Functionality", function () {
    beforeEach(async function () {
      const TokenVaultV2 = await ethers.getContractFactory("TokenVaultV2");
      tokenVault = await upgrades.upgradeProxy(await tokenVault.getAddress(), TokenVaultV2);
      
      await tokenVault.initializeV2(YIELD_RATE);
    });

    it("should have correct version after upgrade", async function () {
      expect(await tokenVault.getImplementationVersion()).to.equal("V2");
    });

    it("should set yield rate correctly", async function () {
      expect(await tokenVault.getYieldRate()).to.equal(YIELD_RATE);
    });

    it("should have PAUSER_ROLE", async function () {
      const PAUSER_ROLE = await tokenVault.PAUSER_ROLE();
      expect(await tokenVault.hasRole(PAUSER_ROLE, owner.address)).to.be.true;
    });

    it("should allow pausing deposits", async function () {
      await tokenVault.pauseDeposits();
      expect(await tokenVault.isDepositsPaused()).to.be.true;

      const depositAmount = ethers.parseEther("100");
      await mockToken.connect(user1).approve(await tokenVault.getAddress(), depositAmount);
      await expect(tokenVault.connect(user1).deposit(depositAmount))
        .to.be.revertedWith("Deposits are paused");
    });

    it("should calculate yield correctly", async function () {
      const depositAmount = ethers.parseEther("100");
      const expectedFee = depositAmount * BigInt(DEPOSIT_FEE) / BigInt(10000);
      const expectedCredit = depositAmount - expectedFee;

      await mockToken.connect(user1).approve(await tokenVault.getAddress(), depositAmount);
      await tokenVault.connect(user1).deposit(depositAmount);

      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine");

      const userYield = await tokenVault.getUserYield(user1.address);
      const expectedYield = expectedCredit * BigInt(YIELD_RATE) / BigInt(10000);
      
      expect(userYield).to.be.closeTo(expectedYield, ethers.parseEther("0.01"));
    });
  });
});
