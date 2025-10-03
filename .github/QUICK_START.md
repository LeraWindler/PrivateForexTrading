# CI/CD Quick Start Guide

## Overview
Complete GitHub Actions CI/CD pipeline for the Private Forex Trading Platform.

## ✅ What's Been Set Up

### 1. Workflows (`.github/workflows/`)
- **test.yml** - Main testing pipeline with multi-version Node.js support
- **quality.yml** - Code quality and security checks
- **deploy.yml** - Automated deployment and releases

### 2. Configuration Files
- **.solhint.json** - Solidity linting rules (existing, verified)
- **.solhintignore** - Excludes build artifacts from linting
- **.codecov.yml** - Code coverage configuration

### 3. Documentation
- **CICD.md** - Complete pipeline documentation
- **SETUP_SUMMARY.md** - Detailed setup guide
- **QUICK_START.md** - This file

## 🚀 Getting Started

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Add GitHub Actions CI/CD pipeline"
git push origin main
```

### Step 2: Configure Codecov
1. Go to [codecov.io](https://codecov.io)
2. Sign in with GitHub
3. Add your repository
4. Copy the upload token
5. Add to GitHub repository secrets:
   - Go to: Settings → Secrets and variables → Actions
   - Click: "New repository secret"
   - Name: `CODECOV_TOKEN`
   - Value: [paste token]
   - Click: "Add secret"

### Step 3: Verify Workflow
1. Visit: `https://github.com/YOUR_USERNAME/YOUR_REPO/actions`
2. Check that workflows are running
3. Review results

## 📋 Test Execution

### Automatic Triggers
- ✅ Every push to `main` or `develop`
- ✅ Every pull request to `main` or `develop`
- ✅ Version tags (for deployment)

### What Gets Tested
- ✅ Node.js 18.x and 20.x
- ✅ Ubuntu and Windows OS
- ✅ Code formatting (Prettier)
- ✅ Linting (ESLint, Solhint)
- ✅ Smart contract compilation
- ✅ Full test suite
- ✅ Code coverage
- ✅ Contract size checks

## 🔍 Local Testing

Before pushing, run these commands locally:

```bash
# Install dependencies
npm ci

# Format code
npm run format

# Run linters
npm run lint
npm run lint:sol

# Compile contracts
npm run compile

# Run tests
npm test

# Check coverage
npm run test:coverage

# Check contract sizes
npm run size
```

## 📊 Monitoring

### View Workflow Status
- Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/actions`
- Click on any workflow run to see details
- Review logs for any failures

### Add Status Badges to README

```markdown
[![CI/CD Pipeline](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/test.yml/badge.svg)](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/test.yml)
[![Code Quality](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/quality.yml/badge.svg)](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/quality.yml)
[![codecov](https://codecov.io/gh/YOUR_USERNAME/YOUR_REPO/branch/main/graph/badge.svg)](https://codecov.io/gh/YOUR_USERNAME/YOUR_REPO)
```

## 🛠️ Troubleshooting

### Workflow Not Running?
1. Check `.github/workflows/` files are pushed to GitHub
2. Verify workflow triggers in YAML files
3. Check repository Actions are enabled (Settings → Actions)

### Tests Failing?
1. Run tests locally first
2. Check CI logs for specific errors
3. Verify all dependencies are in `package.json`
4. Ensure Node.js version compatibility

### Codecov Upload Failing?
1. Verify `CODECOV_TOKEN` secret is set
2. Check coverage files are generated
3. Review `.codecov.yml` configuration

### Linting Errors?
```bash
# Auto-fix linting issues
npm run lint:fix

# Auto-format code
npm run format
```

## 📚 Additional Resources

- **Full Documentation**: `.github/CICD.md`
- **Setup Details**: `.github/SETUP_SUMMARY.md`
- **GitHub Actions Docs**: https://docs.github.com/actions
- **Codecov Docs**: https://docs.codecov.com

## ✨ Features

- ✅ Automated testing on every commit
- ✅ Multi-version Node.js support (18.x, 20.x)
- ✅ Cross-platform testing (Ubuntu, Windows)
- ✅ Code quality enforcement
- ✅ Security audits
- ✅ Coverage tracking
- ✅ Automated deployments
- ✅ Release management

## 🎯 Best Practices

1. **Always test locally** before pushing
2. **Keep dependencies updated**
3. **Review CI failures** promptly
4. **Maintain high coverage** (aim for >80%)
5. **Use semantic versioning** for releases
6. **Write clear commit messages**

---

**Ready to go!** Your CI/CD pipeline is fully configured and ready for use.

For detailed information, see `.github/CICD.md`
