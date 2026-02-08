// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./TokenVaultV2.sol";

/// @title TokenVaultV3
/// @notice Third version with withdrawal delay mechanism
contract TokenVaultV3 is TokenVaultV2 {
    uint256 public withdrawalDelay;
    
    struct WithdrawalRequest {
        uint256 amount;
        uint256 requestTime;
        bool executed;
    }
    
    mapping(address => WithdrawalRequest) public withdrawalRequests;
    
    event WithdrawalRequested(address indexed user, uint256 amount, uint256 executionTime);
    event WithdrawalExecuted(address indexed user, uint256 amount);
    event WithdrawalDelaySet(uint256 newDelay);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /// @notice Initialize TokenVaultV3 with withdrawal delay
    /// @param _withdrawalDelay The withdrawal delay in seconds
    function initializeV3(uint256 _withdrawalDelay) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        withdrawalDelay = _withdrawalDelay;
    }
    
    /// @notice Set withdrawal delay
    /// @param _withdrawalDelay The new withdrawal delay in seconds
    function setWithdrawalDelay(uint256 _withdrawalDelay) external onlyRole(DEFAULT_ADMIN_ROLE) {
        withdrawalDelay = _withdrawalDelay;
        emit WithdrawalDelaySet(_withdrawalDelay);
    }
    
    /// @notice Request a withdrawal
    /// @param amount The amount to withdraw
    function requestWithdrawal(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        // New request cancels previous one
        withdrawalRequests[msg.sender] = WithdrawalRequest({
            amount: amount,
            requestTime: block.timestamp,
            executed: false
        });
        
        emit WithdrawalRequested(msg.sender, amount, block.timestamp + withdrawalDelay);
    }
    
    /// @notice Execute a pending withdrawal
    function executeWithdrawal() external {
        WithdrawalRequest storage request = withdrawalRequests[msg.sender];
        require(request.amount > 0, "No withdrawal request");
        require(!request.executed, "Withdrawal already executed");
        require(block.timestamp >= request.requestTime + withdrawalDelay, "Withdrawal delay not met");
        require(balances[msg.sender] >= request.amount, "Insufficient balance");
        
        uint256 amount = request.amount;
        request.executed = true;
        
        balances[msg.sender] -= amount;
        totalDeposits -= amount;
        
        require(token.transfer(msg.sender, amount), "Transfer failed");
        emit WithdrawalExecuted(msg.sender, amount);
    }
    
    /// @notice Get a withdrawal request
    /// @param user The user address
    /// @return The withdrawal request
    function getWithdrawalRequest(address user) external view returns (uint256 amount, uint256 requestTime, bool executed, uint256 canExecuteAt) {
        WithdrawalRequest storage request = withdrawalRequests[user];
        uint256 executeTime = request.requestTime + withdrawalDelay;
        return (request.amount, request.requestTime, request.executed, executeTime);
    }
    
    /// @notice Emergency withdraw - only admin can call, bypasses delay
    /// @param user The user to withdraw for
    function emergencyWithdraw(address user) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(balances[user] > 0, "No balance");
        uint256 amount = balances[user];
        
        balances[user] = 0;
        totalDeposits -= amount;
        
        // Clear withdrawal request
        withdrawalRequests[user] = WithdrawalRequest(0, 0, false);
        
        require(token.transfer(user, amount), "Transfer failed");
    }
    
    /// @notice Get implementation version
    /// @return The version string
    function getImplementationVersion() external pure override returns (string memory) {
        return "V3";
    }
    
    /// @notice Authorize upgrade
    /// @param newImplementation The address of the new implementation
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}
    
    /// @notice Storage gap for future versions
    uint256[47] private __gap;
}
