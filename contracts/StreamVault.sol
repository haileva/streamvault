// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract StreamVault is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum StreamStatus {
        Active,
        Paused,
        Cancelled,
        Completed
    }

    struct Stream {
        uint256 id;
        address sender;
        address recipient;
        uint128 ratePerSecond;
        uint128 deposit;
        uint128 withdrawn;
        uint64 startTime;
        uint64 stopTime;
        uint64 pausedAt;
        uint128 accruedAtPause;
        uint128 totalPausedDuration;
        StreamStatus status;
    }

    error StreamNotFound();
    error NotStreamSender();
    error NotStreamRecipient();
    error StreamNotActive();
    error StreamNotPaused();
    error StreamAlreadyPaused();
    error ZeroAddress();
    error SenderIsRecipient();
    error InvalidRate();
    error InvalidDuration();
    error NothingToWithdraw();
    error InsufficientTransfer();

    event StreamCreated(
        uint256 indexed streamId,
        address indexed sender,
        address indexed recipient,
        uint128 ratePerSecond,
        uint128 deposit,
        uint64 startTime,
        uint64 stopTime
    );
    event Withdrawal(uint256 indexed streamId, address indexed recipient, uint128 amount);
    event StreamCancelled(
        uint256 indexed streamId,
        address indexed sender,
        uint128 recipientPayout,
        uint128 senderRefund
    );
    event StreamPaused(uint256 indexed streamId, address indexed sender, uint128 accruedSoFar);
    event StreamResumed(uint256 indexed streamId, address indexed sender, uint64 newStopTime);
    event PendingClaimed(address indexed claimant, uint128 amount);

    IERC20 public immutable usdc;
    uint256 public nextStreamId = 1;
    uint64 internal constant MAX_DURATION = 3650 days;

    mapping(uint256 streamId => Stream stream) public streams;
    mapping(uint256 streamId => string label) public streamLabels;
    mapping(address account => uint128 amount) public pendingWithdrawals;

    constructor(address usdcToken) {
        if (usdcToken == address(0)) revert ZeroAddress();
        usdc = IERC20(usdcToken);
    }

    function createStream(
        address recipient,
        uint128 ratePerSecond,
        uint64 durationSeconds,
        string calldata label
    ) external nonReentrant returns (uint256 streamId) {
        if (recipient == address(0)) revert ZeroAddress();
        if (recipient == msg.sender) revert SenderIsRecipient();
        if (ratePerSecond == 0) revert InvalidRate();
        if (durationSeconds == 0 || durationSeconds > MAX_DURATION) revert InvalidDuration();

        uint256 deposit256 = uint256(ratePerSecond) * uint256(durationSeconds);
        if (deposit256 == 0 || deposit256 > type(uint128).max) revert InvalidRate();

        uint128 deposit = uint128(deposit256);
        uint256 balanceBefore = usdc.balanceOf(address(this));
        usdc.safeTransferFrom(msg.sender, address(this), deposit);
        uint256 received256 = usdc.balanceOf(address(this)) - balanceBefore;
        if (received256 > type(uint128).max) revert InvalidRate();
        uint128 received = uint128(received256);
        if (received < deposit) revert InsufficientTransfer();

        uint64 startTime = uint64(block.timestamp);
        uint64 stopTime = startTime + uint64(received / ratePerSecond);

        streamId = nextStreamId;
        unchecked {
            nextStreamId = streamId + 1;
        }

        streams[streamId] = Stream({
            id: streamId,
            sender: msg.sender,
            recipient: recipient,
            ratePerSecond: ratePerSecond,
            deposit: received,
            withdrawn: 0,
            startTime: startTime,
            stopTime: stopTime,
            pausedAt: 0,
            accruedAtPause: 0,
            totalPausedDuration: 0,
            status: StreamStatus.Active
        });

        streamLabels[streamId] = label;

        emit StreamCreated(streamId, msg.sender, recipient, ratePerSecond, received, startTime, stopTime);
    }

    function withdrawFromStream(uint256 streamId) external nonReentrant {
        Stream storage stream = _getStream(streamId);

        if (msg.sender != stream.recipient) revert NotStreamRecipient();
        if (stream.status == StreamStatus.Cancelled) revert StreamNotActive();

        uint128 claimable = _claimable(stream);
        if (claimable == 0) revert NothingToWithdraw();

        stream.withdrawn += claimable;
        if (stream.withdrawn == stream.deposit && block.timestamp >= stream.stopTime) {
            stream.status = StreamStatus.Completed;
        }

        usdc.safeTransfer(stream.recipient, claimable);

        emit Withdrawal(streamId, stream.recipient, claimable);
    }

    function cancelStream(uint256 streamId) external nonReentrant {
        Stream storage stream = _getStream(streamId);

        if (msg.sender != stream.sender) revert NotStreamSender();
        if (stream.status != StreamStatus.Active && stream.status != StreamStatus.Paused) revert StreamNotActive();

        uint128 accrued = _accruedAmount(stream);
        uint128 recipientPayout = accrued - stream.withdrawn;
        uint128 senderRefund = stream.deposit - accrued;

        stream.accruedAtPause = accrued;
        stream.pausedAt = uint64(block.timestamp);
        stream.status = StreamStatus.Cancelled;

        if (recipientPayout > 0) {
            pendingWithdrawals[stream.recipient] += recipientPayout;
        }
        if (senderRefund > 0) {
            usdc.safeTransfer(stream.sender, senderRefund);
        }

        emit StreamCancelled(streamId, stream.sender, recipientPayout, senderRefund);
    }

    function pauseStream(uint256 streamId) external {
        Stream storage stream = _getStream(streamId);

        if (msg.sender != stream.sender) revert NotStreamSender();
        if (stream.status == StreamStatus.Paused) revert StreamAlreadyPaused();
        if (stream.status != StreamStatus.Active) revert StreamNotActive();

        uint128 accrued = _accruedAmount(stream);

        stream.pausedAt = uint64(block.timestamp);
        stream.accruedAtPause = accrued;
        stream.status = StreamStatus.Paused;

        emit StreamPaused(streamId, stream.sender, accrued);
    }

    function resumeStream(uint256 streamId) external {
        Stream storage stream = _getStream(streamId);

        if (msg.sender != stream.sender) revert NotStreamSender();
        if (stream.status != StreamStatus.Paused) revert StreamNotPaused();

        uint64 pausedDuration = uint64(block.timestamp) - stream.pausedAt;
        stream.stopTime = stream.stopTime + pausedDuration;
        stream.totalPausedDuration += uint128(pausedDuration);
        stream.pausedAt = 0;
        stream.status = StreamStatus.Active;

        emit StreamResumed(streamId, stream.sender, stream.stopTime);
    }

    function claimPending() external nonReentrant {
        uint128 amount = pendingWithdrawals[msg.sender];
        if (amount == 0) revert NothingToWithdraw();

        pendingWithdrawals[msg.sender] = 0;
        usdc.safeTransfer(msg.sender, amount);

        emit PendingClaimed(msg.sender, amount);
    }

    function balanceOf(uint256 streamId) external view returns (uint128 recipientBalance, uint128 senderBalance) {
        Stream storage stream = _getStream(streamId);

        if (stream.status == StreamStatus.Cancelled) {
            return (0, 0);
        }

        uint128 accrued = _accruedAmount(stream);
        recipientBalance = accrued - stream.withdrawn;
        senderBalance = stream.deposit - accrued;
    }

    function _claimable(Stream storage stream) internal view returns (uint128) {
        uint128 accrued = _accruedAmount(stream);
        return accrued - stream.withdrawn;
    }

    function _accruedAmount(Stream storage stream) internal view returns (uint128) {
        if (stream.status == StreamStatus.Paused || stream.status == StreamStatus.Cancelled) {
            return stream.accruedAtPause;
        }

        if (stream.status == StreamStatus.Completed) {
            return stream.deposit;
        }

        uint64 effectiveEnd = block.timestamp < stream.stopTime ? uint64(block.timestamp) : stream.stopTime;
        if (effectiveEnd <= stream.startTime) {
            return 0;
        }

        uint256 elapsed = uint256(effectiveEnd) - uint256(stream.startTime);
        uint256 paused = uint256(stream.totalPausedDuration);
        if (elapsed <= paused) {
            return 0;
        }

        elapsed -= paused;
        uint256 accrued256 = elapsed * uint256(stream.ratePerSecond);
        if (accrued256 > stream.deposit) {
            return stream.deposit;
        }

        return uint128(accrued256);
    }

    function _getStream(uint256 streamId) internal view returns (Stream storage stream) {
        stream = streams[streamId];
        if (stream.sender == address(0)) revert StreamNotFound();
    }
}
