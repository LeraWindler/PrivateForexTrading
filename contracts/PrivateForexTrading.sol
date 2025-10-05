// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhevm/solidity/contracts/FHE.sol";
import "@fhevm/solidity/contracts/Gateway.sol";
import "./PauserSet.sol";

/**
 * @title PrivateForexTrading
 * @notice A fully homomorphic encryption-based private forex trading platform
 * @dev Implements encrypted trading with multiple FHE types and Gateway integration
 */
contract PrivateForexTrading is Gateway {
    // Encrypted balance type
    struct EncryptedBalance {
        euint64 balance;
        bool initialized;
    }

    // Encrypted position
    struct EncryptedPosition {
        euint64 amount;
        euint32 entryPrice;
        euint32 leverage;
        ebool isLong;
        uint256 timestamp;
        bool active;
    }

    // Encrypted order
    struct EncryptedOrder {
        euint64 amount;
        euint32 targetPrice;
        euint32 stopLoss;
        euint32 takeProfit;
        ebool isLong;
        ebool executed;
        uint256 timestamp;
    }

    // State variables
    mapping(address => EncryptedBalance) private balances;
    mapping(address => mapping(uint256 => EncryptedPosition)) private positions;
    mapping(address => uint256) public positionCount;
    mapping(address => mapping(uint256 => EncryptedOrder)) private orders;
    mapping(address => uint256) public orderCount;

    // Current market price (encrypted)
    euint32 private currentPrice;

    // Pauser contract
    PauserSet public pauserSet;

    // Owner
    address public owner;

    // Paused state
    bool public paused;

    // Minimum deposit amount
    uint64 public constant MIN_DEPOSIT = 1000; // 0.000001 ETH equivalent

    // Maximum leverage
    uint32 public constant MAX_LEVERAGE = 100;

    // Events
    event Deposit(address indexed trader, bytes encryptedAmount);
    event Withdrawal(address indexed trader, uint256 requestId);
    event PositionOpened(address indexed trader, uint256 indexed positionId, bytes encryptedAmount);
    event PositionClosed(address indexed trader, uint256 indexed positionId, uint256 requestId);
    event OrderPlaced(address indexed trader, uint256 indexed orderId, bytes encryptedAmount);
    event OrderExecuted(address indexed trader, uint256 indexed orderId);
    event OrderCancelled(address indexed trader, uint256 indexed orderId);
    event PriceUpdated(bytes encryptedPrice);
    event Paused(address indexed account);
    event Unpaused(address indexed account);
    event WithdrawalProcessed(address indexed trader, uint256 amount);
    event PositionProfitLoss(address indexed trader, uint256 indexed positionId, int256 profitLoss);

    // Errors
    error Unauthorized();
    error ContractPaused();
    error InvalidAmount();
    error InvalidLeverage();
    error InvalidPrice();
    error PositionNotFound();
    error OrderNotFound();
    error InsufficientBalance();
    error PositionAlreadyClosed();
    error OrderAlreadyExecuted();

    // Modifiers
    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyPauser() {
        if (!pauserSet.isPauser(msg.sender)) revert Unauthorized();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    /**
     * @notice Constructor
     * @param _pauserSet Address of the PauserSet contract
     * @param _kmsGenerationAddress Address of the KMS generation contract
     */
    constructor(address _pauserSet, address _kmsGenerationAddress) Gateway(_kmsGenerationAddress) {
        owner = msg.sender;
        pauserSet = PauserSet(_pauserSet);
        paused = false;

        // Initialize with a default price (encrypted)
        currentPrice = FHE.asEuint32(100000); // Default: 1.00000
    }

    /**
     * @notice Deposit encrypted funds
     * @param encryptedAmount Encrypted deposit amount (euint64)
     * @param inputProof ZK proof for the encrypted input
     */
    function deposit(einput encryptedAmount, bytes calldata inputProof) external whenNotPaused {
        // Decrypt and validate the input
        euint64 amount = FHE.asEuint64(encryptedAmount, inputProof);

        // Check minimum deposit
        ebool isValidAmount = FHE.gte(amount, FHE.asEuint64(MIN_DEPOSIT));
        FHE.req(isValidAmount);

        // Add to balance
        if (!balances[msg.sender].initialized) {
            balances[msg.sender] = EncryptedBalance({
                balance: amount,
                initialized: true
            });
        } else {
            balances[msg.sender].balance = FHE.add(balances[msg.sender].balance, amount);
        }

        // Allow the trader to decrypt their own balance
        FHE.allowThis(balances[msg.sender].balance);
        FHE.allow(balances[msg.sender].balance, msg.sender);

        emit Deposit(msg.sender, FHE.sealoutput(amount, bytes32(0)));
    }

    /**
     * @notice Request withdrawal (initiates decryption via Gateway)
     * @param encryptedAmount Encrypted withdrawal amount
     * @param inputProof ZK proof for the encrypted input
     */
    function requestWithdrawal(einput encryptedAmount, bytes calldata inputProof) external whenNotPaused returns (uint256) {
        euint64 amount = FHE.asEuint64(encryptedAmount, inputProof);

        // Check sufficient balance
        ebool hasSufficientBalance = FHE.gte(balances[msg.sender].balance, amount);
        FHE.req(hasSufficientBalance);

        // Subtract from balance
        balances[msg.sender].balance = FHE.sub(balances[msg.sender].balance, amount);

        // Request decryption via Gateway
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

    /**
     * @notice Gateway callback for withdrawal
     * @param requestId The decryption request ID
     * @param decryptedAmount The decrypted amount
     */
    function callbackWithdrawal(uint256 requestId, uint256 decryptedAmount) external onlyGateway {
        // Process the withdrawal with decrypted amount
        emit WithdrawalProcessed(msg.sender, decryptedAmount);

        // In a real implementation, transfer the funds here
        // payable(msg.sender).transfer(decryptedAmount);
    }

    /**
     * @notice Open a new encrypted position
     * @param encryptedAmount Position size (encrypted)
     * @param encryptedLeverage Leverage (encrypted)
     * @param encryptedIsLong Long or short position (encrypted boolean)
     * @param inputProof ZK proof for encrypted inputs
     */
    function openPosition(
        einput encryptedAmount,
        einput encryptedLeverage,
        einput encryptedIsLong,
        bytes calldata inputProof
    ) external whenNotPaused returns (uint256) {
        euint64 amount = FHE.asEuint64(encryptedAmount, inputProof);
        euint32 leverage = FHE.asEuint32(encryptedLeverage, inputProof);
        ebool isLong = FHE.asEbool(encryptedIsLong, inputProof);

        // Validate leverage
        ebool validLeverage = FHE.lte(leverage, FHE.asEuint32(MAX_LEVERAGE));
        FHE.req(validLeverage);

        // Check sufficient balance
        ebool hasSufficientBalance = FHE.gte(balances[msg.sender].balance, amount);
        FHE.req(hasSufficientBalance);

        // Deduct from balance
        balances[msg.sender].balance = FHE.sub(balances[msg.sender].balance, amount);

        // Create position
        uint256 positionId = positionCount[msg.sender];
        positions[msg.sender][positionId] = EncryptedPosition({
            amount: amount,
            entryPrice: currentPrice,
            leverage: leverage,
            isLong: isLong,
            timestamp: block.timestamp,
            active: true
        });

        positionCount[msg.sender]++;

        // Set permissions
        FHE.allowThis(amount);
        FHE.allow(amount, msg.sender);

        emit PositionOpened(msg.sender, positionId, FHE.sealoutput(amount, bytes32(0)));
        return positionId;
    }

    /**
     * @notice Close a position and request P&L calculation
     * @param positionId The position ID to close
     */
    function closePosition(uint256 positionId) external whenNotPaused returns (uint256) {
        if (positionId >= positionCount[msg.sender]) revert PositionNotFound();
        if (!positions[msg.sender][positionId].active) revert PositionAlreadyClosed();

        EncryptedPosition storage position = positions[msg.sender][positionId];

        // Calculate profit/loss (encrypted)
        euint32 priceDiff = FHE.sub(currentPrice, position.entryPrice);

        // Determine if profit or loss based on position direction
        euint64 baseChange = FHE.mul(
            FHE.asEuint64(priceDiff),
            position.amount
        );

        euint64 leveragedChange = FHE.mul(
            baseChange,
            FHE.asEuint64(position.leverage)
        );

        // Add P&L to balance (simplified - real implementation needs more logic)
        balances[msg.sender].balance = FHE.add(
            balances[msg.sender].balance,
            FHE.select(position.isLong, leveragedChange, FHE.sub(position.amount, leveragedChange))
        );

        // Mark position as closed
        position.active = false;

        // Request decryption for final P&L
        uint256[] memory cts = new uint256[](1);
        cts[0] = Gateway.toUint256(leveragedChange);

        uint256 requestId = Gateway.requestDecryption(
            cts,
            this.callbackPositionClose.selector,
            0,
            block.timestamp + 100,
            false
        );

        emit PositionClosed(msg.sender, positionId, requestId);
        return requestId;
    }

    /**
     * @notice Gateway callback for position close
     * @param requestId The decryption request ID
     * @param profitLoss The decrypted profit/loss
     */
    function callbackPositionClose(uint256 requestId, int256 profitLoss) external onlyGateway {
        // Process the position close with decrypted P&L
        emit PositionProfitLoss(msg.sender, requestId, profitLoss);
    }

    /**
     * @notice Place an encrypted limit order
     * @param encryptedAmount Order amount
     * @param encryptedTargetPrice Target execution price
     * @param encryptedStopLoss Stop loss price
     * @param encryptedTakeProfit Take profit price
     * @param encryptedIsLong Long or short
     * @param inputProof ZK proof
     */
    function placeOrder(
        einput encryptedAmount,
        einput encryptedTargetPrice,
        einput encryptedStopLoss,
        einput encryptedTakeProfit,
        einput encryptedIsLong,
        bytes calldata inputProof
    ) external whenNotPaused returns (uint256) {
        euint64 amount = FHE.asEuint64(encryptedAmount, inputProof);
        euint32 targetPrice = FHE.asEuint32(encryptedTargetPrice, inputProof);
        euint32 stopLoss = FHE.asEuint32(encryptedStopLoss, inputProof);
        euint32 takeProfit = FHE.asEuint32(encryptedTakeProfit, inputProof);
        ebool isLong = FHE.asEbool(encryptedIsLong, inputProof);

        // Check sufficient balance
        ebool hasSufficientBalance = FHE.gte(balances[msg.sender].balance, amount);
        FHE.req(hasSufficientBalance);

        // Reserve balance
        balances[msg.sender].balance = FHE.sub(balances[msg.sender].balance, amount);

        uint256 orderId = orderCount[msg.sender];
        orders[msg.sender][orderId] = EncryptedOrder({
            amount: amount,
            targetPrice: targetPrice,
            stopLoss: stopLoss,
            takeProfit: takeProfit,
            isLong: isLong,
            executed: FHE.asEbool(false),
            timestamp: block.timestamp
        });

        orderCount[msg.sender]++;

        FHE.allow(amount, msg.sender);

        emit OrderPlaced(msg.sender, orderId, FHE.sealoutput(amount, bytes32(0)));
        return orderId;
    }

    /**
     * @notice Execute an order if price conditions are met
     * @param trader The trader address
     * @param orderId The order ID
     */
    function executeOrder(address trader, uint256 orderId) external whenNotPaused {
        if (orderId >= orderCount[trader]) revert OrderNotFound();

        EncryptedOrder storage order = orders[trader][orderId];

        // Check if order already executed
        ebool alreadyExecuted = order.executed;
        FHE.req(FHE.not(alreadyExecuted));

        // Check if current price meets target
        ebool priceMatches = FHE.eq(currentPrice, order.targetPrice);
        FHE.req(priceMatches);

        // Mark as executed
        order.executed = FHE.asEbool(true);

        // Open position with order parameters
        uint256 positionId = positionCount[trader];
        positions[trader][positionId] = EncryptedPosition({
            amount: order.amount,
            entryPrice: currentPrice,
            leverage: FHE.asEuint32(1), // Default leverage for limit orders
            isLong: order.isLong,
            timestamp: block.timestamp,
            active: true
        });

        positionCount[trader]++;

        emit OrderExecuted(trader, orderId);
    }

    /**
     * @notice Cancel a pending order
     * @param orderId The order ID to cancel
     */
    function cancelOrder(uint256 orderId) external whenNotPaused {
        if (orderId >= orderCount[msg.sender]) revert OrderNotFound();

        EncryptedOrder storage order = orders[msg.sender][orderId];

        // Check if order already executed
        ebool alreadyExecuted = order.executed;
        FHE.req(FHE.not(alreadyExecuted));

        // Refund balance
        balances[msg.sender].balance = FHE.add(balances[msg.sender].balance, order.amount);

        // Mark as executed (cancelled)
        order.executed = FHE.asEbool(true);

        emit OrderCancelled(msg.sender, orderId);
    }

    /**
     * @notice Update market price (owner only)
     * @param encryptedNewPrice New encrypted price
     * @param inputProof ZK proof
     */
    function updatePrice(einput encryptedNewPrice, bytes calldata inputProof) external onlyOwner {
        euint32 newPrice = FHE.asEuint32(encryptedNewPrice, inputProof);

        // Validate price is positive
        ebool isPositive = FHE.gt(newPrice, FHE.asEuint32(0));
        FHE.req(isPositive);

        currentPrice = newPrice;

        emit PriceUpdated(FHE.sealoutput(newPrice, bytes32(0)));
    }

    /**
     * @notice Get encrypted balance
     * @param trader The trader address
     * @param permission Permission signature for decryption
     */
    function getBalance(address trader, bytes32 permission) external view returns (bytes memory) {
        return FHE.sealoutput(balances[trader].balance, permission);
    }

    /**
     * @notice Get encrypted position details
     * @param trader The trader address
     * @param positionId The position ID
     * @param permission Permission signature
     */
    function getPosition(address trader, uint256 positionId, bytes32 permission)
        external
        view
        returns (bytes memory amount, bytes memory entryPrice, bytes memory leverage, bool active)
    {
        if (positionId >= positionCount[trader]) revert PositionNotFound();

        EncryptedPosition storage position = positions[trader][positionId];

        return (
            FHE.sealoutput(position.amount, permission),
            FHE.sealoutput(position.entryPrice, permission),
            FHE.sealoutput(position.leverage, permission),
            position.active
        );
    }

    /**
     * @notice Get current market price
     * @param permission Permission signature
     */
    function getCurrentPrice(bytes32 permission) external view returns (bytes memory) {
        return FHE.sealoutput(currentPrice, permission);
    }

    /**
     * @notice Pause the contract
     */
    function pause() external onlyPauser {
        paused = true;
        emit Paused(msg.sender);
    }

    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyPauser {
        paused = false;
        emit Unpaused(msg.sender);
    }

    /**
     * @notice Check if contract is paused
     */
    function isPaused() external view returns (bool) {
        return paused;
    }
}
