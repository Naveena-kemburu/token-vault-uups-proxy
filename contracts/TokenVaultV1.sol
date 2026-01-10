// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title TokenVaultV1
/// @notice First version of the upgradeable TokenVault contract with deposit/withdraw and fee management
contract TokenVaultV1 is Initializable, UUPSUpgradeable, AccessControlUpgradeable {
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    IERC20 public token;
    address public admin;
    uint256 public depositFee; // in basis points (100 = 1%)
    
    mapping(address => uint256) public balances;
    uint256 public totalDeposits;
    
    event Deposited(address indexed user, uint256 amount, uint256 fee);
    event Withdrawn(address indexed user, uint256 amount);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /// @notice Initialize the TokenVault contract
    function initialize(address _token, address _admin, uint256 _depositFee) external initializer {
        token = IERC20(_token);
        admin = _admin;
        depositFee = _depositFee;
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(UPGRADER_ROLE, _admin);
    }
    
    /// @notice Deposit tokens into the vault
    function deposit(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        
        uint256 fee = (amount * depositFee) / 10000;
        uint256 creditAmount = amount - fee;
        
        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        balances[msg.sender] += creditAmount;
        totalDeposits += creditAmount;
        
        emit Deposited(msg.sender, creditAmount, fee);
    }
    
    /// @notice Withdraw tokens from the vault
    function withdraw(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        balances[msg.sender] -= amount;
        totalDeposits -= amount;
        
        require(token.transfer(msg.sender, amount), "Transfer failed");
        
        emit Withdrawn(msg.sender, amount);
    }
    
    /// @notice Get user balance
    function balanceOf(address user) external view returns (uint256) {
        return balances[user];
    }
    
    /// @notice Get total deposits
    function totalDeposits_() external view returns (uint256) {
        return totalDeposits;
    }
    
    /// @notice Get deposit fee
    function getDepositFee() external view returns (uint256) {
        return depositFee;
    }
    
    /// @notice Get implementation version
    function getImplementationVersion() external pure returns (string memory) {
        return "V1";
    }
    
    /// @notice Authorize upgrade
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}
    
    /// @notice Support function names as per requirements
    function totalDeposits() external view returns (uint256) {
        return totalDeposits;
    }
}
