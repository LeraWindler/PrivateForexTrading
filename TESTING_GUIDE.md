# Testing Guide for Enhanced Private Forex Trading

## Overview
This guide provides instructions for testing the Enhanced Private Forex Trading platform according to the documented specifications in README.md.

## Prerequisites

### Required Software
- Node.js >= 18.0.0
- npm or yarn
- Hardhat

### Dependencies Installation

Due to FHEVM dependency constraints, follow these steps:

1. **Install Core Dependencies:**
```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install --save-dev @typechain/hardhat @typechain/ethers-v6
npm install --save-dev chai @types/chai @types/mocha @types/node
npm install --save-dev @nomicfoundation/hardhat-network-helpers
```

2. **Install FHEVM Dependencies (if available):**
```bash
npm install @fhevm/solidity@^0.5.0 fhevmjs@^0.5.0
```

If FHEVM packages are not available, skip to the Mock Testing section below.

## Test Structure

### Test Files
- `test/PrivateForexTrading.test.ts` - Original contract tests
- `test/EnhancedPrivateForexTrading.test.ts` - Enhanced contract comprehensive tests

### Test Suites

#### 1. Deployment Tests
Verifies initial contract state and configuration.

```bash
npx hardhat test --grep "Deployment"
```

#### 2. Trader Registration Tests
Tests trader registration with various scenarios.

```bash
npx hardhat test --grep "Trader Registration"
```

#### 3. Trading Session Management Tests
Validates session creation and lifecycle management.

```bash
npx hardhat test --grep "Trading Session Management"
```

#### 4. Private Order Placement Tests
Tests encrypted order placement functionality.

```bash
npx hardhat test --grep "Private Order Placement"
```

#### 5. Gateway Callback Tests
Validates Gateway integration and decryption flow.

```bash
npx hardhat test --grep "Gateway Callback"
```

#### 6. Emergency Refund Tests
Tests timeout protection and refund mechanisms.

```bash
npx hardhat test --grep "Emergency Refund"
```

#### 7. Security Features Tests
Comprehensive security validation.

```bash
npx hardhat test --grep "Security Features"
```

## Running Tests

### All Tests
```bash
npx hardhat test
```

### Specific Test File
```bash
npx hardhat test test/EnhancedPrivateForexTrading.test.ts
```

### With Coverage
```bash
npx hardhat coverage
```

### With Gas Reporter
```bash
REPORT_GAS=true npx hardhat test
```

### Verbose Output
```bash
npx hardhat test --verbose
```

## Test Scenarios by Feature

### Feature 1: Gateway Callback Pattern

**What to Test:**
- Request decryption after session end
- Callback handler authorization
- Decryption timeout enforcement
- Duplicate request prevention

**Expected Behavior:**
- Only owner can request decryption
- Request only after session ends
- Deadline enforcement (1 hour)
- Proper event emissions

### Feature 2: Refund Mechanism

**What to Test:**
- Emergency refund activation
- Refund claim by traders
- Timeout-based triggers
- Refund state management

**Expected Behavior:**
- 24-hour delay before emergency refund
- Only eligible traders can claim
- Prevents duplicate claims
- Proper balance restoration

### Feature 3: Timeout Protection

**What to Test:**
- Session duration limits (5 min - 30 days)
- Decryption timeout (1 hour)
- Emergency delay (24 hours)
- Action cooldown (1 second)

**Expected Behavior:**
- Rejects invalid durations
- Enforces all timeout layers
- Proper deadline calculations
- Rate limiting active

### Feature 4: Privacy Protection

**What to Test:**
- Amount obfuscation with multipliers
- Price obfuscation techniques
- Encrypted data handling
- Privacy state management

**Expected Behavior:**
- Random multipliers applied (1000-10000)
- Noise added to prices (0-99 bp)
- Encrypted values stored
- Decryption only via Gateway

### Feature 5: Security Framework

**What to Test:**
- Input validation (all parameters)
- Access control (all roles)
- Rate limiting (cooldowns)
- Overflow protection
- Blacklist enforcement

**Expected Behavior:**
- Rejects invalid inputs
- Enforces role-based access
- Cooldown between actions
- No overflow vulnerabilities
- Blacklisted traders blocked

### Feature 6: Gas Optimization

**What to Test:**
- Contract size < 24 KB
- Batch operations efficiency
- Minimal state updates
- Optimized comparisons

**Expected Behavior:**
- Deployable size
- Efficient gas usage
- Single callback for batch
- O(1) operations

## Manual Testing Checklist

### Registration Flow
- [ ] Register trader with valid balance (≥ 1000)
- [ ] Verify rejection of balance < 1000
- [ ] Verify rejection of zero balance
- [ ] Verify duplicate registration prevention
- [ ] Test rate limiting between registrations

### Session Management Flow
- [ ] Start session with valid rates
- [ ] Verify session duration validation (min/max)
- [ ] Test forex rate validation (zero/overflow)
- [ ] Verify only owner can start sessions
- [ ] Check session info retrieval

