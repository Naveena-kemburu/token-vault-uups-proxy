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
    address private _admin;
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
    /// @param _token The ERC20 token to use for the vault
    /// @param admin The admin address to grant roles
    /// @param _depositFee The deposit fee in basis points
    function initialize(address _token, address admin, uint256 _depositFee) external initializer {
        token = IERC20(_token);
        _admin = admin;
        depositFee = _depositFee;
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
    }
    
    /// @notice Get the admin address
    /// @return The admin address
    function getAdmin() external view returns (address) {
        return _admin;
    }
    
    /// @notice Deposit tokens into the vault
    /// @param amount The amount of tokens to deposit
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
    /// @param amount The amount of tokens to withdraw
    function withdraw(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        balances[msg.sender] -= amount;
        totalDeposits -= amount;
        
        require(token.transfer(msg.sender, amount), "Transfer failed");
        
        emit Withdrawn(msg.sender, amount);
    }
    
    /// @notice Get user balance
    /// @param user The user address
    /// @return The user's balance
    function balanceOf(address user) external view returns (uint256) {
        return balances[user];
    }
    
    /// @notice Get total deposits
    /// @return The total deposits
    function totalDeposits() external view returns (uint256) {
        return totalDeposits;
    }
    
    /// @notice Get deposit fee
    /// @return The deposit fee in basis points
    function getDepositFee() external view returns (uint256) {
        return depositFee;
    }
    
    /// @notice Get implementation version
    /// @return The version string
    function getImplementationVersion() external pure returns (string memory) {
        return "V1";
    }
    
    /// @notice Authorize upgrade
    /// @param newImplementation The address of the new implementation
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}
    
    /// @notice Storage gap for future versions
    uint256[50] private __gap;
}
