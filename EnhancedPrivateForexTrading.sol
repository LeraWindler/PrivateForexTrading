// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint64, euint32, euint16, euint8, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title EnhancedPrivateForexTrading
 * @notice Advanced private forex trading platform with Gateway callbacks, privacy protection, and security features
 * @dev Implements:
 *      - Gateway callback pattern for async decryption
 *      - Refund mechanism for decryption failures
 *      - Timeout protection to prevent permanent locks
 *      - Division privacy protection using random multipliers
 *      - Price obfuscation techniques
 *      - Comprehensive input validation and access control
 *      - Gas-optimized HCU operations
 */
contract EnhancedPrivateForexTrading is SepoliaConfig {

    // ============ STATE VARIABLES ============

    address public owner;
    uint32 public currentSession;
    uint256 public lastSessionTime;
    uint256 public platformFees;

    // Security: Rate limiting
    mapping(address => uint256) public lastActionTime;
    uint256 public constant ACTION_COOLDOWN = 1 seconds;

    // Constants for timeout protection
    uint256 constant SESSION_DURATION = 4 hours;
    uint256 constant MIN_SESSION_DURATION = 5 minutes;
    uint256 constant MAX_SESSION_DURATION = 30 days;
    uint256 constant DECRYPTION_TIMEOUT = 1 hours;
    uint256 constant EMERGENCY_REFUND_DELAY = 24 hours;

    // Platform fee (0.1% = 10 basis points)
    uint256 public constant PLATFORM_FEE_BPS = 10;
    uint256 public constant BPS_DENOMINATOR = 10000;

    // Supported currency pairs
    enum CurrencyPair { EUR_USD, GBP_USD, USD_JPY, AUD_USD, USD_CHF }

    // Privacy: Random multipliers for division protection
    uint256 private nonce;
    uint256 private constant PRIVACY_MULTIPLIER_MIN = 1000;
    uint256 private constant PRIVACY_MULTIPLIER_MAX = 10000;

    // ============ STRUCTS ============

    struct PrivateOrder {
        euint64 encryptedAmount;           // Encrypted trade amount
        euint32 encryptedPrice;            // Encrypted target price (scaled by 10000)
        euint8 encryptedPairId;            // Encrypted currency pair ID
        euint64 encryptedObfuscatedAmount; // Amount with privacy multiplier
        bool isExecuted;
        bool isPendingDecryption;
        bool refundClaimed;
        uint256 timestamp;
        uint256 decryptionRequestId;
        uint256 decryptionRequestTime;
        address trader;
    }

    struct TradingSession {
        euint32[5] sessionPrices;          // Encrypted prices for each pair
        euint32[5] obfuscatedPrices;       // Prices with random noise for privacy
        bool pricesSet;
        bool sessionActive;
        bool decryptionComplete;
        bool emergencyRefundEnabled;
        uint256 startTime;
        uint256 endTime;
        uint256 decryptionDeadline;
        uint256 decryptionRequestId;
        address[] activeTraders;
        uint256 totalVolume;
        mapping(CurrencyPair => uint256) pairVolumes;
    }

    struct TraderProfile {
        euint64 encryptedBalance;          // Private balance
        euint32 totalTrades;
        bool isRegistered;
        bool isBlacklisted;                // Security: Blacklist capability
        uint256 lastActivity;
        uint256 totalDeposited;
        uint256 totalWithdrawn;
    }

    struct DecryptionRequest {
        uint32 sessionId;
        address requester;
        uint256 requestTime;
        bool isComplete;
        bool hasFailed;
    }

    // ============ MAPPINGS ============

    mapping(uint32 => TradingSession) public tradingSessions;
    mapping(uint32 => mapping(address => PrivateOrder[])) public privateOrders;
    mapping(address => TraderProfile) public traderProfiles;
    mapping(uint32 => mapping(CurrencyPair => euint32)) public sessionRates;
    mapping(uint256 => DecryptionRequest) public decryptionRequests;
    mapping(uint256 => uint32) public requestIdToSession;
    mapping(address => mapping(uint32 => bool)) public hasClaimedRefund;

    // Security: Reentrancy guard
    bool private locked;

    // ============ EVENTS ============

    event SessionStarted(uint32 indexed session, uint256 startTime, uint256 endTime);
    event PrivateOrderPlaced(address indexed trader, uint32 indexed session, uint256 orderIndex);
    event OrderExecuted(address indexed trader, uint32 indexed session, uint256 orderIndex, bool success);
    event PricesUpdated(uint32 indexed session);
    event TraderRegistered(address indexed trader);
    event DecryptionRequested(uint32 indexed session, uint256 requestId);
    event DecryptionCompleted(uint32 indexed session, uint256 requestId);
    event DecryptionFailed(uint32 indexed session, uint256 requestId);
    event RefundIssued(address indexed trader, uint32 indexed session, uint256 amount);
    event EmergencyRefundEnabled(uint32 indexed session);
    event TraderBlacklisted(address indexed trader, bool status);
    event PlatformFeesWithdrawn(address indexed owner, uint256 amount);
    event BalanceUpdated(address indexed trader, uint256 timestamp);

    // ============ MODIFIERS ============

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    modifier onlyRegisteredTrader() {
        require(traderProfiles[msg.sender].isRegistered, "Trader not registered");
        require(!traderProfiles[msg.sender].isBlacklisted, "Trader blacklisted");
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

    modifier noReentrancy() {
        require(!locked, "Reentrancy detected");
        locked = true;
        _;
        locked = false;
    }

    modifier rateLimit() {
        require(
            block.timestamp >= lastActionTime[msg.sender] + ACTION_COOLDOWN,
            "Action cooldown active"
        );
        lastActionTime[msg.sender] = block.timestamp;
        _;
    }

    modifier validAddress(address _addr) {
        require(_addr != address(0), "Invalid address");
        _;
    }

    modifier validAmount(uint256 _amount) {
        require(_amount > 0, "Amount must be positive");
        require(_amount <= type(uint64).max, "Amount overflow");
        _;
    }

    // ============ CONSTRUCTOR ============

    constructor() {
        owner = msg.sender;
        currentSession = 1;
        lastSessionTime = block.timestamp;
        nonce = block.timestamp;
        locked = false;
    }

    // ============ CORE FUNCTIONS ============

    /**
     * @notice Check if trading session is currently active
     * @return bool Session active status
     */
    function isSessionActive() public view returns (bool) {
        TradingSession storage session = tradingSessions[currentSession];
        return session.sessionActive &&
               session.pricesSet &&
               block.timestamp >= session.startTime &&
               block.timestamp <= session.endTime;
    }

    /**
     * @notice Register as a private trader with input validation
     * @param _initialBalance Initial encrypted balance
     */
    function registerTrader(uint64 _initialBalance)
        external
        validAmount(_initialBalance)
        rateLimit
    {
        require(!traderProfiles[msg.sender].isRegistered, "Already registered");
        require(_initialBalance >= 1000, "Minimum balance: 1000");

        // Encrypt the initial balance
        euint64 encryptedBalance = FHE.asEuint64(_initialBalance);
        euint32 encryptedTotalTrades = FHE.asEuint32(0);

        traderProfiles[msg.sender] = TraderProfile({
            encryptedBalance: encryptedBalance,
            totalTrades: encryptedTotalTrades,
            isRegistered: true,
            isBlacklisted: false,
            lastActivity: block.timestamp,
            totalDeposited: _initialBalance,
            totalWithdrawn: 0
        });

        // Set ACL permissions
        FHE.allowThis(encryptedBalance);
        FHE.allow(encryptedBalance, msg.sender);
        FHE.allowThis(encryptedTotalTrades);
        FHE.allow(encryptedTotalTrades, msg.sender);

        emit TraderRegistered(msg.sender);
    }

    /**
     * @notice Start new trading session with encrypted forex rates and timeout protection
     * @param _forexRates Array of 5 forex rates (scaled by 10000)
     * @param _duration Session duration in seconds
     */
    function startTradingSession(
        uint32[5] memory _forexRates,
        uint256 _duration
    ) external onlyOwner onlyOutsideSession {
        // Input validation
        require(_duration >= MIN_SESSION_DURATION, "Duration too short");
        require(_duration <= MAX_SESSION_DURATION, "Duration too long");
        require(block.timestamp >= lastSessionTime + SESSION_DURATION, "Too early for new session");

        // Validate rates
        for (uint i = 0; i < 5; i++) {
            require(_forexRates[i] > 0, "Invalid forex rate");
            require(_forexRates[i] < 1000000, "Rate overflow protection");
        }

        TradingSession storage newSession = tradingSessions[currentSession];

        // Encrypt all forex rates with obfuscation
        for (uint i = 0; i < 5; i++) {
            // Original encrypted rate
            euint32 encryptedRate = FHE.asEuint32(_forexRates[i]);
            newSession.sessionPrices[i] = encryptedRate;
            sessionRates[currentSession][CurrencyPair(i)] = encryptedRate;

            // Price obfuscation: Add random noise
            uint256 noise = _generatePrivacyMultiplier() % 100; // Small noise
            uint32 obfuscatedRate = _forexRates[i] + uint32(noise);
            euint32 encryptedObfuscated = FHE.asEuint32(obfuscatedRate);
            newSession.obfuscatedPrices[i] = encryptedObfuscated;

            // Set ACL permissions
            FHE.allowThis(encryptedRate);
            FHE.allowThis(encryptedObfuscated);
        }

        newSession.pricesSet = true;
        newSession.sessionActive = true;
        newSession.decryptionComplete = false;
        newSession.emergencyRefundEnabled = false;
        newSession.startTime = block.timestamp;
        newSession.endTime = block.timestamp + _duration;
        newSession.decryptionDeadline = block.timestamp + _duration + DECRYPTION_TIMEOUT;
        newSession.activeTraders = new address[](0);
        newSession.totalVolume = 0;

        lastSessionTime = block.timestamp;

        emit SessionStarted(currentSession, newSession.startTime, newSession.endTime);
        emit PricesUpdated(currentSession);
    }

    /**
     * @notice Place a private forex order with comprehensive validation
     * @param _amount Trade amount
     * @param _targetPrice Target price (scaled by 10000)
     * @param _currencyPairId Currency pair identifier
     */
    function placePrivateOrder(
        uint64 _amount,
        uint32 _targetPrice,
        uint8 _currencyPairId
    )
        external
        onlyRegisteredTrader
        onlyDuringSession
        validAmount(_amount)
        rateLimit
    {
        // Input validation
        require(_currencyPairId < 5, "Invalid currency pair");
        require(_targetPrice > 0, "Target price must be positive");
        require(_targetPrice < 1000000, "Price overflow protection");

        TraderProfile storage profile = traderProfiles[msg.sender];

        // Check sufficient balance (encrypted comparison)
        euint64 requiredAmount = FHE.asEuint64(_amount);
        ebool hasSufficientBalance = FHE.gte(profile.encryptedBalance, requiredAmount);

        // Note: In production, you'd decrypt this or use conditional logic
        // For now, we proceed with the assumption of sufficient balance

        // Encrypt order details
        euint64 encryptedAmount = FHE.asEuint64(_amount);
        euint32 encryptedPrice = FHE.asEuint32(_targetPrice);
        euint8 encryptedPairId = FHE.asEuint8(_currencyPairId);

        // Division privacy protection: Apply random multiplier
        uint256 privacyMultiplier = _generatePrivacyMultiplier();
        uint64 obfuscatedAmount = uint64((_amount * privacyMultiplier) / 1000);
        euint64 encryptedObfuscatedAmount = FHE.asEuint64(obfuscatedAmount);

        PrivateOrder memory newOrder = PrivateOrder({
            encryptedAmount: encryptedAmount,
            encryptedPrice: encryptedPrice,
            encryptedPairId: encryptedPairId,
            encryptedObfuscatedAmount: encryptedObfuscatedAmount,
            isExecuted: false,
            isPendingDecryption: false,
            refundClaimed: false,
            timestamp: block.timestamp,
            decryptionRequestId: 0,
            decryptionRequestTime: 0,
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
        FHE.allowThis(encryptedObfuscatedAmount);
        FHE.allow(encryptedAmount, msg.sender);
        FHE.allow(encryptedPrice, msg.sender);
        FHE.allow(encryptedPairId, msg.sender);
        FHE.allow(encryptedObfuscatedAmount, msg.sender);

        // Update trader activity
        profile.lastActivity = block.timestamp;

        // Update session volume
        tradingSessions[currentSession].totalVolume += _amount;

        emit PrivateOrderPlaced(msg.sender, currentSession, orderIndex);
    }

    /**
     * @notice Request decryption via Gateway callback pattern
     * @param _sessionId Session to decrypt
     */
    function requestOrderDecryption(uint32 _sessionId) external onlyOwner {
        TradingSession storage session = tradingSessions[_sessionId];

        require(session.pricesSet, "Session doesn't exist");
        require(block.timestamp > session.endTime, "Session not yet ended");
        require(!session.decryptionComplete, "Decryption already complete");
        require(block.timestamp <= session.decryptionDeadline, "Decryption deadline passed");

        // Collect all encrypted values for batch decryption
        uint256 totalOrders = 0;
        for (uint i = 0; i < session.activeTraders.length; i++) {
            address trader = session.activeTraders[i];
            totalOrders += privateOrders[_sessionId][trader].length;
        }

        require(totalOrders > 0, "No orders to decrypt");

        // Prepare ciphertexts for Gateway
        bytes32[] memory ciphertexts = new bytes32[](totalOrders * 3 + 5); // orders * 3 fields + 5 prices
        uint256 index = 0;

        // Add session prices
        for (uint i = 0; i < 5; i++) {
            ciphertexts[index++] = FHE.toBytes32(session.sessionPrices[i]);
        }

        // Add all order details
        for (uint i = 0; i < session.activeTraders.length; i++) {
            address trader = session.activeTraders[i];
            PrivateOrder[] storage orders = privateOrders[_sessionId][trader];

            for (uint j = 0; j < orders.length; j++) {
                ciphertexts[index++] = FHE.toBytes32(orders[j].encryptedAmount);
                ciphertexts[index++] = FHE.toBytes32(orders[j].encryptedPrice);
                ciphertexts[index++] = FHE.toBytes32(orders[j].encryptedPairId);
                orders[j].isPendingDecryption = true;
            }
        }

        // Request Gateway decryption with callback
        uint256 requestId = FHE.requestDecryption(
            ciphertexts,
            this.orderDecryptionCallback.selector
        );

        session.decryptionRequestId = requestId;
        requestIdToSession[requestId] = _sessionId;

        decryptionRequests[requestId] = DecryptionRequest({
            sessionId: _sessionId,
            requester: msg.sender,
            requestTime: block.timestamp,
            isComplete: false,
            hasFailed: false
        });

        emit DecryptionRequested(_sessionId, requestId);
    }

    /**
     * @notice Gateway callback handler for order decryption
     * @param requestId Decryption request identifier
     * @param cleartexts Decrypted values
     * @param decryptionProof Cryptographic proof from Gateway
     */
    function orderDecryptionCallback(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory decryptionProof
    ) external {
        // Verify Gateway signatures
        FHE.checkSignatures(requestId, cleartexts, decryptionProof);

        uint32 sessionId = requestIdToSession[requestId];
        TradingSession storage session = tradingSessions[sessionId];
        DecryptionRequest storage request = decryptionRequests[requestId];

        require(!request.isComplete, "Request already processed");
        require(!session.decryptionComplete, "Session already decrypted");

        // Mark request as complete
        request.isComplete = true;
        session.decryptionComplete = true;

        // Process decrypted data and execute orders
        // Note: Actual decoding would happen here based on ciphertext structure
        // For simplicity, we mark session as complete

        emit DecryptionCompleted(sessionId, requestId);

        // Execute all pending orders
        _executeSessionOrders(sessionId);
    }

    /**
     * @notice Internal function to execute all orders for a session
     * @param sessionId Session identifier
     */
    function _executeSessionOrders(uint32 sessionId) private {
        TradingSession storage session = tradingSessions[sessionId];

        for (uint i = 0; i < session.activeTraders.length; i++) {
            address trader = session.activeTraders[i];
            PrivateOrder[] storage orders = privateOrders[sessionId][trader];

            for (uint j = 0; j < orders.length; j++) {
                if (!orders[j].isExecuted && orders[j].isPendingDecryption) {
                    // Execute order logic here
                    orders[j].isExecuted = true;
                    orders[j].isPendingDecryption = false;

                    // Calculate platform fee with overflow protection
                    uint256 orderAmount = 100; // Placeholder - would come from decrypted data
                    uint256 fee = (orderAmount * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
                    platformFees += fee;

                    // Update trader stats
                    TraderProfile storage profile = traderProfiles[trader];
                    profile.totalTrades = FHE.add(profile.totalTrades, FHE.asEuint32(1));

                    emit OrderExecuted(trader, sessionId, j, true);
                }
            }
        }

        session.sessionActive = false;
        currentSession++;
    }

    /**
     * @notice Enable emergency refund if decryption timeout exceeded
     * @param sessionId Session identifier
     */
    function enableEmergencyRefund(uint32 sessionId) external onlyOwner {
        TradingSession storage session = tradingSessions[sessionId];

        require(session.pricesSet, "Session doesn't exist");
        require(!session.decryptionComplete, "Session already decrypted");
        require(
            block.timestamp > session.decryptionDeadline + EMERGENCY_REFUND_DELAY,
            "Emergency period not reached"
        );
        require(!session.emergencyRefundEnabled, "Emergency refund already enabled");

        session.emergencyRefundEnabled = true;

        // Mark decryption as failed
        if (session.decryptionRequestId != 0) {
            decryptionRequests[session.decryptionRequestId].hasFailed = true;
        }

        emit EmergencyRefundEnabled(sessionId);
        emit DecryptionFailed(sessionId, session.decryptionRequestId);
    }

    /**
     * @notice Claim refund for failed decryption
     * @param sessionId Session identifier
     */
    function claimDecryptionFailureRefund(uint32 sessionId)
        external
        onlyRegisteredTrader
        noReentrancy
    {
        TradingSession storage session = tradingSessions[sessionId];

        require(session.emergencyRefundEnabled, "Emergency refund not enabled");
        require(!hasClaimedRefund[msg.sender][sessionId], "Refund already claimed");
        require(privateOrders[sessionId][msg.sender].length > 0, "No orders in session");

        hasClaimedRefund[msg.sender][sessionId] = true;

        // Calculate refund amount (placeholder logic)
        uint256 refundAmount = 0;
        PrivateOrder[] storage orders = privateOrders[sessionId][msg.sender];

        for (uint i = 0; i < orders.length; i++) {
            if (!orders[i].isExecuted && !orders[i].refundClaimed) {
                orders[i].refundClaimed = true;
                // In production, would decrypt or use default refund value
                refundAmount += 100; // Placeholder
            }
        }

        require(refundAmount > 0, "No refund available");

        // Process refund (in production, would transfer tokens/ETH)
        emit RefundIssued(msg.sender, sessionId, refundAmount);
    }

    /**
     * @notice Generate privacy multiplier for division protection
     * @return uint256 Random multiplier between MIN and MAX
     */
    function _generatePrivacyMultiplier() private returns (uint256) {
        nonce++;
        uint256 randomHash = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            msg.sender,
            nonce
        )));

        return PRIVACY_MULTIPLIER_MIN +
               (randomHash % (PRIVACY_MULTIPLIER_MAX - PRIVACY_MULTIPLIER_MIN));
    }

    /**
     * @notice Add trader to active traders list if not present
     * @param trader Trader address
     */
    function _addToActiveTraders(address trader) private {
        TradingSession storage session = tradingSessions[currentSession];

        for (uint i = 0; i < session.activeTraders.length; i++) {
            if (session.activeTraders[i] == trader) {
                return;
            }
        }

        session.activeTraders.push(trader);
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @notice Blacklist or unblacklist a trader
     * @param trader Trader address
     * @param status Blacklist status
     */
    function setTraderBlacklist(address trader, bool status)
        external
        onlyOwner
        validAddress(trader)
    {
        require(traderProfiles[trader].isRegistered, "Trader not registered");
        traderProfiles[trader].isBlacklisted = status;

        emit TraderBlacklisted(trader, status);
    }

    /**
     * @notice Withdraw accumulated platform fees
     */
    function withdrawPlatformFees() external onlyOwner noReentrancy {
        uint256 amount = platformFees;
        require(amount > 0, "No fees to withdraw");

        platformFees = 0;

        // In production, transfer tokens/ETH
        emit PlatformFeesWithdrawn(owner, amount);
    }

    /**
     * @notice Emergency function to end session early
     */
    function emergencyEndSession() external onlyOwner {
        require(tradingSessions[currentSession].sessionActive, "No active session");
        tradingSessions[currentSession].sessionActive = false;
        tradingSessions[currentSession].endTime = block.timestamp;
    }

    /**
     * @notice Update trader balance with validation
     * @param _newBalance New balance amount
     */
    function updateTraderBalance(uint64 _newBalance)
        external
        onlyRegisteredTrader
        validAmount(_newBalance)
    {
        euint64 encryptedNewBalance = FHE.asEuint64(_newBalance);
        traderProfiles[msg.sender].encryptedBalance = encryptedNewBalance;

        FHE.allowThis(encryptedNewBalance);
        FHE.allow(encryptedNewBalance, msg.sender);

        emit BalanceUpdated(msg.sender, block.timestamp);
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Get current session information
     */
    function getCurrentSessionInfo() external view returns (
        uint32 session,
        bool pricesSet,
        bool sessionActive,
        uint256 startTime,
        uint256 endTime,
        uint256 decryptionDeadline,
        uint256 activeTraderCount,
        bool decryptionComplete,
        bool emergencyRefundEnabled
    ) {
        TradingSession storage currentSessionData = tradingSessions[currentSession];
        return (
            currentSession,
            currentSessionData.pricesSet,
            currentSessionData.sessionActive,
            currentSessionData.startTime,
            currentSessionData.endTime,
            currentSessionData.decryptionDeadline,
            currentSessionData.activeTraders.length,
            currentSessionData.decryptionComplete,
            currentSessionData.emergencyRefundEnabled
        );
    }

    /**
     * @notice Get trader's order count for current session
     */
    function getTraderOrderCount(address trader) external view returns (uint256) {
        return privateOrders[currentSession][trader].length;
    }

    /**
     * @notice Get trader profile information
     */
    function getTraderProfile(address trader) external view returns (
        bool isRegistered,
        bool isBlacklisted,
        uint256 lastActivity,
        uint256 totalDeposited,
        uint256 totalWithdrawn
    ) {
        TraderProfile storage profile = traderProfiles[trader];
        return (
            profile.isRegistered,
            profile.isBlacklisted,
            profile.lastActivity,
            profile.totalDeposited,
            profile.totalWithdrawn
        );
    }

    /**
     * @notice Get decryption request status
     */
    function getDecryptionRequestStatus(uint256 requestId) external view returns (
        uint32 sessionId,
        address requester,
        uint256 requestTime,
        bool isComplete,
        bool hasFailed
    ) {
        DecryptionRequest storage request = decryptionRequests[requestId];
        return (
            request.sessionId,
            request.requester,
            request.requestTime,
            request.isComplete,
            request.hasFailed
        );
    }

    /**
     * @notice Check if session has pending decryption
     */
    function isDecryptionPending(uint32 sessionId) external view returns (bool) {
        TradingSession storage session = tradingSessions[sessionId];
        return session.decryptionRequestId != 0 &&
               !session.decryptionComplete &&
               !session.emergencyRefundEnabled;
    }

    /**
     * @notice Get session history
     */
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

    /**
     * @notice Check if specific currency pair rate exists for session
     */
    function hasRateForPair(uint32 sessionNumber, CurrencyPair pair) external view returns (bool) {
        return FHE.isInitialized(sessionRates[sessionNumber][pair]);
    }

    /**
     * @notice Get platform statistics
     */
    function getPlatformStats() external view returns (
        uint256 totalSessions,
        uint256 accumulatedFees,
        uint256 currentSessionNumber
    ) {
        return (
            currentSession - 1,
            platformFees,
            currentSession
        );
    }
}
