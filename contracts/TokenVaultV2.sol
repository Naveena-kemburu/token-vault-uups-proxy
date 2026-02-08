// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./TokenVaultV1.sol";

/// @title TokenVaultV2
/// @notice Upgraded version with yield rate and pause functionality
contract TokenVaultV2 is TokenVaultV1 {
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    
    uint256 public yieldRate;
    bool public depositsPaused;
    
    mapping(address => uint256) public lastYieldClaim;
    mapping(address => uint256) public accumulatedYield;
    
    event YieldRateSet(uint256 newRate);
    event YieldClaimed(address indexed user, uint256 amount);
    event DepositsPaused();
    event DepositsUnpaused();
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /// @notice Initialize TokenVaultV2 with yield rate
    /// @param _yieldRate The yield rate in basis points
    function initializeV2(uint256 _yieldRate) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        
        yieldRate = _yieldRate;
        _grantRole(PAUSER_ROLE, msg.sender);
    }
    
    /// @notice Override deposit to update yield tracking
    /// @param amount The amount of tokens to deposit
    function deposit(uint256 amount) external override {
        require(!depositsPaused, "Deposits are paused");
        require(amount > 0, "Amount must be greater than 0");
        
        // Update accumulated yield before resetting claim time
        if (balances[msg.sender] > 0) {
            uint256 timeElapsed = block.timestamp - lastYieldClaim[msg.sender];
            uint256 newYield = (balances[msg.sender] * yieldRate * timeElapsed) / (365 days * 10000);
            accumulatedYield[msg.sender] += newYield;
        }
        
        uint256 fee = (amount * depositFee) / 10000;
        uint256 creditAmount = amount - fee;
        
        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        balances[msg.sender] += creditAmount;
        totalDeposits += creditAmount;
        lastYieldClaim[msg.sender] = block.timestamp;
        
        emit Deposited(msg.sender, creditAmount, fee);
    }
    
    /// @notice Set yield rate
    /// @param _yieldRate The new yield rate in basis points
    function setYieldRate(uint256 _yieldRate) external onlyRole(DEFAULT_ADMIN_ROLE) {
        yieldRate = _yieldRate;
        emit YieldRateSet(_yieldRate);
    }
    
    /// @notice Get yield rate
    /// @return The current yield rate
    function getYieldRate() external view returns (uint256) {
        return yieldRate;
    }
    
    /// @notice Get user yield
    /// @param user The user address
    /// @return The user's current yield
    function getUserYield(address user) external view returns (uint256) {
        if (balances[user] == 0) return accumulatedYield[user];
        
        uint256 timeElapsed = block.timestamp - lastYieldClaim[user];
        uint256 yield = (balances[user] * yieldRate * timeElapsed) / (365 days * 10000);
        return accumulatedYield[user] + yield;
    }
    
    /// @notice Claim yield
    /// @return The amount of yield claimed
    function claimYield() external returns (uint256) {
        uint256 timeElapsed = block.timestamp - lastYieldClaim[msg.sender];
        uint256 newYield = (balances[msg.sender] * yieldRate * timeElapsed) / (365 days * 10000);
        uint256 totalYield = accumulatedYield[msg.sender] + newYield;
        
        require(totalYield > 0, "No yield to claim");
        
        // Update state before external call (Checks-Effects-Interactions)
        accumulatedYield[msg.sender] = 0;
        lastYieldClaim[msg.sender] = block.timestamp;
        balances[msg.sender] -= totalYield;
        totalDeposits -= totalYield;
        
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
    /// @return True if deposits are paused, false otherwise
    function isDepositsPaused() external view returns (bool) {
        return depositsPaused;
    }
    
    /// @notice Get implementation version
    /// @return The version string
    function getImplementationVersion() external pure override returns (string memory) {
        return "V2";
    }
    
    /// @notice Authorize upgrade
    /// @param newImplementation The address of the new implementation
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}
    
    /// @notice Storage gap for future versions
    uint256[49] private __gap;
}
