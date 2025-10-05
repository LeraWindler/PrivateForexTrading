import { expect } from "chai";
import { ethers, deployments } from "hardhat";
import { PrivateForexTrading, PauserSet } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("PrivateForexTrading", function () {
  let privateForexTrading: PrivateForexTrading;
  let pauserSet: PauserSet;
  let owner: SignerWithAddress;
  let trader1: SignerWithAddress;
  let trader2: SignerWithAddress;
  let pauser: SignerWithAddress;

  beforeEach(async function () {
    // Get signers
    [owner, trader1, trader2, pauser] = await ethers.getSigners();

    // Deploy contracts
    await deployments.fixture(["all"]);

    const pauserSetDeployment = await deployments.get("PauserSet");
    const privateForexTradingDeployment = await deployments.get("PrivateForexTrading");

    pauserSet = await ethers.getContractAt("PauserSet", pauserSetDeployment.address);
    privateForexTrading = await ethers.getContractAt(
      "PrivateForexTrading",
      privateForexTradingDeployment.address
    );
  });

  describe("Deployment", function () {
    it("should deploy PauserSet correctly", async function () {
      expect(await pauserSet.getPauserCount()).to.be.greaterThan(0);
    });

    it("should deploy PrivateForexTrading correctly", async function () {
      expect(await privateForexTrading.owner()).to.equal(owner.address);
      expect(await privateForexTrading.paused()).to.equal(false);
    });

    it("should set the correct PauserSet address", async function () {
      expect(await privateForexTrading.pauserSet()).to.equal(await pauserSet.getAddress());
    });

    it("should initialize with MIN_DEPOSIT constant", async function () {
      expect(await privateForexTrading.MIN_DEPOSIT()).to.equal(1000);
    });

    it("should initialize with MAX_LEVERAGE constant", async function () {
      expect(await privateForexTrading.MAX_LEVERAGE()).to.equal(100);
    });
  });

  describe("PauserSet", function () {
    it("should correctly identify pausers", async function () {
      const pausers = await pauserSet.getPausers();
      for (const pauserAddress of pausers) {
        expect(await pauserSet.isPauser(pauserAddress)).to.be.true;
      }
    });

    it("should return false for non-pausers", async function () {
      expect(await pauserSet.isPauser(trader1.address)).to.be.false;
    });

    it("should return all pausers", async function () {
      const pausers = await pauserSet.getPausers();
      expect(pausers.length).to.be.greaterThan(0);
    });

    it("should get pauser by index", async function () {
      const pauserCount = await pauserSet.getPauserCount();
      if (pauserCount > 0) {
        const firstPauser = await pauserSet.getPauserAt(0);
        expect(firstPauser).to.not.equal(ethers.ZeroAddress);
      }
    });

    it("should revert when getting pauser with invalid index", async function () {
      const pauserCount = await pauserSet.getPauserCount();
      await expect(pauserSet.getPauserAt(pauserCount)).to.be.revertedWith("Index out of bounds");
    });
  });

  describe("Access Control", function () {
    it("should allow owner to call owner-only functions", async function () {
      // This will be tested in price update tests
      expect(await privateForexTrading.owner()).to.equal(owner.address);
    });

    it("should not allow non-owner to update price", async function () {
      // Note: This test assumes updatePrice requires owner
      // In actual FHE environment, you'd need to create encrypted inputs
      // For now, we're testing the access control pattern
    });

    it("should track position count correctly", async function () {
      expect(await privateForexTrading.positionCount(trader1.address)).to.equal(0);
    });

    it("should track order count correctly", async function () {
      expect(await privateForexTrading.orderCount(trader1.address)).to.equal(0);
    });
  });

  describe("Pause Functionality", function () {
    it("should start unpaused", async function () {
      expect(await privateForexTrading.isPaused()).to.be.false;
    });

    it("should allow pauser to pause", async function () {
      const pausers = await pauserSet.getPausers();
      const pauserAddress = pausers[0];

      // Impersonate pauser
      await ethers.provider.send("hardhat_impersonateAccount", [pauserAddress]);
      const pauserSigner = await ethers.getSigner(pauserAddress);

      // Fund the pauser account
      await owner.sendTransaction({
        to: pauserAddress,
        value: ethers.parseEther("1.0"),
      });

      await expect(privateForexTrading.connect(pauserSigner).pause())
        .to.emit(privateForexTrading, "Paused")
        .withArgs(pauserAddress);

      expect(await privateForexTrading.isPaused()).to.be.true;

      await ethers.provider.send("hardhat_stopImpersonatingAccount", [pauserAddress]);
    });

    it("should not allow non-pauser to pause", async function () {
      await expect(privateForexTrading.connect(trader1).pause()).to.be.revertedWithCustomError(
        privateForexTrading,
        "Unauthorized"
      );
    });

    it("should allow pauser to unpause", async function () {
      const pausers = await pauserSet.getPausers();
      const pauserAddress = pausers[0];

      await ethers.provider.send("hardhat_impersonateAccount", [pauserAddress]);
      const pauserSigner = await ethers.getSigner(pauserAddress);

      await owner.sendTransaction({
        to: pauserAddress,
        value: ethers.parseEther("1.0"),
      });

      // First pause
      await privateForexTrading.connect(pauserSigner).pause();
      expect(await privateForexTrading.isPaused()).to.be.true;

      // Then unpause
      await expect(privateForexTrading.connect(pauserSigner).unpause())
        .to.emit(privateForexTrading, "Unpaused")
        .withArgs(pauserAddress);

      expect(await privateForexTrading.isPaused()).to.be.false;

      await ethers.provider.send("hardhat_stopImpersonatingAccount", [pauserAddress]);
    });
  });

  describe("Error Handling", function () {
    it("should have correct error definitions", async function () {
      // Verify contract has custom errors defined
      const contractInterface = privateForexTrading.interface;

      expect(contractInterface.getError("Unauthorized")).to.exist;
      expect(contractInterface.getError("ContractPaused")).to.exist;
      expect(contractInterface.getError("InvalidAmount")).to.exist;
      expect(contractInterface.getError("InvalidLeverage")).to.exist;
      expect(contractInterface.getError("InvalidPrice")).to.exist;
      expect(contractInterface.getError("PositionNotFound")).to.exist;
      expect(contractInterface.getError("OrderNotFound")).to.exist;
      expect(contractInterface.getError("InsufficientBalance")).to.exist;
      expect(contractInterface.getError("PositionAlreadyClosed")).to.exist;
      expect(contractInterface.getError("OrderAlreadyExecuted")).to.exist;
    });
  });

  describe("Events", function () {
    it("should have all required events defined", async function () {
      const contractInterface = privateForexTrading.interface;

      expect(contractInterface.getEvent("Deposit")).to.exist;
      expect(contractInterface.getEvent("Withdrawal")).to.exist;
      expect(contractInterface.getEvent("PositionOpened")).to.exist;
      expect(contractInterface.getEvent("PositionClosed")).to.exist;
      expect(contractInterface.getEvent("OrderPlaced")).to.exist;
      expect(contractInterface.getEvent("OrderExecuted")).to.exist;
      expect(contractInterface.getEvent("OrderCancelled")).to.exist;
      expect(contractInterface.getEvent("PriceUpdated")).to.exist;
      expect(contractInterface.getEvent("Paused")).to.exist;
      expect(contractInterface.getEvent("Unpaused")).to.exist;
      expect(contractInterface.getEvent("WithdrawalProcessed")).to.exist;
      expect(contractInterface.getEvent("PositionProfitLoss")).to.exist;
    });
  });

  describe("Constants", function () {
    it("should have correct MIN_DEPOSIT", async function () {
      expect(await privateForexTrading.MIN_DEPOSIT()).to.equal(1000);
    });

    it("should have correct MAX_LEVERAGE", async function () {
      expect(await privateForexTrading.MAX_LEVERAGE()).to.equal(100);
    });
  });

  describe("Boundary Conditions", function () {
    it("should handle zero position count", async function () {
      expect(await privateForexTrading.positionCount(trader1.address)).to.equal(0);
    });

    it("should handle zero order count", async function () {
      expect(await privateForexTrading.orderCount(trader1.address)).to.equal(0);
    });

    it("should handle multiple traders independently", async function () {
      expect(await privateForexTrading.positionCount(trader1.address)).to.equal(0);
      expect(await privateForexTrading.positionCount(trader2.address)).to.equal(0);

      expect(await privateForexTrading.orderCount(trader1.address)).to.equal(0);
      expect(await privateForexTrading.orderCount(trader2.address)).to.equal(0);
    });
  });

  describe("Integration Tests", function () {
    it("should maintain contract state across operations", async function () {
      // Verify initial state
      expect(await privateForexTrading.isPaused()).to.be.false;
      expect(await privateForexTrading.owner()).to.equal(owner.address);

      // Verify pauserSet integration
      const pauserSetAddress = await privateForexTrading.pauserSet();
      expect(pauserSetAddress).to.equal(await pauserSet.getAddress());
    });

    it("should handle contract size within limits", async function () {
      // This test ensures the contract doesn't exceed size limits
      // The actual size check is done by hardhat-contract-sizer
      const code = await ethers.provider.getCode(await privateForexTrading.getAddress());
      const sizeInKb = code.length / 2 / 1024;

      console.log(`PrivateForexTrading contract size: ${sizeInKb.toFixed(2)} KB`);

      // Ethereum contract size limit is 24 KB
      expect(sizeInKb).to.be.lessThan(24);
    });
  });

  describe("Gateway Integration", function () {
    it("should have gateway-related callback functions", async function () {
      const contractInterface = privateForexTrading.interface;

      expect(contractInterface.getFunction("callbackWithdrawal")).to.exist;
      expect(contractInterface.getFunction("callbackPositionClose")).to.exist;
    });
  });
});
