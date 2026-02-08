# token-vault-uups-proxy

Production-grade upgradeable smart contract system implementing the TokenVault protocol using UUPS (Universal Upgradeable Proxy Standard) proxy pattern with three evolutionary versions.

## 🎯 Overview

This project demonstrates a comprehensive implementation of an upgradeable smart contract system that manages ERC20 token deposits, withdrawals, yield distribution, and advanced security features. The system showcases proper upgrade patterns, storage layout management, and production-ready security practices.

### Version Evolution

- **V1**: Foundation with basic deposit/withdraw functionality and fee management
- **V2**: Enhanced with yield rate calculation, deposit pause functionality, and improved security
- **V3**: Advanced features including withdrawal delays and emergency withdrawal mechanisms

## 📁 Project Structure

```
token-vault-uups-proxy/
├── contracts/
│   ├── TokenVaultV1.sol        # Initial version with deposit/withdraw
│   ├── TokenVaultV2.sol        # Enhanced with yield and pause
│   ├── TokenVaultV3.sol        # Final version with withdrawal delays
│   └── mocks/
│       └── MockERC20.sol       # Mock token for testing
├── test/
│   ├── TokenVaultV1.test.js    # V1 comprehensive tests
│   ├── upgrade-v1-to-v2.test.js # V1→V2 upgrade tests
│   ├── upgrade-v2-to-v3.test.js # V2→V3 upgrade tests
│   └── security.test.js         # Security & access control tests
├── scripts/
│   ├── deploy-v1.js             # Deploy initial V1
│   ├── upgrade-to-v2.js         # Upgrade V1→V2
│   └── upgrade-to-v3.js         # Upgrade V2→V3
├── hardhat.config.js
├── package.json
└── README.md
```

## ⚙️ Installation

```bash
npm install
```

## 🔨 Compilation

```bash
npx hardhat compile
```

## 🧪 Testing

Run all tests:
```bash
npx hardhat test
```

Run specific test suites:
```bash
# Test V1 functionality
npx hardhat test test/TokenVaultV1.test.js

# Test V1 to V2 upgrade
npx hardhat test test/upgrade-v1-to-v2.test.js

# Test V2 to V3 upgrade
npx hardhat test test/upgrade-v2-to-v3.test.js

# Test security features
npx hardhat test test/security.test.js
```

## 🚀 Deployment

### Step 1: Deploy V1

```bash
npx hardhat run scripts/deploy-v1.js --network <network-name>
```

This deploys:
- TokenVaultV1 implementation
- UUPS Proxy pointing to V1
- Initializes the contract

### Step 2: Upgrade to V2

```bash
npx hardhat run scripts/upgrade-to-v2.js --network <network-name>
```

Upgrades to V2 with:
- Yield rate management (1% default)
- Deposit pause functionality
- Yield calculation based on deposit time
- Backward compatible storage layout

### Step 3: Upgrade to V3

```bash
npx hardhat run scripts/upgrade-to-v3.js --network <network-name>
```

Upgrades to V3 with:
- 7-day withdrawal delay mechanism
- Emergency withdrawal functionality
- Request/execute withdrawal pattern
- Enhanced security features

## 🏗️ Architecture

### UUPS Proxy Pattern

This project uses the UUPS (Universal Upgradeable Proxy Standard) pattern:
- Upgrade logic is in the implementation contract
- More gas efficient than Transparent Proxy
- Admin is stored in implementation, not proxy
- Uses OpenZeppelin's `UUPSUpgradeable` base contract

### Storage Layout Management

Each contract version maintains proper storage layout:
- V1 defines base storage with `__gap` for future variables
- V2 inherits V1 storage, adds new variables, adjusts `__gap`
- V3 inherits V2 storage, adds new variables, adjusts `__gap`
- Ensures no storage collisions during upgrades

## 🔑 Key Features

### TokenVaultV1
- ✅ ERC20 token deposit and withdrawal
- ✅ Withdrawal fee management (0.1% default)
- ✅ Admin-controlled fee updates
- ✅ Balance tracking per user
- ✅ Proper initialization with `_disableInitializers()`
- ✅ UUPS upgrade authorization

### TokenVaultV2 (All V1 features plus:)
- ✅ Yield rate management (1% default APY)
- ✅ Time-based yield calculation
- ✅ Deposit pause functionality
- ✅ Yield claiming with reentrancy protection
- ✅ Storage layout backward compatibility
- ✅ Enhanced event emission

