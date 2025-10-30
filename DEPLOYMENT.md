# Deployment Guide - Private Forex Trading Platform

## Overview

This guide provides complete instructions for deploying the Private Forex Trading Platform to Ethereum Sepolia testnet and other networks.

---

## Prerequisites

### Software Requirements
- Node.js >= 18.0.0
- npm or yarn
- Git
- MetaMask or compatible wallet

### Account Requirements
- Ethereum account with private key
- Sepolia ETH for testnet deployment (get from faucet)
- Etherscan API key for contract verification

---

## Quick Start

### 1. Installation

```bash
# Clone or navigate to project directory
cd PrivateForexTrading

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### 2. Configuration

Edit `.env` file with your credentials:

```bash
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
```

### 3. Compile Contracts

```bash
npm run compile
```

### 4. Run Tests

```bash
npm run test
```

### 5. Deploy to Sepolia

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

---

## Deployment Process

### Step-by-Step Deployment

#### Step 1: Prepare Environment

Ensure you have:
- ✅ Sufficient Sepolia ETH (at least 0.1 ETH recommended)
- ✅ Valid RPC endpoint
- ✅ Private key in `.env`
- ✅ Pauser addresses configured

#### Step 2: Deploy Contracts

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

**Expected Output:**
```
🚀 Starting deployment...

📍 Network: sepolia
👤 Deployer: 0xYourAddress
💰 Balance: 0.5 ETH

🛡️  Pausers configured: 2
   0: 0xPauserAddress1
   1: 0xPauserAddress2

📝 Deploying PauserSet...
✅ PauserSet deployed to: 0xPauserSetAddress

🔑 KMS Generation Address: 0xKMSAddress

📝 Deploying PrivateForexTrading...
✅ PrivateForexTrading deployed to: 0xPrivateForexTradingAddress

🔍 Verifying deployment...
   Owner: 0xYourAddress
   Paused: false
   MIN_DEPOSIT: 1000
   MAX_LEVERAGE: 100

💾 Deployment info saved to: deployments/sepolia-deployment.json

🎉 DEPLOYMENT SUCCESSFUL!
```

#### Step 3: Verify Contracts on Etherscan

```bash
npx hardhat run scripts/verify.js --network sepolia
```

**Expected Output:**
```
🔍 Starting contract verification...

📍 Network: sepolia

Verifying PauserSet...
✅ PauserSet verified successfully!

Verifying PrivateForexTrading...
✅ PrivateForexTrading verified successfully!

🔗 Etherscan Links:
   PauserSet: https://sepolia.etherscan.io/address/0xPauserSetAddress
   PrivateForexTrading: https://sepolia.etherscan.io/address/0xPrivateForexTradingAddress
```

#### Step 4: Interact with Deployed Contracts

```bash
npx hardhat run scripts/interact.js --network sepolia
```

#### Step 5: Run Simulation Tests

```bash
npx hardhat run scripts/simulate.js --network sepolia
```

---

## Deployment Information

### Network: Sepolia Testnet

| Component | Information |
|-----------|-------------|
| **Chain ID** | 11155111 |
| **RPC URL** | https://sepolia.infura.io/v3/YOUR_KEY |
| **Block Explorer** | https://sepolia.etherscan.io |
| **Faucet** | https://sepoliafaucet.com |

### Contract Addresses

After deployment, contract addresses are saved to `deployments/sepolia-deployment.json`:

```json
{
  "network": "sepolia",
  "deployer": "0xYourDeployerAddress",
  "timestamp": "2024-XX-XX",
  "contracts": {
    "PauserSet": {
      "address": "0xPauserSetAddress",
      "pausers": ["0xPauser1", "0xPauser2"]
    },
    "PrivateForexTrading": {
      "address": "0xPrivateForexTradingAddress",
      "pauserSet": "0xPauserSetAddress",
      "kmsGeneration": "0xKMSAddress",
      "owner": "0xOwnerAddress",
      "minDeposit": "1000",
      "maxLeverage": "100"
    }
  },
  "etherscan": {
    "PauserSet": "https://sepolia.etherscan.io/address/0xPauserSetAddress",
    "PrivateForexTrading": "https://sepolia.etherscan.io/address/0xPrivateForexTradingAddress"
  }
}
```

---

## Hardhat Tasks

### Built-in Tasks

```bash
# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Check contract sizes
npx hardhat size-contracts

# Clean artifacts
npx hardhat clean

# Start local node
npx hardhat node
```

### Custom Tasks

```bash
# Deploy all contracts
npx hardhat deploy-all --network sepolia --pausers 2

# Verify all contracts
npx hardhat verify-all --address 0xContractAddress --network sepolia

# Get contract info
npx hardhat contract-info --address 0xPrivateForexTradingAddress --network sepolia

# Check pausers
npx hardhat check-pausers --address 0xPauserSetAddress --network sepolia

