// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title TokenVaultV2
/// @notice Upgraded version with yield rate and pause functionality
contract TokenVaultV2 is UUPSUpgradeable, AccessControlUpgradeable {
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    
    IERC20 public token;
    address public admin;
    uint256 public depositFee;
    uint256 public yieldRate;
    bool public depositsPaused;
    
    mapping(address => uint256) public balances;
    mapping(address => uint256) public lastYieldClaim;
    mapping(address => uint256) public accumulatedYield;
    uint256 public totalDeposits;
    uint256 public __gap1;
    
    event YieldRateSet(uint256 newRate);
    event YieldClaimed(address indexed user, uint256 amount);
    event DepositsPaused();
    event DepositsUnpaused();
    
    /// @notice Get total deposits
    function totalDeposits() external view returns (uint256) {
        return totalDeposits;
    }
    
    /// @notice Deposit tokens into the vault
    function deposit(uint256 amount) external {
        require(!depositsPaused, "Deposits are paused");
        require(amount > 0, "Amount must be greater than 0");
        
        uint256 fee = (amount * depositFee) / 10000;
        uint256 creditAmount = amount - fee;
        
        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        balances[msg.sender] += creditAmount;
        totalDeposits += creditAmount;
        lastYieldClaim[msg.sender] = block.timestamp;
    }
    
    /// @notice Withdraw tokens from the vault
    function withdraw(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        balances[msg.sender] -= amount;
        totalDeposits -= amount;
        
        require(token.transfer(msg.sender, amount), "Transfer failed");
    }
    
    /// @notice Get user balance
    function balanceOf(address user) external view returns (uint256) {
        return balances[user];
    }
    
    /// @notice Get deposit fee
    function getDepositFee() external view returns (uint256) {
        return depositFee;
    }
    
    /// @notice Set yield rate
    function setYieldRate(uint256 _yieldRate) external onlyRole(DEFAULT_ADMIN_ROLE) {
        yieldRate = _yieldRate;
        emit YieldRateSet(_yieldRate);
    }
    
    /// @notice Get yield rate
    function getYieldRate() external view returns (uint256) {
        return yieldRate;
    }
    
    /// @notice Get user yield
    function getUserYield(address user) external view returns (uint256) {
        if (balances[user] == 0) return accumulatedYield[user];
        
        uint256 timeElapsed = block.timestamp - lastYieldClaim[user];
        uint256 yield = (balances[user] * yieldRate * timeElapsed) / (365 days * 10000);
        return accumulatedYield[user] + yield;
    }
    
    /// @notice Claim yield
    function claimYield() external returns (uint256) {
        uint256 timeElapsed = block.timestamp - lastYieldClaim[msg.sender];
        uint256 newYield = (balances[msg.sender] * yieldRate * timeElapsed) / (365 days * 10000);
        uint256 totalYield = accumulatedYield[msg.sender] + newYield;
        
        require(totalYield > 0, "No yield to claim");
        
        accumulatedYield[msg.sender] = 0;
        lastYieldClaim[msg.sender] = block.timestamp;
        
        require(token.transfer(msg.sender, totalYield), "Transfer failed");
        emit YieldClaimed(msg.sender, totalYield);
        return totalYield;
    }
    
    /// @notice Pause deposits
    function pauseDeposits() external onlyRole(PAUSER_ROLE) {
        depositsPaused = true;
        emit DepositsPaused();
    }
    
    /// @notice Unpause deposits
    function unpauseDeposits() external onlyRole(PAUSER_ROLE) {
        depositsPaused = false;
        emit DepositsUnpaused();
    }
    
    /// @notice Check if deposits are paused
    function isDepositsPaused() external view returns (bool) {
        return depositsPaused;
    }
    
    /// @notice Get implementation version
    function getImplementationVersion() external pure returns (string memory) {
        return "V2";
    }
    
    /// @notice Authorize upgrade
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}
}
