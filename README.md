# token-vault-uups-proxy

Production-grade upgradeable smart contract system implementing TokenVault protocol using UUPS proxy pattern with V1, V2, and V3 versions.

## Overview

This project demonstrates a comprehensive implementation of an upgradeable smart contract system using the UUPS (Universal Upgradeable Proxy Standard) pattern. The system evolves through three versions:

- **V1**: Basic deposit/withdraw functionality with fee management
- **V2**: Added yield rate calculation and deposit pause functionality
- **V3**: Added withdrawal delays and emergency withdrawal mechanisms

## Project Structure

```
token-vault-uups-proxy/
├── contracts/
│   ├── TokenVaultV1.sol      # Initial version with deposit/withdraw
│   ├── TokenVaultV2.sol      # Enhanced with yield and pause
│   ├── TokenVaultV3.sol      # Final version with withdrawal delays
│   └── mocks/
│       └── MockERC20.sol     # Mock token for testing
├── test/
│   ├── TokenVaultV1.test.js
│   ├── upgrade-v1-to-v2.test.js
│   ├── upgrade-v2-to-v3.test.js
│   └── security.test.js
├── scripts/
│   ├── deploy-v1.js
│   ├── upgrade-to-v2.js
│   └── upgrade-to-v3.js
├── hardhat.config.js
├── package.json
├── submission.yml
└── README.md
```

## Installation

```bash
npm install
```

## Compilation

```bash
npx hardhat compile
```

## Testing

```bash
npx hardhat test
```

## Deployment

### Deploy V1
```bash
npx hardhat run scripts/deploy-v1.js
```

### Upgrade to V2
```bash
npx hardhat run scripts/upgrade-to-v2.js
```

### Upgrade to V3
```bash
npx hardhat run scripts/upgrade-to-v3.js
```

## Implementation Details

### Storage Layout Strategy

Each contract version maintains backward compatibility through careful storage layout management:

- V1 defines base state variables: token, admin, depositFee, balances, totalDeposits
- V2 adds: yieldRate, lastYieldClaim, accumulatedYield, and uses __gap1 for future extensions
- V3 adds: withdrawalDelay, withdrawalRequests, maintaining all previous state

Storage gaps are used to reserve space for future upgrades without causing collisions.

### Access Control Design

Role-based access control using OpenZeppelin's AccessControl:

- **DEFAULT_ADMIN_ROLE**: Can grant/revoke roles and manage core settings
- **UPGRADER_ROLE**: Can authorize contract upgrades
- **PAUSER_ROLE**: Can pause/unpause deposit functionality (V2+)

### Business Logic

**V1 - Deposit Fees**:
- Fee deducted from deposit amount: `creditAmount = amount - (amount * fee / 10000)`
- User balance credited with amount after fee
- Total deposits reflect amount after fee deduction

**V2 - Yield Calculation**:
- Formula: `yield = (userBalance * yieldRate * timeElapsed) / (365 days * 10000)`
- yieldRate in basis points (500 = 5% annual)
- Tracked per user with lastYieldClaim timestamps
- Yield does not compound automatically

**V3 - Withdrawal Delays**:
- Users call `requestWithdrawal(amount)` to initiate withdrawal
- After delay period, `executeWithdrawal()` transfers funds
- Emergency withdraw bypasses delay for urgent needs
- Only one pending withdrawal per user; new requests override previous

## Security Considerations

### Initialization Security

- Implementation contracts disable initializers via `_disableInitializers()` in constructor
- Uses OpenZeppelin's `initializer` modifier to prevent reinitialization
- Proxy initialization happens once during deployment

### Upgrade Safety

- Storage layout consistency verified across versions
- No variable reordering or removal between versions
- Storage gaps allow future extensions without breaking upgrades
- Authorization checks prevent unauthorized upgrades

### Common Attack Mitigations

- Reentrancy protection through proper state management
- Integer overflow/underflow handled by Solidity 0.8.20
- Access control prevents unauthorized function calls
- Storage collision prevention through gap variables

## Key Functions

### TokenVaultV1
- `initialize(address, address, uint256)`: Initialize contract
- `deposit(uint256)`: Deposit tokens with fee
- `withdraw(uint256)`: Withdraw tokens
- `balanceOf(address)`: Get user balance
- `totalDeposits()`: Get total vault deposits
- `getDepositFee()`: Get fee percentage

### TokenVaultV2 (inherits V1)
- `setYieldRate(uint256)`: Set annual yield rate
- `getYieldRate()`: Get current yield rate
- `getUserYield(address)`: Calculate user's accrued yield
- `claimYield()`: Claim accrued yield
- `pauseDeposits()`: Pause new deposits
- `unpauseDeposits()`: Resume deposits
- `isDepositsPaused()`: Check pause status

### TokenVaultV3 (inherits V1 & V2)
- `setWithdrawalDelay(uint256)`: Set withdrawal delay in seconds
- `getWithdrawalDelay()`: Get current delay
- `requestWithdrawal(uint256)`: Request withdrawal
- `executeWithdrawal()`: Execute pending withdrawal
- `emergencyWithdraw()`: Withdraw immediately
- `getWithdrawalRequest(address)`: Get pending withdrawal details

## Testing Strategy

Comprehensive test suite covering:

1. **TokenVaultV1.test.js**: Basic functionality
   - Initialization with correct parameters
   - Deposit with fee calculation
   - Withdrawal with balance checks
   - Reinitialization prevention

2. **upgrade-v1-to-v2.test.js**: V1→V2 upgrade
   - State preservation during upgrade
   - New yield functionality
   - Deposit pause mechanism
   - Access control preservation

3. **upgrade-v2-to-v3.test.js**: V2→V3 upgrade
   - All V2 state preserved
   - Withdrawal delay enforcement
   - Emergency withdrawal bypass
   - Pending withdrawal management

4. **security.test.js**: Security features
   - Direct implementation contract initialization prevention
   - Unauthorized upgrade prevention
   - Storage layout consistency
   - Function selector clash prevention

## Development Process

### Step 1: V1 Development
- Implemented basic TokenVault with UUPS proxy pattern
- Added deposit fees with proper calculation
- Set up access control roles
- Created comprehensive unit tests

### Step 2: V2 Upgrade
- Extended V1 with yield rate management
- Implemented yield calculation formula
- Added pause functionality
- Ensured storage layout backward compatibility
- Added upgrade tests

### Step 3: V3 Upgrade
- Added withdrawal delay mechanism
- Implemented emergency withdrawal
- Maintained all V1 and V2 functionality
- Comprehensive security testing

## Known Limitations

1. Yield does not compound automatically - users must claim to lock in earnings
2. Emergency withdrawal is available to all users - consider restricting in production
3. Single proxy admin - consider DAO governance for production
4. No pause for withdrawals - only deposits can be paused

## Future Enhancements

- Governor-based upgrade mechanism
- Multi-signature upgrade authorization
- Withdrawal fee mechanism
- Staking rewards distribution
- Cross-chain bridge support

