# 🔐 Private Forex Trading Platform

> Privacy-preserving forex trading powered by Zama FHEVM - Trade currencies with fully encrypted positions and orders

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-blue)](https://soliditylang.org/)
[![Hardhat](https://img.shields.io/badge/Built%20with-Hardhat-yellow)](https://hardhat.org/)
[![Zama](https://img.shields.io/badge/Powered%20by-Zama%20FHEVM-blueviolet)](https://www.zama.ai/)

A fully encrypted forex trading platform built on **Zama FHEVM** enabling private trading with encrypted balances, positions, and limit orders. All sensitive trading data remains encrypted on-chain using Fully Homomorphic Encryption.

## ✨ Features

- 🔐 **Fully Encrypted Trading** - All balances, positions, and orders encrypted on-chain
- 💱 **Private Limit Orders** - Place orders with encrypted amounts and target prices
- 📊 **Leveraged Positions** - Support for up to 100x leverage with encrypted parameters
- 🔑 **Gateway Integration** - Secure decryption via Zama Gateway for withdrawals and P&L
- ⏸️ **Emergency Pause** - Multi-pauser system for platform security
- 🧮 **Multiple FHE Types** - Uses euint32, euint64, and ebool for different data
- 🛡️ **Access Control** - Owner, pauser, and gateway role management
- 📝 **Event Logging** - Comprehensive on-chain event system
- 🔄 **Stop-Loss/Take-Profit** - Automated order execution with encrypted prices
- ⚡ **Gas Optimized** - Efficient FHE operations and batch processing

## 🚀 Quick Start

```bash
# Clone and install
git clone <repository-url>
cd PrivateForexTrading
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Compile contracts
npm run compile

# Run tests
npm run test

# Deploy to Sepolia
npm run deploy:sepolia

# Verify contracts
npm run verify:sepolia
```

## 🌐 Live Demo

**Live Demo**: [Live Demo](https://private-forex-trading.vercel.app/)

**Demo Video**: [Demo Video](https://youtu.be/FvZvD4Gax9c)

**Network**: Sepolia Testnet (Chain ID: 11155111)

After deployment, contract addresses will be saved to `deployments/sepolia-deployment.json`

**Get Sepolia ETH**: [Sepolia Faucet](https://sepoliafaucet.com)

**Block Explorer**: [Sepolia Etherscan](https://sepolia.etherscan.io/)

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (HTML/JS)                        │
│  ├── Wallet Connection (MetaMask)                           │
│  ├── fhevmjs Client-side Encryption                         │
│  └── Real-time Trading Interface                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Smart Contracts (Solidity)                      │
│  ├── PrivateForexTrading.sol                                │
│  │   ├── Encrypted Storage (euint64, euint32, ebool)        │
│  │   ├── Position Management (Long/Short)                   │
│  │   ├── Limit Orders with Stop-Loss/Take-Profit            │
│  │   └── Gateway Callbacks for Decryption                   │
│  └── PauserSet.sol                                           │
│      └── Multi-Pauser Emergency System                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   Zama FHEVM Layer                           │
│  ├── Encrypted Computation (FHE.add, FHE.sub, FHE.mul)      │
│  ├── Encrypted Comparisons (FHE.gte, FHE.lte, FHE.eq)       │
│  ├── Gateway Decryption Service                              │
│  └── KMS Key Management                                      │
└─────────────────────────────────────────────────────────────┘
```

## 📋 Installation

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- MetaMask wallet
- Sepolia ETH for deployment

### Setup

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### Environment Configuration

Create a `.env` file with the following:

```env
# Network Configuration
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
LOCAL_FHENIX_URL=http://127.0.0.1:8545

# Private Key (NEVER commit this!)
PRIVATE_KEY=your_private_key_here

# Gateway Configuration
KMS_GENERATION_ADDRESS=0x0000000000000000000000000000000000000000

# PauserSet Configuration
NUM_PAUSERS=2
PAUSER_ADDRESS_0=0xYourPauserAddress1
PAUSER_ADDRESS_1=0xYourPauserAddress2

# Etherscan API Key
ETHERSCAN_API_KEY=your_etherscan_api_key

# Gas Reporter
REPORT_GAS=false
COINMARKETCAP_API_KEY=your_coinmarketcap_api_key
```

## 🔧 Technical Implementation

### FHEVM Integration

The platform uses **Zama FHEVM** for fully homomorphic encryption:

```solidity
// Encrypted balance type
struct EncryptedBalance {
    euint64 balance;      // 64-bit encrypted unsigned integer
    bool initialized;
}

// Encrypted position
struct EncryptedPosition {
    euint64 amount;       // Position size (encrypted)
    euint32 entryPrice;   // Entry price (encrypted)
    euint32 leverage;     // Leverage multiplier (encrypted)
    ebool isLong;         // Long/Short flag (encrypted boolean)
    uint256 timestamp;
    bool active;
}
```

### FHE Operations

```solidity
// Encrypted arithmetic
euint64 newBalance = FHE.add(currentBalance, depositAmount);
euint64 pnl = FHE.sub(exitValue, entryValue);
euint64 leveraged = FHE.mul(amount, leverage);

// Encrypted comparisons
ebool hasSufficientFunds = FHE.gte(balance, requiredAmount);
ebool priceReached = FHE.eq(currentPrice, targetPrice);

// Conditional selection
euint64 finalAmount = FHE.select(
    isProfit,
    balanceWithProfit,
    balanceWithLoss
);
```

### Gateway Callback Pattern

```solidity
// Request decryption for withdrawal
function requestWithdrawal(einput encryptedAmount, bytes calldata inputProof)
    external
    whenNotPaused
    returns (uint256)
{
    euint64 amount = FHE.asEuint64(encryptedAmount, inputProof);

    // Validate sufficient balance (encrypted comparison)
    ebool hasSufficientBalance = FHE.gte(balances[msg.sender].balance, amount);
    FHE.req(hasSufficientBalance);

    // Deduct from balance
    balances[msg.sender].balance = FHE.sub(balances[msg.sender].balance, amount);

    // Request Gateway decryption
    uint256[] memory cts = new uint256[](1);
    cts[0] = Gateway.toUint256(amount);

    uint256 requestId = Gateway.requestDecryption(
        cts,
        this.callbackWithdrawal.selector,
        0,
        block.timestamp + 100,
        false
    );

    emit Withdrawal(msg.sender, requestId);
    return requestId;
}

// Gateway callback processes decrypted value
function callbackWithdrawal(uint256 requestId, uint256 decryptedAmount)
    external
    onlyGateway
{
    emit WithdrawalProcessed(msg.sender, decryptedAmount);
    // Process withdrawal with decrypted amount
}
```

## 🧪 Testing

### Run Tests

```bash
# Run all tests
npm run test

# Run with coverage
npm run test:coverage

# Run with gas reporting
npm run test:gas

# Check contract sizes
npm run size
```

### Test Coverage

The test suite covers:
- ✅ Contract deployment and initialization
- ✅ PauserSet functionality
- ✅ Access control (owner, pauser, gateway)
- ✅ Pause/unpause mechanism
- ✅ Error handling and custom errors
- ✅ Event emissions
- ✅ Boundary conditions
- ✅ Contract size limits
- ✅ Integration with Gateway

### Sample Test

```typescript
describe("PrivateForexTrading", function () {
  it("should allow pauser to pause contract", async function () {
    const pausers = await pauserSet.getPausers();
    const pauserAddress = pausers[0];

    await ethers.provider.send("hardhat_impersonateAccount", [pauserAddress]);
    const pauserSigner = await ethers.getSigner(pauserAddress);

    await expect(privateForexTrading.connect(pauserSigner).pause())
      .to.emit(privateForexTrading, "Paused")
      .withArgs(pauserAddress);

    expect(await privateForexTrading.isPaused()).to.be.true;
  });
});
```

## 📖 Usage Guide

### Step 1: Deploy Contracts

```bash
npm run deploy:sepolia
```

This will:
1. Deploy PauserSet contract
2. Deploy PrivateForexTrading contract
3. Save addresses to `deployments/sepolia-deployment.json`
4. Generate Etherscan links

### Step 2: Verify Contracts

```bash
npm run verify:sepolia
```

### Step 3: Interact with Contracts

```bash
npm run interact:sepolia
```

### Step 4: Open Frontend

```bash
npm run dev
```

Then open http://localhost:3000 in your browser.

### User Flow

#### For Traders:

1. **Connect Wallet**
   ```javascript
   // Frontend: Connect MetaMask
   await window.ethereum.request({ method: 'eth_requestAccounts' });
   ```

2. **Deposit Funds** (Encrypted)
   ```javascript
   // Encrypt deposit amount using fhevmjs
   const encryptedAmount = await fhevmInstance.encrypt64(depositAmount);
   const tx = await contract.deposit(encryptedAmount, inputProof);
   ```

3. **Open Position** (Encrypted)
   ```javascript
   const encryptedAmount = await fhevmInstance.encrypt64(positionSize);
   const encryptedLeverage = await fhevmInstance.encrypt32(leverage);
   const encryptedDirection = await fhevmInstance.encryptBool(isLong);

   await contract.openPosition(
     encryptedAmount,
     encryptedLeverage,
     encryptedDirection,
     inputProof
   );
   ```

4. **Place Limit Order** (Encrypted)
   ```javascript
   const encryptedAmount = await fhevmInstance.encrypt64(orderSize);
   const encryptedPrice = await fhevmInstance.encrypt32(targetPrice);
   const encryptedStopLoss = await fhevmInstance.encrypt32(stopLoss);
   const encryptedTakeProfit = await fhevmInstance.encrypt32(takeProfit);

   await contract.placeOrder(
     encryptedAmount,
     encryptedPrice,
     encryptedStopLoss,
     encryptedTakeProfit,
     encryptedDirection,
     inputProof
   );
   ```

5. **Close Position**
   ```javascript
   await contract.closePosition(positionId);
   ```

6. **Withdraw Funds**
   ```javascript
   const encryptedAmount = await fhevmInstance.encrypt64(withdrawAmount);
   await contract.requestWithdrawal(encryptedAmount, inputProof);
   ```

## 🔒 Privacy Model

### What's Private

- ✅ **Individual Balances** - Encrypted with euint64, only owner can decrypt
- ✅ **Position Sizes** - Encrypted amounts, leverage, and direction
- ✅ **Order Details** - Target prices, stop-loss, take-profit (all encrypted)
- ✅ **P&L Calculations** - Computed homomorphically without revealing values
- ✅ **Trading Activity** - Position and order data encrypted on-chain

### What's Public

- ❌ **Transaction Existence** - Blockchain transactions are visible
- ❌ **Position Count** - Number of open positions per address
- ❌ **Order Count** - Number of pending orders per address
- ❌ **Contract Events** - Event emissions (without encrypted data)
- ❌ **Platform State** - Pause status, owner address

### Decryption Permissions

| Role | Can Decrypt |
|------|-------------|
| **User** | Own balance, own positions, own orders |
| **Owner** | Market prices (for updates) |
| **Gateway** | Withdrawal amounts, P&L for callbacks |
| **Public** | None |

## 🛠️ Development

### Project Structure

```
PrivateForexTrading/
├── contracts/
│   ├── PrivateForexTrading.sol    # Main trading contract
│   └── PauserSet.sol               # Pauser management
├── scripts/
│   ├── deploy.js                   # Deployment script
│   ├── verify.js                   # Etherscan verification
│   ├── interact.js                 # Contract interaction
│   └── simulate.js                 # Trading simulations
├── test/
│   └── PrivateForexTrading.test.ts # Test suite
├── tasks/
│   └── index.js                    # Hardhat custom tasks
├── deploy/
│   ├── 01-deploy-pauser-set.ts
│   └── 02-deploy-private-forex-trading.ts
└── index.html                      # Frontend interface
```

### Available Scripts

```bash
# Compilation
npm run compile        # Compile contracts
npm run clean          # Clean artifacts
npm run typechain      # Generate TypeScript bindings

# Testing
npm run test           # Run tests
npm run test:coverage  # Coverage report
npm run test:gas       # Gas usage report

# Deployment
npm run deploy:sepolia # Deploy to Sepolia
npm run verify:sepolia # Verify on Etherscan
npm run interact       # Interact with contracts
npm run simulate       # Run simulations

# Code Quality
npm run lint           # Lint TypeScript
npm run lint:sol       # Lint Solidity
npm run format         # Format code
npm run size           # Check contract sizes

# Frontend
npm run dev            # Start development server
```

### Custom Hardhat Tasks

```bash
# Get contract information
npx hardhat contract-info --address 0xAddress --network sepolia

# Check pauser configuration
npx hardhat check-pausers --address 0xPauserSetAddress --network sepolia

# Deploy all contracts
npx hardhat deploy-all --network sepolia --pausers 2
```

## 🔐 Security

### Security Features

- ✅ **Input Validation** - All parameters validated before processing
- ✅ **Access Control** - Role-based permissions (owner, pauser, gateway)
- ✅ **Fail-Closed Design** - Operations fail if conditions not met
- ✅ **ZK Proof Verification** - Input proofs required for encrypted data
- ✅ **Event Logging** - Comprehensive audit trail
- ✅ **Overflow Protection** - Solidity 0.8+ built-in checks
- ✅ **Pause Mechanism** - Emergency pause for critical situations
- ✅ **Gateway Integration** - Secure decryption via Zama Gateway

### Security Considerations

⚠️ **Before Production:**
- Complete professional security audit
- Test thoroughly on testnet
- Verify Gateway configuration
- Establish emergency procedures
- Set up monitoring and alerts

⚠️ **Key Management:**
- Never commit private keys
- Use hardware wallets for production
- Secure pauser addresses
- Rotate keys regularly

## 📊 Tech Stack

### Smart Contracts
- **Solidity** 0.8.24 - Smart contract language
- **@fhevm/solidity** ^0.5.0 - FHE operations
- **OpenZeppelin** - Security patterns
- **Hardhat** - Development environment

### Frontend
- **HTML/CSS/JavaScript** - User interface
- **ethers.js** v6 - Ethereum library
- **fhevmjs** ^0.5.0 - Client-side FHE encryption
- **MetaMask** - Wallet integration

### Development Tools
- **TypeScript** - Type safety
- **TypeChain** - Contract type bindings
- **Chai** - Testing framework
- **Hardhat Deploy** - Deployment management
- **Hardhat Contract Sizer** - Size monitoring

### Infrastructure
- **Zama FHEVM** - Encrypted computation layer
- **Zama Gateway** - Decryption service
- **Sepolia Testnet** - Ethereum test network
- **Etherscan** - Block explorer

## 📈 Gas Optimization

### Deployment Costs (Sepolia)

| Contract | Gas Used | Estimated Cost @ 20 gwei |
|----------|----------|--------------------------|
| PauserSet | ~250,000 | ~0.005 ETH |
| PrivateForexTrading | ~3,500,000 | ~0.07 ETH |
| **Total** | **~3,750,000** | **~0.075 ETH** |

### Transaction Costs

| Operation | Gas Used | Cost @ 20 gwei |
|-----------|----------|----------------|
| Deposit | ~200,000 | ~0.004 ETH |
| Open Position | ~250,000 | ~0.005 ETH |
| Place Order | ~200,000 | ~0.004 ETH |
| Close Position | ~180,000 | ~0.0036 ETH |
| Cancel Order | ~80,000 | ~0.0016 ETH |
| Request Withdrawal | ~150,000 | ~0.003 ETH |

*Note: Actual costs vary with network congestion*

## 🚧 Troubleshooting

### Common Issues

#### Insufficient Funds
```
Error: insufficient funds for intrinsic transaction cost
```
**Solution**: Get Sepolia ETH from [faucet](https://sepoliafaucet.com)

#### Invalid Private Key
```
Error: invalid private key
```
**Solution**: Check `PRIVATE_KEY` in `.env` (no 0x prefix needed)

#### Network Not Found
```
Error: network sepolia not found
```
**Solution**: Verify `hardhat.config.ts` has Sepolia configured

#### Contract Already Verified
```
Error: Already Verified
```
**Solution**: Contract is already verified on Etherscan

## 🗺️ Roadmap

### Phase 1: Core Features ✅
- [x] Encrypted balances and positions
- [x] Limit orders with stop-loss/take-profit
- [x] Gateway callback integration
- [x] Multi-pauser system
- [x] Comprehensive testing

### Phase 2: Enhanced Features (Q1 2025)
- [ ] Multiple currency pairs (EUR/USD, GBP/USD, etc.)
- [ ] Advanced order types (trailing stop, OCO)
- [ ] Position history and analytics
- [ ] Mobile-responsive interface

### Phase 3: DeFi Integration (Q2 2025)
- [ ] Liquidity pools
- [ ] Yield farming
- [ ] Governance token
- [ ] DAO for platform decisions

### Phase 4: Scaling (Q3 2025)
- [ ] Layer 2 deployment
- [ ] Cross-chain bridges
- [ ] Advanced trading tools
- [ ] API for algorithmic trading

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code style
- Add tests for new features
- Update documentation
- Run linters before committing
- Keep commits atomic and descriptive

## 📚 Resources

### Documentation
- **Deployment Guide**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Commands Reference**: [COMMANDS.md](./COMMANDS.md)
- **Project Summary**: [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)
- **Security Guide**: [SECURITY.md](./SECURITY.md)
- **Toolchain Guide**: [TOOLCHAIN.md](./TOOLCHAIN.md)

### External Links
- **Zama FHEVM Docs**: [docs.zama.ai/fhevm](https://docs.zama.ai/fhevm)
- **Hardhat Documentation**: [hardhat.org/docs](https://hardhat.org/docs)
- **Sepolia Faucet**: [sepoliafaucet.com](https://sepoliafaucet.com)
- **Sepolia Explorer**: [sepolia.etherscan.io](https://sepolia.etherscan.io)

## 🏆 Built with Zama

This project demonstrates the power of **Zama's Fully Homomorphic Encryption** technology, enabling truly private on-chain computation without revealing sensitive trading data.

> "Privacy is a fundamental right. Zama FHEVM makes it possible on blockchain." - Built for the Zama ecosystem

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**⭐ Star this repo if you find it useful!**

Built with ❤️ using [Zama FHEVM](https://www.zama.ai/) | [Hardhat](https://hardhat.org/) | [Sepolia](https://sepolia.etherscan.io/)
