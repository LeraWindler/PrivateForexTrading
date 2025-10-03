# CI/CD Pipeline Documentation

## Overview

This project uses GitHub Actions for continuous integration and continuous deployment (CI/CD). The pipeline ensures code quality, runs automated tests, and provides deployment capabilities.

## Workflows

### 1. Test Pipeline (`test.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

**Test Matrix:**
- Node.js versions: 18.x, 20.x
- Operating Systems: Ubuntu Latest, Windows Latest

**Steps:**
1. Checkout repository
2. Setup Node.js environment
3. Install dependencies
4. Check code formatting (Prettier)
5. Run ESLint
6. Run Solhint for Solidity code
7. Compile smart contracts
8. Run test suite
9. Generate coverage report (Ubuntu + Node 20.x only)
10. Upload coverage to Codecov
11. Check contract sizes

### 2. Code Quality Pipeline (`quality.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

**Jobs:**

#### Lint Job
- Prettier formatting check
- ESLint for JavaScript/TypeScript
- Solhint for Solidity files

#### Security Job
- npm security audit
- Contract compilation verification

### 3. Deploy Pipeline (`deploy.yml`)

**Triggers:**
- Push to `main` branch
- Version tags (v*)

**Steps:**
1. Checkout repository
2. Setup environment
3. Install dependencies
4. Compile contracts
5. Run tests
6. Create GitHub release (on tag push)

## Configuration Files

### `.solhint.json`
Solhint configuration for Solidity linting with:
- Code complexity checks
- Security best practices
- Naming conventions
- Gas optimization warnings

### `.solhintignore`
Excludes test files, build artifacts, and dependencies from Solidity linting.

### `.codecov.yml`
Codecov integration configuration:
- Coverage thresholds: 70-100%
- Project and patch coverage tracking
- Automated coverage reports on PRs

## Setup Instructions

### 1. Enable GitHub Actions
GitHub Actions is enabled by default. No additional setup required.

### 2. Configure Codecov

1. Sign up at [codecov.io](https://codecov.io)
2. Add your repository
3. Get the upload token
4. Add the token as a secret:
   - Go to repository Settings → Secrets and variables → Actions
   - Create new secret: `CODECOV_TOKEN`
   - Paste your Codecov token

### 3. Required Secrets

Add these secrets in your GitHub repository settings:

- `CODECOV_TOKEN`: Codecov upload token (for coverage reports)
- `GITHUB_TOKEN`: Automatically provided by GitHub Actions

### 4. Branch Protection Rules (Recommended)

Set up branch protection for `main` and `develop`:

1. Go to Settings → Branches
2. Add rule for `main`:
   - Require pull request reviews
   - Require status checks to pass:
     - Test on Node 18.x - ubuntu-latest
     - Test on Node 20.x - ubuntu-latest
     - Linting and Formatting
   - Require branches to be up to date

## Running Tests Locally

```bash
# Install dependencies
npm ci

# Run linting
npm run lint
npm run lint:sol

# Check formatting
npm run format:check

# Compile contracts
npm run compile

# Run tests
npm test

# Generate coverage
npm run test:coverage

# Check contract sizes
npm run size
```

## Workflow Status Badges

Add these badges to your README.md:

```markdown
[![CI/CD Pipeline](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/test.yml/badge.svg)](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/test.yml)
[![Code Quality](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/quality.yml/badge.svg)](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/quality.yml)
[![codecov](https://codecov.io/gh/YOUR_USERNAME/YOUR_REPO/branch/main/graph/badge.svg)](https://codecov.io/gh/YOUR_USERNAME/YOUR_REPO)
```

## Troubleshooting

### Tests Failing in CI but Passing Locally

1. Ensure all dependencies are in `package.json`
2. Check for environment-specific issues
3. Review the CI logs for specific error messages

### Coverage Upload Failing

1. Verify `CODECOV_TOKEN` is set correctly
2. Ensure coverage files are being generated
3. Check Codecov configuration in `.codecov.yml`

### Linting Errors

1. Run `npm run lint:fix` to auto-fix issues
2. Run `npm run format` to fix formatting
3. Review `.solhint.json` for Solidity-specific rules

## Best Practices

1. **Always run tests locally** before pushing
2. **Keep dependencies updated** regularly
3. **Review CI failures** immediately
4. **Maintain high test coverage** (aim for >80%)
5. **Use semantic versioning** for releases
6. **Write meaningful commit messages**

## Continuous Improvement

The CI/CD pipeline is configured to:
- Run tests on multiple Node.js versions
- Check code quality on every commit
- Generate coverage reports
- Enforce code standards
- Automate deployment processes

Regular reviews and updates to the pipeline ensure optimal performance and security.
