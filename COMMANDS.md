# Command Reference - Private Forex Trading Platform

Quick reference guide for all available commands in the project.

---

## 📦 Installation & Setup

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# Required: PRIVATE_KEY, SEPOLIA_RPC_URL, ETHERSCAN_API_KEY
```

---

## 🔨 Compilation & Building

```bash
# Compile contracts
npm run compile
npx hardhat compile

# Generate TypeChain types
npm run typechain

# Check contract sizes
npm run size
npx hardhat size-contracts

# Clean build artifacts
npm run clean
npx hardhat clean
```

---

## 🧪 Testing

```bash
# Run all tests
npm run test
npm test
npx hardhat test

# Run specific test file
npx hardhat test test/PrivateForexTrading.test.ts

# Generate coverage report
npm run test:coverage
npx hardhat coverage

# Run tests with gas reporting
npm run test:gas
REPORT_GAS=true npx hardhat test
```

---

## 🚀 Deployment

### Using npm scripts (Recommended)

```bash
# Deploy to Sepolia testnet
npm run deploy:sepolia

# Deploy to localhost
npm run deploy:local

# Deploy to default network
npm run deploy
```

### Using Hardhat directly

```bash
# Deploy to Sepolia
npx hardhat run scripts/deploy.js --network sepolia

# Deploy to localhost
npx hardhat run scripts/deploy.js --network localhost

# Deploy to Hardhat network
npx hardhat run scripts/deploy.js
```

---

## ✅ Verification

### Using npm scripts

```bash
# Verify on Sepolia
npm run verify:sepolia

# Verify on default network
npm run verify
```

### Using Hardhat directly

```bash
# Verify contracts on Sepolia
npx hardhat run scripts/verify.js --network sepolia

# Manual verification
npx hardhat verify --network sepolia CONTRACT_ADDRESS "CONSTRUCTOR_ARG1" "CONSTRUCTOR_ARG2"
```

---

## 🎮 Contract Interaction

### Using npm scripts

```bash
# Interact with Sepolia deployment
npm run interact:sepolia

# Interact with local deployment
npm run interact
```

### Using Hardhat directly

```bash
# Run interaction script
npx hardhat run scripts/interact.js --network sepolia

# Run simulation script
npx hardhat run scripts/simulate.js --network sepolia
```

---

## 🎲 Simulation & Testing

```bash
# Run simulation on Sepolia
npm run simulate:sepolia

# Run simulation on localhost
npm run simulate

# Using Hardhat directly
npx hardhat run scripts/simulate.js --network sepolia
```

---

## 📋 Custom Hardhat Tasks

### Deploy All Contracts

```bash
npx hardhat deploy-all --network sepolia
npx hardhat deploy-all --network sepolia --pausers 2
```

### Verify All Contracts

```bash
npx hardhat verify-all --address 0xCONTRACT_ADDRESS --network sepolia
```

### Get Contract Information

```bash
npx hardhat contract-info --address 0xPRIVATE_FOREX_ADDRESS --network sepolia
```

### Check Pauser Configuration

```bash
npx hardhat check-pausers --address 0xPAUSER_SET_ADDRESS --network sepolia
```

### Test Encryption

```bash
npx hardhat test-encryption --value 1000 --network sepolia
```

---

## 🎨 Code Quality & Formatting

### Linting

```bash
# Lint TypeScript/JavaScript
npm run lint
npx eslint '**/*.{js,ts}'

# Fix linting issues
npm run lint:fix
npx eslint '**/*.{js,ts}' --fix

# Lint Solidity
npm run lint:sol
npx solhint 'contracts/**/*.sol'

# Fix Solidity linting
npm run lint:sol:fix
npx solhint 'contracts/**/*.sol' --fix
```

### Formatting

```bash
# Format all code
npm run format
npx prettier --write '**/*.{js,ts,json,sol,md}'

# Check formatting
npm run format:check
npx prettier --check '**/*.{js,ts,json,sol,md}'
```

---

## 🔒 Security

```bash
# Run security checks
npm run security:check

# Audit dependencies
npm run security:audit
npm audit

# Audit production dependencies only
npm audit --production
```

---

## 🌐 Local Development

```bash
# Start local Hardhat node
npm run node
npx hardhat node

# Start frontend server
npm run dev
npm start
npx http-server . -p 3000 -c-1 --cors
```

---

## 📊 Gas & Performance

```bash
# Test with gas reporting
npm run test:gas

# Size check (automatic on compile)
npm run size

# Coverage report
npm run test:coverage
```

---

## 🔧 Hardhat Console

```bash
# Open Hardhat console
npx hardhat console --network sepolia

