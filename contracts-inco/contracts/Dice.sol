// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.30;

import {CasinoBase} from "./CasinoBase.sol";
import {DecryptionAttestation} from "@inco/lightning/src/lightning-parts/DecryptionAttester.types.sol";

/// @title Dice
/// @notice Bet the roll (0..100) is over/under a guess 1..99.
contract Dice is CasinoBase {
    struct Params {
        uint8 playerGuess;
        bool isOver;
        uint256 wager;
    }

    event Dice_Play_Event(
        uint256 indexed gameId,
        address indexed player,
        uint8 playerGuess,
        bool isOver,
        uint256 wager
    );
    event Dice_Outcome_Event(
        uint256 indexed gameId,
        address indexed player,
        uint256 wager,
        uint256 payout,
        uint8 diceValue
    );

    constructor(address token) CasinoBase(token) {}

    function play(
        uint8 playerGuess,
        bool isOver,
        uint256 wager
    ) external payable nonReentrant returns (uint256 gameId) {
        require(playerGuess > 0 && playerGuess < 100, "Guess must be between 0 and 100");

        uint256 payout = _winPayout(playerGuess, isOver, wager);
        gameId = _openGame(wager, payout, abi.encode(Params(playerGuess, isOver, wager)));
        emit Dice_Play_Event(gameId, msg.sender, playerGuess, isOver, wager);
    }

    function settle(
        uint256 gameId,
        DecryptionAttestation calldata attestation,
        bytes[] calldata signatures
    ) external nonReentrant {
        (uint256 seed, PendingGame storage game) = _consumeSettlement(gameId, attestation, signatures);
        Params memory p = abi.decode(game.params, (Params));

        uint8 roll = uint8(seed % 101);
        bool win = (p.isOver && roll > p.playerGuess) || (!p.isOver && roll < p.playerGuess);
        uint256 payout = win ? _winPayout(p.playerGuess, p.isOver, p.wager) : 0;

        _finishPayout(gameId, game, payout, seed);
        emit Dice_Outcome_Event(gameId, game.player, p.wager, payout, roll);
    }

    // Same formula used to reserve and to pay, so they can't drift.
    function _winPayout(uint8 playerGuess, bool isOver, uint256 wager) internal pure returns (uint256) {
        uint256 probability = isOver ? (100 - playerGuess) : playerGuess;
        return (((wager * 100) / probability) * 98) / 100;
    }
}
