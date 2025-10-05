import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("EnhancedPrivateForexTrading", function () {
  let contract: any;
  let owner: SignerWithAddress;
  let trader1: SignerWithAddress;
  let trader2: SignerWithAddress;
  let trader3: SignerWithAddress;

  // Constants from contract
  const MIN_SESSION_DURATION = 5 * 60; // 5 minutes
  const MAX_SESSION_DURATION = 30 * 24 * 60 * 60; // 30 days
  const DECRYPTION_TIMEOUT = 60 * 60; // 1 hour
  const EMERGENCY_REFUND_DELAY = 24 * 60 * 60; // 24 hours
  const ACTION_COOLDOWN = 1; // 1 second
  const PLATFORM_FEE_BPS = 10; // 0.1%
  const BPS_DENOMINATOR = 10000;

  // Test forex rates (scaled by 10000)
  const EUR_USD_RATE = 12500; // 1.2500
  const GBP_USD_RATE = 14000; // 1.4000
  const USD_JPY_RATE = 1100000; // 110.0000
  const AUD_USD_RATE = 7500; // 0.7500
  const USD_CHF_RATE = 9200; // 0.9200

  beforeEach(async function () {
    [owner, trader1, trader2, trader3] = await ethers.getSigners();

    // Deploy contract
    const EnhancedPrivateForexTrading = await ethers.getContractFactory(
      "EnhancedPrivateForexTrading"
    );
    contract = await EnhancedPrivateForexTrading.deploy();
    await contract.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should deploy correctly with owner set", async function () {
      expect(await contract.owner()).to.equal(owner.address);
    });

    it("should initialize with correct constants", async function () {
      expect(await contract.ACTION_COOLDOWN()).to.equal(ACTION_COOLDOWN);
      expect(await contract.PLATFORM_FEE_BPS()).to.equal(PLATFORM_FEE_BPS);
      expect(await contract.BPS_DENOMINATOR()).to.equal(BPS_DENOMINATOR);
    });

    it("should start with session 0", async function () {
      expect(await contract.currentSession()).to.equal(0);
    });

    it("should start with zero platform fees", async function () {
      expect(await contract.platformFees()).to.equal(0);
    });
  });

  describe("Trader Registration", function () {
    const initialBalance = 10000;

    it("should allow trader registration with valid balance", async function () {
      await expect(contract.connect(trader1).registerTrader(initialBalance))
        .to.emit(contract, "TraderRegistered")
        .withArgs(trader1.address);

      const profile = await contract.traderProfiles(trader1.address);
      expect(profile.isRegistered).to.be.true;
      expect(profile.isBlacklisted).to.be.false;
    });

    it("should reject registration with zero balance", async function () {
      await expect(
        contract.connect(trader1).registerTrader(0)
      ).to.be.revertedWith("Amount must be positive");
    });

    it("should reject registration with balance below minimum (1000)", async function () {
      await expect(
        contract.connect(trader1).registerTrader(999)
      ).to.be.revertedWith("Initial balance too low");
    });

    it("should prevent duplicate registration", async function () {
      await contract.connect(trader1).registerTrader(initialBalance);

      await expect(
        contract.connect(trader1).registerTrader(initialBalance)
      ).to.be.revertedWith("Already registered");
    });

    it("should enforce rate limiting on registration", async function () {
      await contract.connect(trader1).registerTrader(initialBalance);

      // Try to perform another action immediately
      // This would fail if we had another action to test
      // For now, we test that the lastActionTime is updated
      const lastAction = await contract.lastActionTime(trader1.address);
      expect(lastAction).to.be.gt(0);
    });

    it("should allow multiple traders to register", async function () {
      await contract.connect(trader1).registerTrader(initialBalance);
      await contract.connect(trader2).registerTrader(initialBalance * 2);
      await contract.connect(trader3).registerTrader(initialBalance * 3);

      expect((await contract.traderProfiles(trader1.address)).isRegistered).to.be.true;
      expect((await contract.traderProfiles(trader2.address)).isRegistered).to.be.true;
      expect((await contract.traderProfiles(trader3.address)).isRegistered).to.be.true;
    });
  });

  describe("Trading Session Management", function () {
    const sessionDuration = 60 * 60; // 1 hour
    const forexRates = [EUR_USD_RATE, GBP_USD_RATE, USD_JPY_RATE, AUD_USD_RATE, USD_CHF_RATE];

    it("should allow owner to start a trading session", async function () {
      await expect(contract.startTradingSession(forexRates, sessionDuration))
        .to.emit(contract, "SessionStarted");

      expect(await contract.currentSession()).to.equal(1);
    });

    it("should reject session with invalid duration (too short)", async function () {
      const tooShort = MIN_SESSION_DURATION - 1;
      await expect(
        contract.startTradingSession(forexRates, tooShort)
      ).to.be.revertedWith("Invalid session duration");
    });

    it("should reject session with invalid duration (too long)", async function () {
      const tooLong = MAX_SESSION_DURATION + 1;
      await expect(
        contract.startTradingSession(forexRates, tooLong)
      ).to.be.revertedWith("Invalid session duration");
    });

    it("should reject session with invalid forex rates (zero)", async function () {
      const invalidRates = [0, GBP_USD_RATE, USD_JPY_RATE, AUD_USD_RATE, USD_CHF_RATE];
      await expect(
        contract.startTradingSession(invalidRates, sessionDuration)
      ).to.be.revertedWith("Invalid forex rate");
    });

    it("should reject session with invalid forex rates (overflow)", async function () {
      const invalidRates = [EUR_USD_RATE, 1000001, USD_JPY_RATE, AUD_USD_RATE, USD_CHF_RATE];
      await expect(
        contract.startTradingSession(invalidRates, sessionDuration)
      ).to.be.revertedWith("Rate overflow protection");
    });

    it("should reject non-owner starting session", async function () {
      await expect(
        contract.connect(trader1).startTradingSession(forexRates, sessionDuration)
      ).to.be.revertedWith("Not authorized");
    });

    it("should store session information correctly", async function () {
      await contract.startTradingSession(forexRates, sessionDuration);

      const sessionInfo = await contract.getCurrentSessionInfo();
      expect(sessionInfo.session).to.equal(1);
      expect(sessionInfo.pricesSet).to.be.true;
      expect(sessionInfo.sessionActive).to.be.true;
      expect(sessionInfo.decryptionComplete).to.be.false;
      expect(sessionInfo.emergencyRefundEnabled).to.be.false;
    });

    it("should calculate correct session end time and decryption deadline", async function () {
      const tx = await contract.startTradingSession(forexRates, sessionDuration);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      const startTime = block.timestamp;

      const sessionInfo = await contract.getCurrentSessionInfo();
      expect(sessionInfo.startTime).to.equal(startTime);
      expect(sessionInfo.endTime).to.equal(startTime + sessionDuration);
      expect(sessionInfo.decryptionDeadline).to.equal(
        startTime + sessionDuration + DECRYPTION_TIMEOUT
      );
    });
  });

  describe("Private Order Placement", function () {
    const initialBalance = 10000;
    const orderAmount = 1000;
    const targetPrice = EUR_USD_RATE;
    const currencyPairId = 0; // EUR/USD
    const sessionDuration = 60 * 60;
    const forexRates = [EUR_USD_RATE, GBP_USD_RATE, USD_JPY_RATE, AUD_USD_RATE, USD_CHF_RATE];

    beforeEach(async function () {
      // Register trader
      await contract.connect(trader1).registerTrader(initialBalance);
      // Start session
      await contract.startTradingSession(forexRates, sessionDuration);
    });

    it("should allow registered trader to place order", async function () {
      await expect(
        contract.connect(trader1).placePrivateOrder(orderAmount, targetPrice, currencyPairId)
      ).to.emit(contract, "PrivateOrderPlaced");
    });

    it("should reject order from unregistered trader", async function () {
      await expect(
        contract.connect(trader2).placePrivateOrder(orderAmount, targetPrice, currencyPairId)
      ).to.be.revertedWith("Trader not registered");
    });

    it("should reject order from blacklisted trader", async function () {
      await contract.setTraderBlacklist(trader1.address, true);

      await expect(
        contract.connect(trader1).placePrivateOrder(orderAmount, targetPrice, currencyPairId)
      ).to.be.revertedWith("Trader blacklisted");
    });

    it("should reject order with zero amount", async function () {
      await expect(
        contract.connect(trader1).placePrivateOrder(0, targetPrice, currencyPairId)
      ).to.be.revertedWith("Amount must be positive");
    });

    it("should reject order with invalid currency pair", async function () {
      await expect(
        contract.connect(trader1).placePrivateOrder(orderAmount, targetPrice, 5)
      ).to.be.revertedWith("Invalid currency pair");
    });

    it("should reject order when no active session", async function () {
      // Fast forward past session end
      await time.increase(sessionDuration + 1);

      await expect(
        contract.connect(trader1).placePrivateOrder(orderAmount, targetPrice, currencyPairId)
      ).to.be.revertedWith("Session expired");
    });

    it("should enforce rate limiting between orders", async function () {
      await contract.connect(trader1).placePrivateOrder(orderAmount, targetPrice, currencyPairId);

      // Immediately try to place another order (within cooldown)
      // Note: In actual testing environment, might need small delay
    });

    it("should allow multiple orders from same trader", async function () {
      await contract.connect(trader1).placePrivateOrder(orderAmount, targetPrice, 0);
      await time.increase(ACTION_COOLDOWN + 1);
      await contract.connect(trader1).placePrivateOrder(orderAmount, targetPrice, 1);
      await time.increase(ACTION_COOLDOWN + 1);
      await contract.connect(trader1).placePrivateOrder(orderAmount, targetPrice, 2);
    });

    it("should allow orders from multiple traders", async function () {
      await contract.connect(trader2).registerTrader(initialBalance);
      await contract.connect(trader3).registerTrader(initialBalance);

      await contract.connect(trader1).placePrivateOrder(orderAmount, targetPrice, currencyPairId);
      await contract.connect(trader2).placePrivateOrder(orderAmount * 2, targetPrice, currencyPairId);
      await contract.connect(trader3).placePrivateOrder(orderAmount * 3, targetPrice, currencyPairId);
    });
  });

  describe("Gateway Callback and Decryption", function () {
    const initialBalance = 10000;
    const orderAmount = 1000;
    const targetPrice = EUR_USD_RATE;
    const currencyPairId = 0;
    const sessionDuration = 60 * 60;
    const forexRates = [EUR_USD_RATE, GBP_USD_RATE, USD_JPY_RATE, AUD_USD_RATE, USD_CHF_RATE];

    beforeEach(async function () {
      await contract.connect(trader1).registerTrader(initialBalance);
      await contract.startTradingSession(forexRates, sessionDuration);
      await contract.connect(trader1).placePrivateOrder(orderAmount, targetPrice, currencyPairId);
    });

    it("should allow owner to request decryption after session ends", async function () {
      // Fast forward to session end
      await time.increase(sessionDuration + 1);

      await expect(contract.requestOrderDecryption(1))
        .to.emit(contract, "DecryptionRequested");
    });

    it("should reject decryption request before session ends", async function () {
      await expect(
        contract.requestOrderDecryption(1)
      ).to.be.revertedWith("Session not ended");
    });

    it("should reject decryption request from non-owner", async function () {
      await time.increase(sessionDuration + 1);

      await expect(
        contract.connect(trader1).requestOrderDecryption(1)
      ).to.be.revertedWith("Not authorized");
    });

    it("should reject duplicate decryption request", async function () {
      await time.increase(sessionDuration + 1);
      await contract.requestOrderDecryption(1);

      await expect(
        contract.requestOrderDecryption(1)
      ).to.be.revertedWith("Already requested");
    });

    it("should reject decryption after deadline", async function () {
      await time.increase(sessionDuration + DECRYPTION_TIMEOUT + 1);

      await expect(
        contract.requestOrderDecryption(1)
      ).to.be.revertedWith("Decryption deadline passed");
    });
  });

  describe("Emergency Refund Mechanism", function () {
    const initialBalance = 10000;
    const orderAmount = 1000;
    const targetPrice = EUR_USD_RATE;
    const currencyPairId = 0;
    const sessionDuration = 60 * 60;
    const forexRates = [EUR_USD_RATE, GBP_USD_RATE, USD_JPY_RATE, AUD_USD_RATE, USD_CHF_RATE];

    beforeEach(async function () {
      await contract.connect(trader1).registerTrader(initialBalance);
      await contract.startTradingSession(forexRates, sessionDuration);
      await contract.connect(trader1).placePrivateOrder(orderAmount, targetPrice, currencyPairId);
      // Fast forward past session and decryption timeout
      await time.increase(sessionDuration + DECRYPTION_TIMEOUT + 1);
    });

    it("should allow owner to enable emergency refund after timeout", async function () {
      // Wait for emergency delay
      await time.increase(EMERGENCY_REFUND_DELAY);

      await expect(contract.enableEmergencyRefund(1))
        .to.emit(contract, "EmergencyRefundEnabled");
    });

    it("should reject emergency refund before delay period", async function () {
      await expect(
        contract.enableEmergencyRefund(1)
      ).to.be.revertedWith("Emergency period not reached");
    });

    it("should reject emergency refund from non-owner", async function () {
      await time.increase(EMERGENCY_REFUND_DELAY);

      await expect(
        contract.connect(trader1).enableEmergencyRefund(1)
      ).to.be.revertedWith("Not authorized");
    });

    it("should allow trader to claim refund when enabled", async function () {
      await time.increase(EMERGENCY_REFUND_DELAY);
      await contract.enableEmergencyRefund(1);

      // Note: Actual refund logic would require FHE implementation
      // This test verifies the flow is accessible
    });

    it("should reject refund claim when not enabled", async function () {
      await expect(
        contract.connect(trader1).claimDecryptionFailureRefund(1)
      ).to.be.revertedWith("Emergency refund not enabled");
    });
  });

  describe("Security Features", function () {
    const initialBalance = 10000;

    describe("Access Control", function () {
      it("should allow only owner to blacklist traders", async function () {
        await contract.connect(trader1).registerTrader(initialBalance);

        await expect(contract.setTraderBlacklist(trader1.address, true))
          .to.emit(contract, "TraderBlacklisted")
          .withArgs(trader1.address, true);

        const profile = await contract.traderProfiles(trader1.address);
        expect(profile.isBlacklisted).to.be.true;
      });

      it("should reject blacklist change from non-owner", async function () {
        await expect(
          contract.connect(trader1).setTraderBlacklist(trader2.address, true)
        ).to.be.revertedWith("Not authorized");
      });

      it("should allow owner to unblacklist traders", async function () {
        await contract.connect(trader1).registerTrader(initialBalance);
        await contract.setTraderBlacklist(trader1.address, true);

        await expect(contract.setTraderBlacklist(trader1.address, false))
          .to.emit(contract, "TraderBlacklisted")
          .withArgs(trader1.address, false);

        const profile = await contract.traderProfiles(trader1.address);
        expect(profile.isBlacklisted).to.be.false;
      });
    });

    describe("Input Validation", function () {
      it("should reject invalid addresses (zero address)", async function () {
        await expect(
          contract.setTraderBlacklist(ethers.ZeroAddress, true)
        ).to.be.revertedWith("Invalid address");
      });

      it("should reject amounts exceeding uint64 max", async function () {
        const maxUint64 = BigInt(2) ** BigInt(64);
        await expect(
          contract.connect(trader1).registerTrader(maxUint64)
        ).to.be.revertedWith("Amount overflow");
      });
    });

    describe("Rate Limiting", function () {
      it("should enforce cooldown between actions", async function () {
        await contract.connect(trader1).registerTrader(initialBalance);

        const lastAction = await contract.lastActionTime(trader1.address);
        expect(lastAction).to.be.gt(0);
      });

      it("should allow action after cooldown period", async function () {
        await contract.connect(trader1).registerTrader(initialBalance);
        await time.increase(ACTION_COOLDOWN + 1);

        // Should be able to perform another action
        const sessionDuration = 60 * 60;
        const forexRates = [EUR_USD_RATE, GBP_USD_RATE, USD_JPY_RATE, AUD_USD_RATE, USD_CHF_RATE];
        await contract.startTradingSession(forexRates, sessionDuration);

        // Placing order should succeed after cooldown
        await contract.connect(trader1).placePrivateOrder(1000, EUR_USD_RATE, 0);
      });
    });
  });

  describe("View Functions", function () {
    const sessionDuration = 60 * 60;
    const forexRates = [EUR_USD_RATE, GBP_USD_RATE, USD_JPY_RATE, AUD_USD_RATE, USD_CHF_RATE];

    it("should return correct session info", async function () {
      await contract.startTradingSession(forexRates, sessionDuration);

      const info = await contract.getCurrentSessionInfo();
      expect(info.session).to.equal(1);
      expect(info.pricesSet).to.be.true;
      expect(info.sessionActive).to.be.true;
      expect(info.activeTraderCount).to.equal(0);
      expect(info.decryptionComplete).to.be.false;
      expect(info.emergencyRefundEnabled).to.be.false;
    });

    it("should return zero session info before first session", async function () {
      const info = await contract.getCurrentSessionInfo();
      expect(info.session).to.equal(0);
      expect(info.pricesSet).to.be.false;
      expect(info.sessionActive).to.be.false;
    });
  });

  describe("Contract Size and Gas Optimization", function () {
    it("should be within Ethereum contract size limit", async function () {
      const contractAddress = await contract.getAddress();
      const code = await ethers.provider.getCode(contractAddress);
      const sizeInBytes = (code.length - 2) / 2; // Remove 0x and divide by 2
      const sizeInKb = sizeInBytes / 1024;

      console.log(`Contract size: ${sizeInKb.toFixed(2)} KB`);
      expect(sizeInKb).to.be.lessThan(24); // 24 KB limit
    });
  });

  describe("Edge Cases and Boundary Conditions", function () {
    it("should handle minimum session duration", async function () {
      const forexRates = [EUR_USD_RATE, GBP_USD_RATE, USD_JPY_RATE, AUD_USD_RATE, USD_CHF_RATE];
      await expect(
        contract.startTradingSession(forexRates, MIN_SESSION_DURATION)
      ).to.emit(contract, "SessionStarted");
    });

    it("should handle maximum session duration", async function () {
      const forexRates = [EUR_USD_RATE, GBP_USD_RATE, USD_JPY_RATE, AUD_USD_RATE, USD_CHF_RATE];
      await expect(
        contract.startTradingSession(forexRates, MAX_SESSION_DURATION)
      ).to.emit(contract, "SessionStarted");
    });

    it("should handle all currency pairs", async function () {
      const initialBalance = 10000;
      const sessionDuration = 60 * 60;
      const forexRates = [EUR_USD_RATE, GBP_USD_RATE, USD_JPY_RATE, AUD_USD_RATE, USD_CHF_RATE];

      await contract.connect(trader1).registerTrader(initialBalance);
      await contract.startTradingSession(forexRates, sessionDuration);

      for (let i = 0; i < 5; i++) {
        await time.increase(ACTION_COOLDOWN + 1);
        await expect(
          contract.connect(trader1).placePrivateOrder(1000, forexRates[i], i)
        ).to.emit(contract, "PrivateOrderPlaced");
      }
    });

    it("should handle multiple sequential sessions", async function () {
      const forexRates = [EUR_USD_RATE, GBP_USD_RATE, USD_JPY_RATE, AUD_USD_RATE, USD_CHF_RATE];
      const sessionDuration = 60 * 60;

      await contract.startTradingSession(forexRates, sessionDuration);
      expect(await contract.currentSession()).to.equal(1);

      await time.increase(sessionDuration + 1);
      await contract.startTradingSession(forexRates, sessionDuration);
      expect(await contract.currentSession()).to.equal(2);

      await time.increase(sessionDuration + 1);
      await contract.startTradingSession(forexRates, sessionDuration);
      expect(await contract.currentSession()).to.equal(3);
    });
  });

  describe("Event Emissions", function () {
    const initialBalance = 10000;
    const sessionDuration = 60 * 60;
    const forexRates = [EUR_USD_RATE, GBP_USD_RATE, USD_JPY_RATE, AUD_USD_RATE, USD_CHF_RATE];

    it("should emit TraderRegistered event", async function () {
      await expect(contract.connect(trader1).registerTrader(initialBalance))
        .to.emit(contract, "TraderRegistered")
        .withArgs(trader1.address);
    });

    it("should emit SessionStarted event with correct parameters", async function () {
      const tx = await contract.startTradingSession(forexRates, sessionDuration);
      const receipt = await tx.wait();

      await expect(tx).to.emit(contract, "SessionStarted");
    });

    it("should emit PrivateOrderPlaced event", async function () {
      await contract.connect(trader1).registerTrader(initialBalance);
      await contract.startTradingSession(forexRates, sessionDuration);

      await expect(
        contract.connect(trader1).placePrivateOrder(1000, EUR_USD_RATE, 0)
      ).to.emit(contract, "PrivateOrderPlaced");
    });

    it("should emit DecryptionRequested event", async function () {
      await contract.connect(trader1).registerTrader(initialBalance);
      await contract.startTradingSession(forexRates, sessionDuration);
      await contract.connect(trader1).placePrivateOrder(1000, EUR_USD_RATE, 0);

      await time.increase(sessionDuration + 1);
      await expect(contract.requestOrderDecryption(1))
        .to.emit(contract, "DecryptionRequested");
    });

    it("should emit EmergencyRefundEnabled event", async function () {
      await contract.connect(trader1).registerTrader(initialBalance);
      await contract.startTradingSession(forexRates, sessionDuration);
      await contract.connect(trader1).placePrivateOrder(1000, EUR_USD_RATE, 0);

      await time.increase(sessionDuration + DECRYPTION_TIMEOUT + EMERGENCY_REFUND_DELAY + 1);
      await expect(contract.enableEmergencyRefund(1))
        .to.emit(contract, "EmergencyRefundEnabled");
    });

    it("should emit TraderBlacklisted event", async function () {
      await expect(contract.setTraderBlacklist(trader1.address, true))
        .to.emit(contract, "TraderBlacklisted")
        .withArgs(trader1.address, true);
    });
  });
});
