// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.30;

import {euint256, e, inco} from "@inco/lightning/src/Lib.sol";
import {DecryptionAttestation} from "@inco/lightning/src/lightning-parts/DecryptionAttester.types.sol";
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title CasinoBase
/// @notice Shared base for the confidential casino games.
abstract contract CasinoBase is Ownable {
    using e for *;
    using SafeERC20 for IERC20;

    IERC20 public immutable betToken;
    bool public isInitialised;

    // Sum of worst-case payouts reserved across unsettled games.
    uint256 public totalActiveLiability;

    // Refund window if a covalidator attestation never arrives.
    uint256 public constant GAME_TIMEOUT = 1 hours;

    struct PendingGame {
        address player;
        uint256 wager;
        uint256 maxPayout;
        euint256 seed;
        uint64 createdAt;
        bool settled;
        bytes params;
    }

    mapping(uint256 => PendingGame) internal _games;
    uint256 public nextGameId;

    uint8 private constant _NOT_ENTERED = 1;
    uint8 private constant _ENTERED = 2;
    uint8 private _entered = _NOT_ENTERED;

    error NotInitialised();
    error ZeroWager();
    error InsufficientFee();
    error InsufficientBankroll();
    error UnknownGame();
    error AlreadySettled();
    error HandleMismatch();
    error InvalidAttestation();
    error NotExpired();

    event BetPlaced(
        uint256 indexed gameId,
        address indexed player,
        uint256 wager,
        bytes32 seedHandle
    );
    event BetSettled(
        uint256 indexed gameId,
        address indexed player,
        uint256 wager,
        uint256 payout,
        uint256 randomSeed
    );
    event BetExpired(uint256 indexed gameId, address indexed player, uint256 refund);

    modifier nonReentrant() {
        require(_entered != _ENTERED, "reentrant");
        _entered = _ENTERED;
        _;
        _entered = _NOT_ENTERED;
    }

    modifier onlyWhenInitialised() {
        if (!isInitialised) revert NotInitialised();
        _;
    }

    constructor(address token) Ownable(msg.sender) {
        require(token != address(0), "token zero");
        betToken = IERC20(token);
    }

    /// @notice Fund the house bankroll (owner must approve first).
    function initialize(uint256 amount) external onlyOwner {
        require(amount > 0, "amount zero");
        betToken.safeTransferFrom(msg.sender, address(this), amount);
        isInitialised = true;
    }

    /// @notice Inco fee per randomness draw.
    function getFee() external view returns (uint256) {
        return inco.getFee();
    }

    /// @notice Tokens not reserved against active games.
    function availableBankroll() public view returns (uint256) {
        uint256 bal = betToken.balanceOf(address(this));
        if (bal <= totalActiveLiability) return 0;
        return bal - totalActiveLiability;
    }

    function _openGame(
        uint256 wager,
        uint256 maxPayout,
        bytes memory params
    ) internal onlyWhenInitialised returns (uint256 gameId) {
        if (wager == 0) revert ZeroWager();
        if (msg.value < inco.getFee()) revert InsufficientFee();

        // Lock the wager before the draw is revealed.
        betToken.safeTransferFrom(msg.sender, address(this), wager);

        if (betToken.balanceOf(address(this)) < totalActiveLiability + maxPayout) {
            revert InsufficientBankroll();
        }
        totalActiveLiability += maxPayout;

        // Sealed draw, revealed for later attestation.
        euint256 seed = e.rand();
        e.allowThis(seed);
        e.reveal(seed);

        gameId = nextGameId++;
        _games[gameId] = PendingGame({
            player: msg.sender,
            wager: wager,
            maxPayout: maxPayout,
            seed: seed,
            createdAt: uint64(block.timestamp),
            settled: false,
            params: params
        });

        emit BetPlaced(gameId, msg.sender, wager, euint256.unwrap(seed));
    }

    function _consumeSettlement(
        uint256 gameId,
        DecryptionAttestation calldata attestation,
        bytes[] calldata signatures
    ) internal returns (uint256 seed, PendingGame storage game) {
        game = _games[gameId];
        if (game.player == address(0)) revert UnknownGame();
        if (game.settled) revert AlreadySettled();
        // Bind the attestation to this game's seed.
        if (attestation.handle != euint256.unwrap(game.seed)) revert HandleMismatch();
        if (!inco.incoVerifier().isValidDecryptionAttestation(attestation, signatures)) {
            revert InvalidAttestation();
        }

        game.settled = true;
        totalActiveLiability -= game.maxPayout;
        seed = uint256(attestation.value);
    }

    function _finishPayout(
        uint256 gameId,
        PendingGame storage game,
        uint256 payout,
        uint256 seed
    ) internal {
        if (payout > game.maxPayout) payout = game.maxPayout; // reserved-max cap
        if (payout > 0) betToken.safeTransfer(game.player, payout);
        emit BetSettled(gameId, game.player, game.wager, payout, seed);
    }

    /// @notice Refund a stuck game's wager after the timeout.
    function expireGame(uint256 gameId) external nonReentrant {
        PendingGame storage game = _games[gameId];
        if (game.player == address(0)) revert UnknownGame();
        if (game.settled) revert AlreadySettled();
        if (block.timestamp < game.createdAt + GAME_TIMEOUT) revert NotExpired();

        game.settled = true;
        totalActiveLiability -= game.maxPayout;

        uint256 refund = game.wager;
        if (refund > 0) betToken.safeTransfer(game.player, refund);
        emit BetExpired(gameId, game.player, refund);
    }

    // Expand one seed into independent pseudo-random words.
    function _word(uint256 seed, uint256 index) internal pure returns (uint256) {
        return uint256(keccak256(abi.encode(seed, index)));
    }

    function getGame(uint256 gameId) external view returns (PendingGame memory) {
        return _games[gameId];
    }

    /// @notice Withdraw only non-reserved bankroll.
    function withdraw(uint256 amount) external onlyOwner {
        require(amount <= availableBankroll(), "exceeds available");
        betToken.safeTransfer(owner(), amount);
    }

    receive() external payable {}
}