### Order Placement Flow
- [ ] Place order as registered trader
- [ ] Verify unregistered trader rejection
- [ ] Test blacklisted trader rejection
- [ ] Verify amount validation
- [ ] Test currency pair validation (0-4)
- [ ] Check session expiry enforcement
- [ ] Test multiple orders from same trader
- [ ] Test orders from multiple traders

### Decryption Flow
- [ ] Request decryption after session end
- [ ] Verify rejection before session end
- [ ] Test owner-only access
- [ ] Verify duplicate request prevention
- [ ] Check deadline enforcement

### Refund Flow
- [ ] Enable emergency refund after timeout
- [ ] Verify rejection before delay period
- [ ] Test trader refund claiming
- [ ] Verify refund claim validation

### Security Flow
- [ ] Blacklist trader (owner only)
- [ ] Unblacklist trader
- [ ] Test zero address rejection
- [ ] Test overflow protection
- [ ] Verify rate limiting enforcement

## Integration Testing (FHEVM Network)

### Local Fhenix Network
```bash
# Start local FHEVM node
npm run node

# Deploy contracts
npm run deploy:local

# Run integration tests
npm test
```

### Sepolia Testnet
```bash
# Deploy to Sepolia
npm run deploy:sepolia

# Verify contract
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>

# Run testnet tests
NETWORK=sepolia npm test
```

## Mock Testing (Without FHEVM)

If FHEVM dependencies are unavailable, create mock implementations:

### Create Mock FHE Library
```typescript
// test/mocks/MockFHE.sol
library MockFHE {
    function asEuint64(uint64 value) internal pure returns (uint256) {
        return uint256(value);
    }

    function asEuint32(uint32 value) internal pure returns (uint256) {
        return uint256(value);
    }

    // ... other mock functions
}
```

### Adapt Tests
Use mock library for testing logic without encryption.

## Troubleshooting

### Common Issues

#### 1. FHEVM Dependency Not Found
```
Error: No matching version found for @fhevm/hardhat-plugin@^0.2.0
```

**Solution:**
- Check FHEVM package availability
- Use alternative package versions
- Contact ZAMA for correct package names
- Use mock testing approach

#### 2. Compilation Errors
```
Error: Cannot find module '@fhevm/solidity'
```

**Solution:**
- Ensure correct import paths
- Verify package installation
- Check Solidity version compatibility (0.8.24)

#### 3. Test Timeout
```
Error: Timeout of 100000ms exceeded
```

**Solution:**
- Increase timeout in hardhat.config.ts
- Check for infinite loops
- Verify network connectivity

#### 4. Gas Estimation Failed
```
Error: Transaction reverted without a reason string
```

**Solution:**
- Add gas limit to transactions
- Check contract state requirements
- Enable detailed error messages

## Coverage Targets

### Expected Coverage
- **Statements:** > 95%
- **Branches:** > 90%
- **Functions:** 100%
- **Lines:** > 95%

### Generate Coverage Report
```bash
npx hardhat coverage
```

View report at: `coverage/index.html`

## Performance Benchmarks

### Gas Costs (Estimated)
| Operation | Gas Cost | Notes |
|-----------|----------|-------|
| Register Trader | ~150,000 | One-time |
| Place Order | ~200,000 | With encryption |
| Request Decryption | ~300,000 | Batch operation |
| Execute Orders (10) | ~500,000 | Amortized |
| Claim Refund | ~80,000 | Standard transfer |

## Test Data

### Valid Forex Rates
```typescript
EUR_USD: 12500  // 1.2500
GBP_USD: 14000  // 1.4000
USD_JPY: 1100000 // 110.0000
AUD_USD: 7500   // 0.7500
USD_CHF: 9200   // 0.9200
```

### Valid Amounts
- Minimum deposit: 1000
- Test amounts: 1000, 5000, 10000, 50000

### Session Durations
- Minimum: 300 seconds (5 minutes)
- Test: 3600 seconds (1 hour)
- Maximum: 2592000 seconds (30 days)

## Documentation References

- **Main README:** `README.md`
- **Test Report:** `TEST_REPORT.md`
- **Contract:** `EnhancedPrivateForexTrading.sol`
- **Hardhat Config:** `hardhat.config.ts`

## Support

For issues or questions:
1. Check troubleshooting section
2. Review contract comments
3. Consult FHEVM documentation
4. Contact development team

## Next Steps

1. Install dependencies
2. Run basic compilation test
3. Execute test suite
4. Review coverage report
5. Fix any failing tests
6. Deploy to testnet
7. Perform integration testing
8. Security audit
9. Mainnet deployment

---

**Last Updated:** 2025-11-22
**Test Framework:** Hardhat + Chai + TypeScript
**Target Network:** FHEVM Sepolia / Local Fhenix