### TokenVaultV3 (All V2 features plus:)
- ✅ 7-day withdrawal delay mechanism
- ✅ Request-based withdrawal system
- ✅ Emergency withdrawal for admin
- ✅ Withdrawal request tracking
- ✅ Time-lock enforcement
- ✅ Comprehensive security testing

## 🔐 Security Features

- **Access Control**: Only admin can upgrade contracts and modify parameters
- **Reentrancy Protection**: Uses OpenZeppelin's `ReentrancyGuard`
- **Storage Safety**: Proper `__gap` arrays prevent storage collisions
- **Initialization Protection**: `_disableInitializers()` in constructor
- **Pausable Deposits**: Admin can pause deposits in emergency
- **Withdrawal Delays**: Time-lock mechanism prevents instant withdrawals in V3
- **Emergency Controls**: Admin emergency withdrawal in critical situations

## 📊 Test Coverage

The project includes comprehensive test suites:

1. **TokenVaultV1.test.js**: 
   - Deployment and initialization
   - Deposit and withdrawal functionality
   - Fee management
   - Admin controls
   - Edge cases and error handling

2. **upgrade-v1-to-v2.test.js**:
   - Upgrade mechanism validation
   - State preservation across upgrade
   - New V2 functionality (yield, pause)
   - Storage layout integrity

3. **upgrade-v2-to-v3.test.js**:
   - V2 to V3 upgrade process
   - Withdrawal delay mechanism
   - Emergency withdrawal
   - All previous functionality preserved

4. **security.test.js**:
   - Access control enforcement
   - Reentrancy attack prevention
   - Storage collision testing
   - Unauthorized upgrade attempts
   - Admin-only function protection

## 🛠️ Technology Stack

- **Solidity**: ^0.8.20
- **Hardhat**: Smart contract development environment
- **OpenZeppelin**: Security-audited contract libraries
  - `@openzeppelin/contracts-upgradeable`
  - `UUPSUpgradeable`
  - `ReentrancyGuardUpgradeable`
  - `PausableUpgradeable`
- **Ethers.js**: Ethereum library for deployment and testing
- **Chai**: Assertion library for tests

## 📝 Key Implementation Details

### Proper Inheritance in V2

```solidity
contract TokenVaultV2 is TokenVaultV1 {
    // Inherits all V1 storage and functionality
    // Adds new variables without redeclaring V1 variables
}
```

### Storage Gap Pattern

```solidity
contract TokenVaultV1 {
    // ... state variables ...
    uint256[50] private __gap; // Reserve space for future variables
}

contract TokenVaultV2 is TokenVaultV1 {
    // ... new state variables ...
    uint256[48] private __gap; // Reduced gap (added 2 new variables)
}
```

### Reentrancy Protection

```solidity
function claimYield() external nonReentrant {
    uint256 yield = calculateYield(msg.sender);
    lastClaimTime[msg.sender] = block.timestamp;
    token.transfer(msg.sender, yield); // Safe: state updated before transfer
}
```

## ⚠️ Known Limitations

1. Yield does not compound automatically - users must claim to lock in earnings
2. Emergency withdrawal is available to all users in V3 - consider restricting in production
3. Single proxy admin - consider DAO governance or multi-sig for production
4. No pause for withdrawals - only deposits can be paused

## 🔮 Future Enhancements

- Governor-based upgrade mechanism with timelock
- Multi-signature upgrade authorization
- Configurable withdrawal delay periods
- Automated yield compounding
- Staking rewards distribution
- Cross-chain bridge support
- Gas optimization with custom errors
- Integration with DeFi protocols

## 📄 License

MIT

## 🤝 Contributing

This project demonstrates best practices for upgradeable smart contracts. Contributions, issues, and feature requests are welcome!

## 📚 Resources

- [OpenZeppelin Upgrades](https://docs.openzeppelin.com/upgrades-plugins/1.x/)
- [UUPS Proxies](https://eips.ethereum.org/EIPS/eip-1822)
- [Writing Upgradeable Contracts](https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable)
- [Hardhat Documentation](https://hardhat.org/getting-started/)

---

**Built with ❤️ for demonstrating production-grade upgradeable smart contracts**
