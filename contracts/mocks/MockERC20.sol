// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockERC20
/// @notice Mock ERC20 token for testing
contract MockERC20 is ERC20 {
    /// @notice Constructor to initialize the mock token
    constructor() ERC20("Mock Token", "MTK") {
        // Mint 1 million tokens to the deployer
        _mint(msg.sender, 1000000 * 10 ** 18);
    }
    
    /// @notice Mint tokens to an account
    /// @param account The account to mint to
    /// @param amount The amount to mint
    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }
    
    /// @notice Burn tokens from an account
    /// @param amount The amount to burn
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
