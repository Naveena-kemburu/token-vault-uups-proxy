const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Upgrade V2 to V3", function () {
  let tokenVault;
  let mockToken;
  let owner, user1;
  const DEPOSIT_FEE = 100;
  const YIELD_RATE = 500;
  const WITHDRAWAL_DELAY = 86400; // 1 day

  beforeEach(async function () {
    [owner, user1] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockToken = await MockERC20.deploy();
    await mockToken.waitForDeployment();

    const TokenVaultV1 = await ethers.getContractFactory("TokenVaultV1");
    tokenVault = await upgrades.deployProxy(
      TokenVaultV1,
      [await mockToken.getAddress(), owner.address, DEPOSIT_FEE],
      { initializer: "initialize", kind: "uups" }
    );

    const TokenVaultV2 = await ethers.getContractFactory("TokenVaultV2");
    tokenVault = await upgrades.upgradeProxy(await tokenVault.getAddress(), TokenVaultV2);
    await tokenVault.initializeV2(YIELD_RATE);

    await mockToken.mint(user1.address, ethers.parseEther("1000"));
  });

  describe("V3 Withdrawal Delay Functionality", function () {
    beforeEach(async function () {
      const TokenVaultV3 = await ethers.getContractFactory("TokenVaultV3");
      tokenVault = await upgrades.upgradeProxy(await tokenVault.getAddress(), TokenVaultV3);
      await tokenVault.initializeV3(WITHDRAWAL_DELAY);

      const depositAmount = ethers.parseEther("100");
      await mockToken.connect(user1).approve(await tokenVault.getAddress(), depositAmount);
      await tokenVault.connect(user1).deposit(depositAmount);
    });

    it("should have correct version after upgrade", async function () {
      expect(await tokenVault.getImplementationVersion()).to.equal("V3");
    });

    it("should request withdrawal correctly", async function () {
      const withdrawAmount = ethers.parseEther("50");
      await tokenVault.connect(user1).requestWithdrawal(withdrawAmount);

      const request = await tokenVault.getWithdrawalRequest(user1.address);
      expect(request[0]).to.equal(withdrawAmount);
    });

    it("should enforce withdrawal delay", async function () {
      const withdrawAmount = ethers.parseEther("50");
      await tokenVault.connect(user1).requestWithdrawal(withdrawAmount);

      await expect(tokenVault.connect(user1).executeWithdrawal())
        .to.be.revertedWith("Withdrawal delay not met");
    });

    it("should allow withdrawal after delay", async function () {
      const withdrawAmount = ethers.parseEther("50");
      await tokenVault.connect(user1).requestWithdrawal(withdrawAmount);

      await ethers.provider.send("evm_increaseTime", [WITHDRAWAL_DELAY + 1]);
      await ethers.provider.send("evm_mine");

      await tokenVault.connect(user1).executeWithdrawal();
      expect(await tokenVault.balanceOf(user1.address)).to.be.lessThan(ethers.parseEther("99"));
    });

    it("should allow admin emergency withdrawal", async function () {
      const balanceBefore = await tokenVault.balanceOf(user1.address);
      await tokenVault.emergencyWithdraw(user1.address);
      expect(await tokenVault.balanceOf(user1.address)).to.equal(0);
    });
  });
});
