# token-vault-uups-proxy

Production-grade upgradeable smart contract system implementing the TokenVault protocol using UUPS (Universal Upgradeable Proxy Standard) proxy pattern with three evolutionary versions.

##  Overview

This project demonstrates a comprehensive implementation of an upgradeable smart contract system that manages ERC20 token deposits, withdrawals, yield distribution, and advanced security features. The system showcases proper upgrade patterns, storage layout management, and production-ready security practices.

### Version Evolution

- **V1**: Foundation with basic deposit/withdraw functionality and fee management
- **V2**: Enhanced with yield rate calculation, deposit pause functionality, and improved security
- **V3**: Advanced features including withdrawal delays and emergency withdrawal mechanisms

##  Project Structure

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

##  Installation

```bash
npm install
```

##  Compilation

```bash
npx hardhat compile
```

##  Testing

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

##  Key Features

### TokenVaultV1
-  ERC20 token deposit and withdrawal
-  Withdrawal fee management (0.1% default)
-  Admin-controlled fee updates
-  Balance tracking per user
-  Proper initialization with `_disableInitializers()`
-  UUPS upgrade authorization

### TokenVaultV2 (All V1 features plus:)
-  Yield rate management (1% default APY)
-  Time-based yield calculation
-  Deposit pause functionality
-  Yield claiming with reentrancy protection
-  Storage layout backward compatibility
-  Enhanced event emission

### TokenVaultV3 (All V2 features plus:)
-  7-day withdrawal delay mechanism
-  Request-based withdrawal system
-  Emergency withdrawal for admin
-  Withdrawal request tracking
-  Time-lock enforcement
-  Comprehensive security testing

##  Security Features

- **Access Control**: Only admin can upgrade contracts and modify parameters
- **Reentrancy Protection**: Uses OpenZeppelin's `ReentrancyGuard`
- **Storage Safety**: Proper `__gap` arrays prevent storage collisions
- **Initialization Protection**: `_disableInitializers()` in constructor
- **Pausable Deposits**: Admin can pause deposits in emergency
- **Withdrawal Delays**: Time-lock mechanism prevents instant withdrawals in V3
- **Emergency Controls**: Admin emergency withdrawal in critical situations

## Test Coverage

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

## Technology Stack

- **Solidity**: ^0.8.20
- **Hardhat**: Smart contract development environment
- **OpenZeppelin**: Security-audited contract libraries
  - `@openzeppelin/contracts-upgradeable`
  - `UUPSUpgradeable`
  - `ReentrancyGuardUpgradeable`
  - `PausableUpgradeable`
- **Ethers.js**: Ethereum library for deployment and testing
- **Chai**: Assertion library for tests