# Example console commands:
# const [deployer] = await ethers.getSigners();
# const contract = await ethers.getContractAt("PrivateForexTrading", "0xAddress");
# await contract.owner();
```

---

## 📝 Hardhat Help

```bash
# Show all available tasks
npx hardhat help

# Get help for specific task
npx hardhat help deploy-all
npx hardhat help verify

# List accounts
npx hardhat accounts

# Show network configuration
npx hardhat run scripts/network-info.js
```

---

## 🔄 Complete Deployment Workflow

### Step-by-Step Commands

```bash
# 1. Setup
npm install
cp .env.example .env
# Edit .env with your configuration

# 2. Compile
npm run compile

# 3. Test
npm run test
npm run test:coverage

# 4. Check sizes
npm run size

# 5. Deploy
npm run deploy:sepolia

# 6. Verify
npm run verify:sepolia

# 7. Interact
npm run interact:sepolia

# 8. Simulate
npm run simulate:sepolia
```

---

## 🎯 Quick Commands Cheatsheet

| Task | Command |
|------|---------|
| Install | `npm install` |
| Compile | `npm run compile` |
| Test | `npm run test` |
| Deploy Sepolia | `npm run deploy:sepolia` |
| Verify Sepolia | `npm run verify:sepolia` |
| Interact | `npm run interact:sepolia` |
| Simulate | `npm run simulate:sepolia` |
| Lint Code | `npm run lint` |
| Format Code | `npm run format` |
| Clean Build | `npm run clean` |
| Coverage | `npm run test:coverage` |
| Gas Report | `npm run test:gas` |
| Contract Size | `npm run size` |
| Start Local Node | `npm run node` |
| Start Frontend | `npm run dev` |

---

## 🐛 Debugging Commands

```bash
# Run tests with console logs
npx hardhat test --logs

# Run specific test with verbose output
npx hardhat test test/PrivateForexTrading.test.ts --verbose

# Check Hardhat configuration
npx hardhat config

# Print accounts
npx hardhat accounts --network sepolia

# Flatten contracts (for verification)
npx hardhat flatten contracts/PrivateForexTrading.sol
```

---

## 📦 Package Management

```bash
# Update dependencies
npm update

# Check for outdated packages
npm outdated

# Install specific package
npm install package-name

# Install dev dependency
npm install --save-dev package-name

# Remove package
npm uninstall package-name
```

---

## 🔗 Environment-Specific Commands

### Localhost

```bash
npm run deploy:local
npx hardhat run scripts/deploy.js --network localhost
```

### Sepolia Testnet

```bash
npm run deploy:sepolia
npm run verify:sepolia
npm run interact:sepolia
npm run simulate:sepolia
```

### Hardhat Network (Default)

```bash
npm run deploy
npx hardhat run scripts/deploy.js
```

---

## 💡 Advanced Commands

### Custom Task Execution

```bash
# Run custom task with parameters
npx hardhat deploy-all --network sepolia --pausers 3
npx hardhat contract-info --address 0xABC --network sepolia
```

### Script Execution

```bash
# Run any script
npx hardhat run path/to/script.js --network sepolia

# With custom network
npx hardhat run scripts/deploy.js --network customNetwork
```

### TypeChain Generation

```bash
# Generate TypeScript bindings
npm run typechain
npx hardhat typechain
```

---

## 📋 Pre-commit & Pre-push Hooks

```bash
# These run automatically, but can be run manually:

# Pre-commit checks
npm run pre-commit
# Runs: format:check, lint, lint:sol, test

# Pre-push checks
npm run pre-push
# Runs: security:check, test:coverage
```

---

## 🆘 Help & Information

```bash
# Hardhat help
npx hardhat help

# Task help
npx hardhat help TASK_NAME

# Show accounts
npx hardhat accounts

# Check network
npx hardhat run scripts/network-info.js --network sepolia
```

---

## 📊 Reports & Logs

### Generate Reports

```bash
# Coverage report (creates coverage/ directory)
npm run test:coverage

# Gas report (outputs to console and gas-report.txt)
npm run test:gas

# Size report (outputs during compilation)
npm run size
```

### View Reports

```bash
# Open coverage report
open coverage/index.html

# View gas report
cat gas-report.txt

# Check deployment info
cat deployments/sepolia-deployment.json
```

---

## 🎓 Example Usage

### Complete Development Cycle

```bash
# 1. Initial setup
npm install && cp .env.example .env

# 2. Development
npm run compile
npm run test
npm run lint

# 3. Deployment preparation
npm run format
npm run size
npm run test:coverage

# 4. Deploy to testnet
npm run deploy:sepolia

# 5. Verify contracts
npm run verify:sepolia

# 6. Test deployment
npm run interact:sepolia
npm run simulate:sepolia
```

---

This command reference provides all necessary commands for developing, testing, deploying, and interacting with the Private Forex Trading Platform.
