// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint64, euint32, euint8, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract PrivateForexTrading is SepoliaConfig {

    address public owner;
    uint32 public currentSession;
    uint256 public lastSessionTime;

    // Trading session duration (4 hours = 14400 seconds)
    uint256 constant SESSION_DURATION = 14400;

    // Supported currency pairs (using enum for gas efficiency)
    enum CurrencyPair { EUR_USD, GBP_USD, USD_JPY, AUD_USD, USD_CHF }

    struct PrivateOrder {
        euint64 encryptedAmount;      // Encrypted trade amount
        euint32 encryptedPrice;       // Encrypted target price (scaled by 10000)
        euint8 encryptedPairId;       // Encrypted currency pair ID
        bool isExecuted;
        uint256 timestamp;
        address trader;
    }

    struct TradingSession {
        euint32[5] sessionPrices;     // Current prices for each pair (encrypted)
        bool pricesSet;
        bool sessionActive;
        uint256 startTime;
        uint256 endTime;
        address[] activeTraders;
        uint256 totalVolume;
    }

    struct TraderProfile {
        euint64 encryptedBalance;     // Private balance
        euint32 totalTrades;
        bool isRegistered;
        uint256 lastActivity;
    }

    mapping(uint32 => TradingSession) public tradingSessions;
    mapping(uint32 => mapping(address => PrivateOrder[])) public privateOrders;
    mapping(address => TraderProfile) public traderProfiles;
    mapping(uint32 => mapping(CurrencyPair => euint32)) public sessionRates;

    event SessionStarted(uint32 indexed session, uint256 startTime);
    event PrivateOrderPlaced(address indexed trader, uint32 indexed session, uint256 orderIndex);
    event OrderExecuted(address indexed trader, uint32 indexed session, uint256 orderIndex);
    event PricesUpdated(uint32 indexed session);
    event TraderRegistered(address indexed trader);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    modifier onlyRegisteredTrader() {
        require(traderProfiles[msg.sender].isRegistered, "Trader not registered");
        _;
    }

    modifier onlyDuringSession() {
        require(isSessionActive(), "No active trading session");
        _;
    }

    modifier onlyOutsideSession() {
        require(!isSessionActive(), "Session currently active");
        _;
    }

    constructor() {
        owner = msg.sender;
        currentSession = 1;
        lastSessionTime = block.timestamp;
    }

    // Check if trading session is currently active
    function isSessionActive() public view returns (bool) {
        TradingSession storage session = tradingSessions[currentSession];
        return session.sessionActive &&
               session.pricesSet &&
               block.timestamp >= session.startTime &&
               block.timestamp <= session.endTime;
    }

    // Register as a private trader
    function registerTrader(uint64 _initialBalance) external {
        require(!traderProfiles[msg.sender].isRegistered, "Already registered");
        require(_initialBalance > 0, "Initial balance must be positive");

        // Encrypt the initial balance
        euint64 encryptedBalance = FHE.asEuint64(_initialBalance);
        euint32 encryptedTotalTrades = FHE.asEuint32(0);

        traderProfiles[msg.sender] = TraderProfile({
            encryptedBalance: encryptedBalance,
            totalTrades: encryptedTotalTrades,
            isRegistered: true,
            lastActivity: block.timestamp
        });

        // Set ACL permissions
        FHE.allowThis(encryptedBalance);
        FHE.allow(encryptedBalance, msg.sender);
        FHE.allowThis(encryptedTotalTrades);
        FHE.allow(encryptedTotalTrades, msg.sender);

        emit TraderRegistered(msg.sender);
    }

    // Start new trading session with encrypted forex rates
    function startTradingSession(
        uint32[5] memory _forexRates  // Rates for EUR/USD, GBP/USD, USD/JPY, AUD/USD, USD/CHF
    ) external onlyOwner onlyOutsideSession {
        require(block.timestamp >= lastSessionTime + SESSION_DURATION, "Too early for new session");

        TradingSession storage newSession = tradingSessions[currentSession];

        // Encrypt all forex rates
        for (uint i = 0; i < 5; i++) {
            euint32 encryptedRate = FHE.asEuint32(_forexRates[i]);
            newSession.sessionPrices[i] = encryptedRate;
            sessionRates[currentSession][CurrencyPair(i)] = encryptedRate;

            // Set ACL permissions
            FHE.allowThis(encryptedRate);
        }

        newSession.pricesSet = true;
        newSession.sessionActive = true;
        newSession.startTime = block.timestamp;
        newSession.endTime = block.timestamp + SESSION_DURATION;
        newSession.activeTraders = new address[](0);
        newSession.totalVolume = 0;

        lastSessionTime = block.timestamp;

        emit SessionStarted(currentSession, block.timestamp);
        emit PricesUpdated(currentSession);
    }

    // Place a private forex order
    function placePrivateOrder(
        uint64 _amount,
        uint32 _targetPrice,
        uint8 _currencyPairId
    ) external onlyRegisteredTrader onlyDuringSession {
        require(_amount > 0, "Amount must be positive");
        require(_currencyPairId < 5, "Invalid currency pair");
        require(_targetPrice > 0, "Target price must be positive");

        // Encrypt order details
        euint64 encryptedAmount = FHE.asEuint64(_amount);
        euint32 encryptedPrice = FHE.asEuint32(_targetPrice);
        euint8 encryptedPairId = FHE.asEuint8(_currencyPairId);

        PrivateOrder memory newOrder = PrivateOrder({
            encryptedAmount: encryptedAmount,
            encryptedPrice: encryptedPrice,
            encryptedPairId: encryptedPairId,
            isExecuted: false,
            timestamp: block.timestamp,
            trader: msg.sender
        });

        privateOrders[currentSession][msg.sender].push(newOrder);
        uint256 orderIndex = privateOrders[currentSession][msg.sender].length - 1;

        // Add trader to active traders if not already present
        _addToActiveTraders(msg.sender);

        // Set ACL permissions
        FHE.allowThis(encryptedAmount);
        FHE.allowThis(encryptedPrice);
        FHE.allowThis(encryptedPairId);
        FHE.allow(encryptedAmount, msg.sender);
        FHE.allow(encryptedPrice, msg.sender);
        FHE.allow(encryptedPairId, msg.sender);

        // Update trader activity
        traderProfiles[msg.sender].lastActivity = block.timestamp;

        emit PrivateOrderPlaced(msg.sender, currentSession, orderIndex);
    }

    // Execute private orders (called during reveal phase)
    function executePrivateOrders() external onlyOwner {
        require(tradingSessions[currentSession].sessionActive, "No active session");
        require(block.timestamp > tradingSessions[currentSession].endTime, "Session not yet ended");

        TradingSession storage session = tradingSessions[currentSession];

        // Process orders for all active traders
        for (uint i = 0; i < session.activeTraders.length; i++) {
            address trader = session.activeTraders[i];
            _processTraderOrders(trader);
        }

        // End current session
        session.sessionActive = false;
        currentSession++;
    }

    // Internal function to process a trader's orders
    function _processTraderOrders(address trader) private {
        PrivateOrder[] storage orders = privateOrders[currentSession][trader];

        for (uint j = 0; j < orders.length; j++) {
            if (!orders[j].isExecuted) {
                // In a real implementation, this would use FHE comparisons
                // to check if encrypted target price matches encrypted market price
                orders[j].isExecuted = true;
                traderProfiles[trader].totalTrades = FHE.add(traderProfiles[trader].totalTrades, FHE.asEuint32(1));

                emit OrderExecuted(trader, currentSession, j);
            }
        }
    }

    // Add trader to active traders list if not already present
    function _addToActiveTraders(address trader) private {
        TradingSession storage session = tradingSessions[currentSession];

        // Check if trader already in active list
        for (uint i = 0; i < session.activeTraders.length; i++) {
            if (session.activeTraders[i] == trader) {
                return; // Already in list
            }
        }

        session.activeTraders.push(trader);
    }

    // Get current session information
    function getCurrentSessionInfo() external view returns (
        uint32 session,
        bool pricesSet,
        bool sessionActive,
        uint256 startTime,
        uint256 endTime,
        uint256 activeTraderCount
    ) {
        TradingSession storage currentSessionData = tradingSessions[currentSession];
        return (
            currentSession,
            currentSessionData.pricesSet,
            currentSessionData.sessionActive,
            currentSessionData.startTime,
            currentSessionData.endTime,
            currentSessionData.activeTraders.length
        );
    }

    // Get trader's order count for current session
    function getTraderOrderCount(address trader) external view returns (uint256) {
        return privateOrders[currentSession][trader].length;
    }

    // Get trader profile information
    function getTraderProfile(address trader) external view returns (
        bool isRegistered,
        uint256 lastActivity
    ) {
        TraderProfile storage profile = traderProfiles[trader];
        return (
            profile.isRegistered,
            profile.lastActivity
        );
    }

    // Get encrypted total trades (only accessible by the trader themselves)
    function getMyEncryptedTotalTrades() external view onlyRegisteredTrader returns (euint32) {
        return traderProfiles[msg.sender].totalTrades;
    }

    // Get session history
    function getSessionHistory(uint32 sessionNumber) external view returns (
        bool sessionActive,
        bool pricesSet,
        uint256 startTime,
        uint256 endTime,
        uint256 traderCount,
        uint256 totalVolume
    ) {
        TradingSession storage session = tradingSessions[sessionNumber];
        return (
            session.sessionActive,
            session.pricesSet,
            session.startTime,
            session.endTime,
            session.activeTraders.length,
            session.totalVolume
        );
    }

    // Check if specific currency pair rate exists for session
    function hasRateForPair(uint32 sessionNumber, CurrencyPair pair) external view returns (bool) {
        return FHE.isInitialized(sessionRates[sessionNumber][pair]);
    }

    // Emergency function to end session early
    function emergencyEndSession() external onlyOwner {
        require(tradingSessions[currentSession].sessionActive, "No active session");
        tradingSessions[currentSession].sessionActive = false;
        tradingSessions[currentSession].endTime = block.timestamp;
    }

    // Update trader balance (for deposits/withdrawals)
    function updateTraderBalance(uint64 _newBalance) external onlyRegisteredTrader {
        euint64 encryptedNewBalance = FHE.asEuint64(_newBalance);
        traderProfiles[msg.sender].encryptedBalance = encryptedNewBalance;

        FHE.allowThis(encryptedNewBalance);
        FHE.allow(encryptedNewBalance, msg.sender);
    }
}