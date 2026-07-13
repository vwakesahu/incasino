// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.30;

import {euint256, e, inco} from "@inco/lightning/src/Lib.sol";
import {DecryptionAttestation} from "@inco/lightning/src/lightning-parts/DecryptionAttester.types.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title Casino
/// @notice Confidential casino on Inco Lightning. One ETH bankroll, six games.
/// @dev Two-phase per game: play() draws a sealed seed via e.rand() and reveals
///      it; settle() verifies the covalidator attestation and derives the outcome.
contract Casino is Ownable {
    using e for *;

    enum Kind { CoinFlip, Dice, Mines, Plinko, RPS, Slots }

    uint256 public constant MAX_WAGER_PER_ROUND = 0.0005 ether;
    uint256 public constant MAX_ROUNDS = 10;
    uint256 public constant GAME_TIMEOUT = 15 minutes;

    // Sum of worst-case payouts reserved across unsettled games.
    uint256 public totalActiveLiability;
    uint256 public nextGameId;

    struct PendingGame {
        address player;
        uint256 wager; // total wager pulled (wagerPerRound * rounds)
        uint256 maxPayout;
        euint256 seed;
        uint64 createdAt;
        bool settled;
        Kind kind;
        bytes params;
    }

    mapping(uint256 => PendingGame) internal _games;

    uint8 private constant _NOT_ENTERED = 1;
    uint8 private constant _ENTERED = 2;
    uint8 private _entered = _NOT_ENTERED;

    error ZeroWager();
    error WagerTooHigh();
    error InvalidRounds();
    error InsufficientValue();
    error InsufficientBankroll();
    error UnknownGame();
    error AlreadySettled();
    error HandleMismatch();
    error InvalidAttestation();
    error NotExpired();
    error ExceedsAvailable();

    event BankrollFunded(address indexed from, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);
    event BetPlaced(
        uint256 indexed gameId,
        address indexed player,
        uint256 wager,
        bytes32 seedHandle,
        uint8 kind
    );
    event BetSettled(
        uint256 indexed gameId,
        address indexed player,
        uint256 wager,
        uint256 payout,
        uint256 randomSeed,
        uint8 kind
    );
    event BetExpired(uint256 indexed gameId, address indexed player, uint256 refund);

    // Per-game outcome events drive the inline result strip in the UI.
    event CoinFlip_Outcome_Event(
        uint256 indexed gameId, address indexed player, uint256 wagerPerRound,
        uint256 payout, uint8[] outcomes, uint256[] payouts, uint32 rounds
    );
    event Dice_Outcome_Event(
        uint256 indexed gameId, address indexed player, uint256 wagerPerRound,
        uint256 payout, uint8[] rolls, uint256[] payouts, uint32 rounds
    );
    event Plinko_Outcome_Event(
        uint256 indexed gameId, address indexed player, uint256 wagerPerRound,
        uint256 payout, uint8[] buckets, uint256[] payouts, uint32 rounds
    );
    event RPS_Outcome_Event(
        uint256 indexed gameId, address indexed player, uint256 wagerPerRound,
        uint256 payout, uint8[] houseActions, uint256[] payouts, uint32 rounds
    );
    event Slot_Outcome_Event(
        uint256 indexed gameId, address indexed player, uint256 wagerPerRound,
        uint256 payout, uint8[3][] spins, uint256[] payouts, uint32 rounds
    );
    event Mines_Outcome_Event(
        uint256 indexed gameId, address indexed player, uint256 wager,
        uint256 payout, uint8[2][] selectedPoints, uint8[2][] minePositions
    );

    modifier nonReentrant() {
        require(_entered != _ENTERED, "reentrant");
        _entered = _ENTERED;
        _;
        _entered = _NOT_ENTERED;
    }

    constructor() Ownable(msg.sender) {}

    // ───────────────────────────── bankroll ─────────────────────────────

    receive() external payable {
        emit BankrollFunded(msg.sender, msg.value);
    }

    /// @notice Fund the house bankroll with ETH.
    function depositBankroll() external payable {
        emit BankrollFunded(msg.sender, msg.value);
    }

    /// @notice ETH not reserved against active games.
    function availableBankroll() public view returns (uint256) {
        uint256 bal = address(this).balance;
        return bal <= totalActiveLiability ? 0 : bal - totalActiveLiability;
    }

    /// @notice Inco fee per randomness draw.
    function getFee() external view returns (uint256) {
        return inco.getFee();
    }

    /// @notice Withdraw non-reserved bankroll to the owner.
    function withdraw(uint256 amount) external onlyOwner nonReentrant {
        if (amount > availableBankroll()) revert ExceedsAvailable();
        _send(owner(), amount);
        emit Withdrawn(owner(), amount);
    }

    /// @notice Withdraw all non-reserved bankroll to the owner.
    function withdrawAll() external onlyOwner nonReentrant {
        uint256 amount = availableBankroll();
        _send(owner(), amount);
        emit Withdrawn(owner(), amount);
    }

    // ─────────────────────────── shared core ────────────────────────────

    function _validate(uint256 wagerPerRound, uint256 rounds) internal pure {
        if (wagerPerRound == 0) revert ZeroWager();
        if (wagerPerRound > MAX_WAGER_PER_ROUND) revert WagerTooHigh();
        if (rounds == 0 || rounds > MAX_ROUNDS) revert InvalidRounds();
    }

    function _open(
        uint256 wager,
        uint256 maxPayout,
        Kind kind,
        bytes memory params
    ) internal returns (uint256 gameId) {
        // msg.value must cover the wager (kept as bankroll) plus the Inco fee
        // (spent by e.rand from this contract's balance).
        if (msg.value < wager + inco.getFee()) revert InsufficientValue();

        // Sealed draw + public reveal for later attestation.
        euint256 seed = e.rand();
        e.allowThis(seed);
        e.reveal(seed);

        // Fee has left; balance now backs the wager. Ensure solvency.
        if (address(this).balance < totalActiveLiability + maxPayout) revert InsufficientBankroll();
        totalActiveLiability += maxPayout;

        gameId = nextGameId++;
        _games[gameId] = PendingGame({
            player: msg.sender,
            wager: wager,
            maxPayout: maxPayout,
            seed: seed,
            createdAt: uint64(block.timestamp),
            settled: false,
            kind: kind,
            params: params
        });

        emit BetPlaced(gameId, msg.sender, wager, euint256.unwrap(seed), uint8(kind));
    }

    function _consume(
        uint256 gameId,
        DecryptionAttestation calldata attestation,
        bytes[] calldata signatures
    ) internal returns (uint256 seed, PendingGame storage game) {
        game = _games[gameId];
        if (game.player == address(0)) revert UnknownGame();
        if (game.settled) revert AlreadySettled();
        if (attestation.handle != euint256.unwrap(game.seed)) revert HandleMismatch();
        if (!inco.incoVerifier().isValidDecryptionAttestation(attestation, signatures)) {
            revert InvalidAttestation();
        }
        game.settled = true;
        totalActiveLiability -= game.maxPayout;
        seed = uint256(attestation.value);
    }

    // Cap to the reserved max, release-then-send (checks-effects-interactions).
    function _pay(PendingGame storage game, uint256 payout) internal returns (uint256) {
        if (payout > game.maxPayout) payout = game.maxPayout;
        if (payout > 0) _send(game.player, payout);
        return payout;
    }

    function _send(address to, uint256 amount) private {
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "send failed");
    }

    // Expand one seed into independent pseudo-random words.
    function _word(uint256 seed, uint256 index) internal pure returns (uint256) {
        return uint256(keccak256(abi.encode(seed, index)));
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
        if (refund > 0) _send(game.player, refund);
        emit BetExpired(gameId, game.player, refund);
    }

    function getGame(uint256 gameId) external view returns (PendingGame memory) {
        return _games[gameId];
    }

    // ───────────────────────────── CoinFlip ─────────────────────────────
    // Bet heads/tails; a win pays 1.98x.
    struct CoinFlipParams { uint256 wagerPerRound; bool isHeads; uint32 rounds; }

    function playCoinFlip(uint256 wagerPerRound, bool isHeads, uint32 rounds)
        external payable nonReentrant returns (uint256 gameId)
    {
        _validate(wagerPerRound, rounds);
        uint256 total = wagerPerRound * rounds;
        uint256 maxPayout = (total * 19800) / 10000;
        gameId = _open(total, maxPayout, Kind.CoinFlip, abi.encode(CoinFlipParams(wagerPerRound, isHeads, rounds)));
    }

    function _settleCoinFlip(uint256 gameId, uint256 seed, PendingGame storage game) private {
        CoinFlipParams memory p = abi.decode(game.params, (CoinFlipParams));
        uint8[] memory outcomes = new uint8[](p.rounds);
        uint256[] memory payouts = new uint256[](p.rounds);
        uint256 payout;
        for (uint32 i = 0; i < p.rounds; i++) {
            outcomes[i] = uint8(_word(seed, i) % 2);
            bool win = (outcomes[i] == 1 && p.isHeads) || (outcomes[i] == 0 && !p.isHeads);
            if (win) {
                uint256 w = (p.wagerPerRound * 19800) / 10000;
                payouts[i] = w;
                payout += w;
            }
        }
        uint256 paid = _pay(game, payout);
        emit BetSettled(gameId, game.player, game.wager, paid, seed, uint8(Kind.CoinFlip));
        emit CoinFlip_Outcome_Event(gameId, game.player, p.wagerPerRound, paid, outcomes, payouts, p.rounds);
    }

    // ─────────────────────────────── Dice ───────────────────────────────
    // Bet the roll (0..100) is over/under a guess 1..99.
    struct DiceParams { uint8 guess; bool isOver; uint256 wagerPerRound; uint32 rounds; }

    function playDice(uint8 guess, bool isOver, uint256 wagerPerRound, uint32 rounds)
        external payable nonReentrant returns (uint256 gameId)
    {
        require(guess > 0 && guess < 100, "guess 1..99");
        _validate(wagerPerRound, rounds);
        uint256 total = wagerPerRound * rounds;
        uint256 maxPayout = _dicePayout(guess, isOver, wagerPerRound) * rounds;
        gameId = _open(total, maxPayout, Kind.Dice, abi.encode(DiceParams(guess, isOver, wagerPerRound, rounds)));
    }

    function _settleDice(uint256 gameId, uint256 seed, PendingGame storage game) private {
        DiceParams memory p = abi.decode(game.params, (DiceParams));
        uint8[] memory rolls = new uint8[](p.rounds);
        uint256[] memory payouts = new uint256[](p.rounds);
        uint256 payout;
        for (uint32 i = 0; i < p.rounds; i++) {
            uint8 roll = uint8(_word(seed, i) % 101);
            rolls[i] = roll;
            bool win = (p.isOver && roll > p.guess) || (!p.isOver && roll < p.guess);
            if (win) {
                uint256 w = _dicePayout(p.guess, p.isOver, p.wagerPerRound);
                payouts[i] = w;
                payout += w;
            }
        }
        uint256 paid = _pay(game, payout);
        emit BetSettled(gameId, game.player, game.wager, paid, seed, uint8(Kind.Dice));
        emit Dice_Outcome_Event(gameId, game.player, p.wagerPerRound, paid, rolls, payouts, p.rounds);
    }

    function _dicePayout(uint8 guess, bool isOver, uint256 wager) internal pure returns (uint256) {
        uint256 probability = isOver ? (100 - guess) : guess;
        return (((wager * 100) / probability) * 98) / 100;
    }

    // ─────────────────────────────── Mines ──────────────────────────────
    // Pick tiles on a 5x5 grid; avoid the hidden mines. Single board.
    struct MinesParams { uint8[2][] points; uint8 numMines; uint256 wager; }

    function playMines(uint8[2][] calldata points, uint8 numMines, uint256 wager)
        external payable nonReentrant returns (uint256 gameId)
    {
        require(numMines > 0 && numMines <= 5, "mines 1..5");
        require(points.length > 0 && points.length <= 10, "points 1..10");
        _validate(wager, 1);
        for (uint256 i = 0; i < points.length; i++) {
            require(points[i][0] < 5 && points[i][1] < 5, "bad point");
        }
        uint256 maxPayout = wager * (points.length * numMines);
        gameId = _open(wager, maxPayout, Kind.Mines, abi.encode(MinesParams(points, numMines, wager)));
    }

    function _settleMines(uint256 gameId, uint256 seed, PendingGame storage game) private {
        MinesParams memory p = abi.decode(game.params, (MinesParams));
        uint32 random = uint32(seed);
        uint8[2][] memory minePositions = new uint8[2][](p.numMines);
        for (uint8 i = 0; i < p.numMines; i++) {
            uint8 r1 = uint8(((random >> (i * 5)) & 0x3F) % 5);
            uint8 r2 = uint8(((random >> ((i * 5) + 3)) & 0x3F) % 5);
            minePositions[i] = [r1, r2];
        }
        bool hitMine = false;
        for (uint256 i = 0; i < p.points.length && !hitMine; i++) {
            for (uint256 j = 0; j < minePositions.length; j++) {
                if (p.points[i][0] == minePositions[j][0] && p.points[i][1] == minePositions[j][1]) {
                    hitMine = true;
                    break;
                }
            }
        }
        uint256 payout = hitMine ? 0 : p.wager * (p.points.length * p.numMines);
        uint256 paid = _pay(game, payout);
        emit BetSettled(gameId, game.player, game.wager, paid, seed, uint8(Kind.Mines));
        emit Mines_Outcome_Event(gameId, game.player, p.wager, paid, p.points, minePositions);
    }

    // ─────────────────────────────── Plinko ─────────────────────────────
    // Drop through 8 pegs; edges pay up to 16x.
    struct PlinkoParams { uint256 wagerPerRound; uint32 rounds; }

    function playPlinko(uint256 wagerPerRound, uint32 rounds)
        external payable nonReentrant returns (uint256 gameId)
    {
        _validate(wagerPerRound, rounds);
        uint256 total = wagerPerRound * rounds;
        uint256 maxPayout = wagerPerRound * 16 * rounds;
        gameId = _open(total, maxPayout, Kind.Plinko, abi.encode(PlinkoParams(wagerPerRound, rounds)));
    }

    function _settlePlinko(uint256 gameId, uint256 seed, PendingGame storage game) private {
        PlinkoParams memory p = abi.decode(game.params, (PlinkoParams));
        uint8[] memory buckets = new uint8[](p.rounds);
        uint256[] memory payouts = new uint256[](p.rounds);
        uint256 payout;
        for (uint32 i = 0; i < p.rounds; i++) {
            uint8 r = uint8(_word(seed, i));
            int8 position = 0;
            for (uint8 b = 0; b < 8; b++) {
                if ((r >> b) & 1 == 1) position += 1;
                else position -= 1;
            }
            buckets[i] = uint8(int8(position) + 8); // 0..16
            uint256 w = _plinkoPayout(p.wagerPerRound, position);
            payouts[i] = w;
            payout += w;
        }
        uint256 paid = _pay(game, payout);
        emit BetSettled(gameId, game.player, game.wager, paid, seed, uint8(Kind.Plinko));
        emit Plinko_Outcome_Event(gameId, game.player, p.wagerPerRound, paid, buckets, payouts, p.rounds);
    }

    function _plinkoPayout(uint256 wager, int8 position) internal pure returns (uint256) {
        if (position == -8 || position == 8) return wager * 16;
        if (position == -7 || position == 7) return wager * 8;
        if (position == -6 || position == 6) return wager * 4;
        if (position == -5 || position == 5) return wager * 2;
        if (position == -4 || position == 4) return wager;
        if (position == -3 || position == 3) return wager / 2;
        if (position == -2 || position == 2) return wager / 4;
        if (position == -1 || position == 1) return wager / 8;
        return wager / 16;
    }

    // ──────────────────────── RockPaperScissors ─────────────────────────
    // Play vs a hidden house move; win 1.75x, tie refunds.
    struct RPSParams { uint8 action; uint256 wagerPerRound; uint32 rounds; }

    function playRPS(uint8 action, uint256 wagerPerRound, uint32 rounds)
        external payable nonReentrant returns (uint256 gameId)
    {
        require(action < 3, "action 0..2");
        _validate(wagerPerRound, rounds);
        uint256 total = wagerPerRound * rounds;
        uint256 maxPayout = (total * 7) / 4;
        gameId = _open(total, maxPayout, Kind.RPS, abi.encode(RPSParams(action, wagerPerRound, rounds)));
    }

    function _settleRPS(uint256 gameId, uint256 seed, PendingGame storage game) private {
        RPSParams memory p = abi.decode(game.params, (RPSParams));
        uint8[] memory houseActions = new uint8[](p.rounds);
        uint256[] memory payouts = new uint256[](p.rounds);
        uint256 payout;
        for (uint32 i = 0; i < p.rounds; i++) {
            uint8 house = uint8(_word(seed, i) % 3);
            houseActions[i] = house;
            if (house == p.action) {
                payouts[i] = p.wagerPerRound; // tie: refund
                payout += p.wagerPerRound;
            } else if (
                (p.action == 0 && house == 2) ||
                (p.action == 1 && house == 0) ||
                (p.action == 2 && house == 1)
            ) {
                uint256 w = (p.wagerPerRound * 7) / 4; // win: 1.75x
                payouts[i] = w;
                payout += w;
            }
        }
        uint256 paid = _pay(game, payout);
        emit BetSettled(gameId, game.player, game.wager, paid, seed, uint8(Kind.RPS));
        emit RPS_Outcome_Event(gameId, game.player, p.wagerPerRound, paid, houseActions, payouts, p.rounds);
    }

    // ──────────────────────────── SlotMachine ───────────────────────────
    // Spin three reels (0..7); 7-7-7 pays 5x, max 5.25x.
    struct SlotParams { uint256 wagerPerRound; uint32 rounds; }

    function playSlots(uint256 wagerPerRound, uint32 rounds)
        external payable nonReentrant returns (uint256 gameId)
    {
        _validate(wagerPerRound, rounds);
        uint256 total = wagerPerRound * rounds;
        uint256 maxPayout = ((wagerPerRound * 21) / 4) * rounds; // 6-6-6 -> 5.25x
        gameId = _open(total, maxPayout, Kind.Slots, abi.encode(SlotParams(wagerPerRound, rounds)));
    }

    function _settleSlots(uint256 gameId, uint256 seed, PendingGame storage game) private {
        SlotParams memory p = abi.decode(game.params, (SlotParams));
        uint8[3][] memory spins = new uint8[3][](p.rounds);
        uint256[] memory payouts = new uint256[](p.rounds);
        uint256 payout;
        for (uint32 i = 0; i < p.rounds; i++) {
            uint8 n1 = uint8(_word(seed, uint256(i) * 3) % 8);
            uint8 n2 = uint8(_word(seed, uint256(i) * 3 + 1) % 8);
            uint8 n3 = uint8(_word(seed, uint256(i) * 3 + 2) % 8);
            spins[i] = [n1, n2, n3];
            uint256 w = _slotPayout(n1, n2, n3, p.wagerPerRound);
            payouts[i] = w;
            payout += w;
        }
        uint256 paid = _pay(game, payout);
        emit BetSettled(gameId, game.player, game.wager, paid, seed, uint8(Kind.Slots));
        emit Slot_Outcome_Event(gameId, game.player, p.wagerPerRound, paid, spins, payouts, p.rounds);
    }

    function _slotPayout(uint8 n1, uint8 n2, uint8 n3, uint256 bet) internal pure returns (uint256) {
        if (n1 == 7 && n2 == 7 && n3 == 7) return bet * 5;
        if (n1 == n2 && n2 == n3) return (bet * (uint256(n1) + 1) * 3) / 4;
        if ((n1 == 7 && n2 == 7) || (n2 == 7 && n3 == 7) || (n1 == 7 && n3 == 7)) return (bet * 3) / 2;
        bool ascending = (n1 + 1 == n2 && n2 + 1 == n3);
        bool descending = (n3 + 1 == n2 && n2 + 1 == n1);
        if (ascending || descending) return (bet * 2) / 3;
        if (n1 == n2 || n1 == n3 || n2 == n3) return bet / 3;
        return 0;
    }

    // ───────────────────────────── settle ───────────────────────────────

    /// @notice Verify the covalidator attestation and pay out the game.
    function settle(
        uint256 gameId,
        DecryptionAttestation calldata attestation,
        bytes[] calldata signatures
    ) external nonReentrant {
        (uint256 seed, PendingGame storage game) = _consume(gameId, attestation, signatures);
        Kind k = game.kind;
        if (k == Kind.CoinFlip) _settleCoinFlip(gameId, seed, game);
        else if (k == Kind.Dice) _settleDice(gameId, seed, game);
        else if (k == Kind.Mines) _settleMines(gameId, seed, game);
        else if (k == Kind.Plinko) _settlePlinko(gameId, seed, game);
        else if (k == Kind.RPS) _settleRPS(gameId, seed, game);
        else _settleSlots(gameId, seed, game);
    }
}
