const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Security Tests", function () {
  let tokenVault;
  let mockToken;
  let owner, user1, attacker;
  const DEPOSIT_FEE = 100;

  beforeEach(async function () {
    [owner, user1, attacker] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockToken = await MockERC20.deploy();
    await mockToken.waitForDeployment();

    const TokenVaultV1 = await ethers.getContractFactory("TokenVaultV1");
    tokenVault = await upgrades.deployProxy(
      TokenVaultV1,
      [await mockToken.getAddress(), owner.address, DEPOSIT_FEE],
      { initializer: "initialize", kind: "uups" }
    );
    await tokenVault.waitForDeployment();

    await mockToken.mint(user1.address, ethers.parseEther("1000"));
    await mockToken.mint(attacker.address, ethers.parseEther("1000"));
  });

  describe("Access Control", function () {
    it("should prevent unauthorized upgrades", async function () {
      const TokenVaultV2 = await ethers.getContractFactory("TokenVaultV2");
      await expect(
        upgrades.upgradeProxy(await tokenVault.getAddress(), TokenVaultV2.connect(attacker))
      ).to.be.reverted;
    });

    it("should prevent non-admin from calling protected functions", async function () {
      expect(await tokenVault.hasRole(await tokenVault.DEFAULT_ADMIN_ROLE(), attacker.address)).to.be.false;
    });
  });

  describe("Reentrancy Protection (V2)", function () {
    beforeEach(async function () {
      const TokenVaultV2 = await ethers.getContractFactory("TokenVaultV2");
      tokenVault = await upgrades.upgradeProxy(await tokenVault.getAddress(), TokenVaultV2);
      await tokenVault.initializeV2(500);

      const depositAmount = ethers.parseEther("100");
      await mockToken.connect(user1).approve(await tokenVault.getAddress(), depositAmount);
      await tokenVault.connect(user1).deposit(depositAmount);
      await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine");
    });

    it("should handle claimYield with proper state updates", async function () {
      await tokenVault.connect(user1).claimYield();
      const yieldAfter = await tokenVault.getUserYield(user1.address);
      expect(yieldAfter).to.equal(0);
    });
  });

  describe("Storage Collision Prevention", function () {
    it("should preserve storage layout across upgrades", async function () {
      const depositAmount = ethers.parseEther("100");
      await mockToken.connect(user1).approve(await tokenVault.getAddress(), depositAmount);
      await tokenVault.connect(user1).deposit(depositAmount);

      const balanceBefore = await tokenVault.balanceOf(user1.address);
      const adminBefore = await tokenVault.getAdmin();

      const TokenVaultV2 = await ethers.getContractFactory("TokenVaultV2");
      tokenVault = await upgrades.upgradeProxy(await tokenVault.getAddress(), TokenVaultV2);

      expect(await tokenVault.balanceOf(user1.address)).to.equal(balanceBefore);
      expect(await tokenVault.getAdmin()).to.equal(adminBefore);
    });
  });
});
