const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("TokenVaultV1", function () {
  let tokenVault;
  let mockToken;
  let owner;
  let user1;
  let user2;
  const DEPOSIT_FEE = 100; // 1%

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy Mock ERC20
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockToken = await MockERC20.deploy();
    await mockToken.waitForDeployment();

    // Deploy TokenVaultV1 as upgradeable proxy
    const TokenVaultV1 = await ethers.getContractFactory("TokenVaultV1");
    tokenVault = await upgrades.deployProxy(
      TokenVaultV1,
      [await mockToken.getAddress(), owner.address, DEPOSIT_FEE],
      { initializer: "initialize", kind: "uups" }
    );
    await tokenVault.waitForDeployment();

    // Mint tokens to users
    await mockToken.mint(user1.address, ethers.parseEther("1000"));
    await mockToken.mint(user2.address, ethers.parseEther("1000"));
  });

  describe("Initialization", function () {
    it("should initialize with correct values", async function () {
      expect(await tokenVault.token()).to.equal(await mockToken.getAddress());
      expect(await tokenVault.getAdmin()).to.equal(owner.address);
      expect(await tokenVault.depositFee()).to.equal(DEPOSIT_FEE);
    });

    it("should grant DEFAULT_ADMIN_ROLE and UPGRADER_ROLE to admin", async function () {
      const DEFAULT_ADMIN_ROLE = await tokenVault.DEFAULT_ADMIN_ROLE();
      const UPGRADER_ROLE = await tokenVault.UPGRADER_ROLE();
      
      expect(await tokenVault.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
      expect(await tokenVault.hasRole(UPGRADER_ROLE, owner.address)).to.be.true;
    });

    it("should have correct implementation version", async function () {
      expect(await tokenVault.getImplementationVersion()).to.equal("V1");
    });
  });

  describe("Deposit Functionality", function () {
    it("should deposit tokens correctly with fee deduction", async function () {
      const depositAmount = ethers.parseEther("100");
      const expectedFee = depositAmount * BigInt(DEPOSIT_FEE) / BigInt(10000);
      const expectedCredit = depositAmount - expectedFee;

      await mockToken.connect(user1).approve(await tokenVault.getAddress(), depositAmount);
      await expect(tokenVault.connect(user1).deposit(depositAmount))
        .to.emit(tokenVault, "Deposited")
        .withArgs(user1.address, expectedCredit, expectedFee);

      expect(await tokenVault.balanceOf(user1.address)).to.equal(expectedCredit);
      expect(await tokenVault.totalDeposits()).to.equal(expectedCredit);
    });

    it("should revert if amount is zero", async function () {
      await expect(tokenVault.connect(user1).deposit(0))
        .to.be.revertedWith("Amount must be greater than 0");
    });

    it("should revert if insufficient allowance", async function () {
      const depositAmount = ethers.parseEther("100");
      await expect(tokenVault.connect(user1).deposit(depositAmount))
        .to.be.reverted;
    });

    it("should handle multiple deposits correctly", async function () {
      const depositAmount = ethers.parseEther("50");
      const expectedFee = depositAmount * BigInt(DEPOSIT_FEE) / BigInt(10000);
      const expectedCredit = depositAmount - expectedFee;

      await mockToken.connect(user1).approve(await tokenVault.getAddress(), depositAmount * BigInt(2));
      await tokenVault.connect(user1).deposit(depositAmount);
      await tokenVault.connect(user1).deposit(depositAmount);

      expect(await tokenVault.balanceOf(user1.address)).to.equal(expectedCredit * BigInt(2));
    });
  });

  describe("Withdraw Functionality", function () {
    beforeEach(async function () {
      const depositAmount = ethers.parseEther("100");
      await mockToken.connect(user1).approve(await tokenVault.getAddress(), depositAmount);
      await tokenVault.connect(user1).deposit(depositAmount);
    });

    it("should withdraw tokens correctly", async function () {
      const userBalance = await tokenVault.balanceOf(user1.address);
      const withdrawAmount = userBalance / BigInt(2);

      await expect(tokenVault.connect(user1).withdraw(withdrawAmount))
        .to.emit(tokenVault, "Withdrawn")
        .withArgs(user1.address, withdrawAmount);

      expect(await tokenVault.balanceOf(user1.address)).to.equal(userBalance - withdrawAmount);
    });

    it("should revert if amount is zero", async function () {
      await expect(tokenVault.connect(user1).withdraw(0))
        .to.be.revertedWith("Amount must be greater than 0");
    });

    it("should revert if insufficient balance", async function () {
      const userBalance = await tokenVault.balanceOf(user1.address);
      await expect(tokenVault.connect(user1).withdraw(userBalance + BigInt(1)))
        .to.be.revertedWith("Insufficient balance");
    });

    it("should update totalDeposits correctly after withdrawal", async function () {
      const userBalance = await tokenVault.balanceOf(user1.address);
      const totalBefore = await tokenVault.totalDeposits();
      
      await tokenVault.connect(user1).withdraw(userBalance);
      
      expect(await tokenVault.totalDeposits()).to.equal(totalBefore - userBalance);
    });
  });

  describe("View Functions", function () {
    it("should return correct balance for user", async function () {
      expect(await tokenVault.balanceOf(user1.address)).to.equal(0);
      
      const depositAmount = ethers.parseEther("100");
      const expectedFee = depositAmount * BigInt(DEPOSIT_FEE) / BigInt(10000);
      const expectedCredit = depositAmount - expectedFee;
      
      await mockToken.connect(user1).approve(await tokenVault.getAddress(), depositAmount);
      await tokenVault.connect(user1).deposit(depositAmount);
      
      expect(await tokenVault.balanceOf(user1.address)).to.equal(expectedCredit);
    });

    it("should return correct total deposits", async function () {
      const depositAmount = ethers.parseEther("100");
      const expectedFee = depositAmount * BigInt(DEPOSIT_FEE) / BigInt(10000);
      const expectedCredit = depositAmount - expectedFee;

      await mockToken.connect(user1).approve(await tokenVault.getAddress(), depositAmount);
      await tokenVault.connect(user1).deposit(depositAmount);

      await mockToken.connect(user2).approve(await tokenVault.getAddress(), depositAmount);
      await tokenVault.connect(user2).deposit(depositAmount);

      expect(await tokenVault.totalDeposits()).to.equal(expectedCredit * BigInt(2));
    });

    it("should return correct deposit fee", async function () {
      expect(await tokenVault.getDepositFee()).to.equal(DEPOSIT_FEE);
    });
  });

  describe("Access Control", function () {
    it("should only allow UPGRADER_ROLE to authorize upgrades", async function () {
      const TokenVaultV2 = await ethers.getContractFactory("TokenVaultV2");
      
      await expect(
        upgrades.upgradeProxy(await tokenVault.getAddress(), TokenVaultV2.connect(user1))
      ).to.be.reverted;
    });

    it("should allow admin to upgrade", async function () {
      const TokenVaultV2 = await ethers.getContractFactory("TokenVaultV2");
      const upgraded = await upgrades.upgradeProxy(await tokenVault.getAddress(), TokenVaultV2);
      expect(await upgraded.getImplementationVersion()).to.equal("V2");
    });
  });
});