# Test encryption
npx hardhat test-encryption --value 1000 --network sepolia
```

---

## Script Reference

### deploy.js

**Purpose:** Deploy PauserSet and PrivateForexTrading contracts

**Usage:**
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

**Features:**
- Deploys PauserSet with configured pausers
- Deploys PrivateForexTrading with PauserSet and KMS addresses
- Validates deployment
- Saves deployment info to JSON
- Generates Etherscan links

### verify.js

**Purpose:** Verify deployed contracts on Etherscan

**Usage:**
```bash
npx hardhat run scripts/verify.js --network sepolia
```

**Requirements:**
- ETHERSCAN_API_KEY in .env
- Deployment file exists
- Contracts deployed on public network

### interact.js

**Purpose:** Interact with deployed contracts

**Usage:**
```bash
npx hardhat run scripts/interact.js --network sepolia
```

**Capabilities:**
- Check contract state
- View pauser configuration
- Query trading stats
- Display available functions
- Monitor account balances

### simulate.js

**Purpose:** Simulate trading scenarios

**Usage:**
```bash
npx hardhat run scripts/simulate.js --network sepolia
```

**Test Scenarios:**
1. Basic contract state
2. Initial account balances
3. Pause/unpause functionality
4. Position and order tracking
5. Contract constants validation
6. Event monitoring setup
7. Gas estimation
8. Security validations

---

## Configuration

### PauserSet Configuration

The PauserSet contract manages addresses authorized to pause the trading platform.

**Environment Variables:**
```bash
NUM_PAUSERS=2
PAUSER_ADDRESS_0=0xFirstPauserAddress
PAUSER_ADDRESS_1=0xSecondPauserAddress
```

**Recommendations:**
- Use at least 2 pausers for redundancy
- Use multisig wallets for pauser addresses
- Keep pauser private keys in secure storage

### Gateway Configuration

**Environment Variable:**
```bash
KMS_GENERATION_ADDRESS=0xGatewayKMSAddress
```

**Notes:**
- This address is used for FHE key management
- Must be set for production deployments
- Contact Zama for proper Gateway configuration

---

## Gas Costs

### Deployment Costs (Sepolia Testnet)

| Contract | Gas Used | Estimated Cost (at 20 gwei) |
|----------|----------|------------------------------|
| PauserSet | ~250,000 | ~0.005 ETH |
| PrivateForexTrading | ~3,500,000 | ~0.07 ETH |
| **Total** | **~3,750,000** | **~0.075 ETH** |

### Transaction Costs

| Operation | Gas Used | Estimated Cost |
|-----------|----------|----------------|
| Deposit | ~200,000 | ~0.004 ETH |
| Open Position | ~250,000 | ~0.005 ETH |
| Place Order | ~200,000 | ~0.004 ETH |
| Close Position | ~180,000 | ~0.0036 ETH |
| Cancel Order | ~80,000 | ~0.0016 ETH |

*Note: Actual costs vary based on network congestion*

---

## Verification on Etherscan

### Manual Verification

If automatic verification fails:

1. Go to Etherscan contract page
2. Click "Contract" tab
3. Click "Verify and Publish"
4. Select:
   - Compiler: v0.8.24
   - Optimization: Yes (200 runs)
   - License: MIT

5. Paste contract source code
6. Enter constructor arguments

### Constructor Arguments

**PauserSet:**
```
[["0xPauser1Address","0xPauser2Address"]]
```

**PrivateForexTrading:**
```
["0xPauserSetAddress","0xKMSGenerationAddress"]
```

---

## Post-Deployment Checklist

- [ ] Contracts deployed successfully
- [ ] Deployment info saved to deployments/
- [ ] Contracts verified on Etherscan
- [ ] Owner address confirmed
- [ ] Pauser addresses configured
- [ ] Gateway KMS address set
- [ ] Initial state validated (not paused)
- [ ] Constants verified (MIN_DEPOSIT, MAX_LEVERAGE)
- [ ] Interaction script tested
- [ ] Simulation tests passed
- [ ] Frontend updated with contract addresses
- [ ] Documentation updated

---

## Troubleshooting

### Common Issues

#### Issue: Insufficient Funds
```
Error: insufficient funds for intrinsic transaction cost
```
**Solution:** Get more Sepolia ETH from faucet

#### Issue: Invalid Private Key
```
Error: invalid private key
```
**Solution:** Check PRIVATE_KEY in .env (without 0x prefix)

#### Issue: Network Not Configured
```
Error: network sepolia not found
```
**Solution:** Verify hardhat.config.ts has sepolia network configured

#### Issue: Verification Failed
```
Error: Already Verified
```
**Solution:** Contract is already verified, check Etherscan

#### Issue: RPC Rate Limit
```
Error: 429 Too Many Requests
```
**Solution:** Use different RPC provider or wait

---

## Security Considerations

### Before Deployment

- [ ] Audit smart contracts
- [ ] Test on local network
- [ ] Test on testnet
- [ ] Verify access controls
- [ ] Check pause mechanism
- [ ] Validate constants

### After Deployment

- [ ] Secure private keys
- [ ] Monitor contract events
- [ ] Set up pausers
- [ ] Configure Gateway
- [ ] Test emergency procedures
- [ ] Document contract addresses

---

## Support

For deployment assistance:

- **Documentation:** See README.md
- **Contract Code:** See contracts/
- **Test Files:** See test/
- **Zama Docs:** https://docs.zama.ai/fhevm

---

## License

MIT License - See LICENSE file for details
