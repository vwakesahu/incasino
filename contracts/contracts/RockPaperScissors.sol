// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.30;

import {CasinoBase} from "./CasinoBase.sol";
import {DecryptionAttestation} from "@inco/lightning/src/lightning-parts/DecryptionAttester.types.sol";

/// @title RockPaperScissors
/// @notice Play vs a hidden house move; win 1.75x, tie refunds.
contract RockPaperScissors is CasinoBase {
    struct Params {
        uint8 action;
        uint32 numBets;
        uint256 wager;
        uint256 stopGain;
        uint256 stopLoss;
    }

    error InvalidAction();
    error InvalidNumBets(uint256 maxNumBets);

    event RPS_Play_Event(
        uint256 indexed gameId,
        address indexed player,
        uint8 action,
        uint32 numBets,
        uint256 wager,
        uint256 stopGain,
        uint256 stopLoss
    );
    event RPS_Outcome_Event(
        uint256 indexed gameId,
        address indexed player,
        uint256 wager,
        uint256 payout,
        uint256[] payouts,
        uint8[] houseActions,
        uint32 numGames
    );

    constructor(address token) CasinoBase(token) {}

    function play(
        uint256 wager,
        uint8 action,
        uint32 numBets,
        uint256 stopGain,
        uint256 stopLoss
    ) external payable nonReentrant returns (uint256 gameId) {
        if (action >= 3) revert InvalidAction();
        if (!(numBets > 0 && numBets <= 100)) revert InvalidNumBets(100);

        uint256 totalWager = wager * numBets;
        uint256 maxPayout = (totalWager * 7) / 4;

        gameId = _openGame(totalWager, maxPayout, abi.encode(Params(action, numBets, wager, stopGain, stopLoss)));
        emit RPS_Play_Event(gameId, msg.sender, action, numBets, wager, stopGain, stopLoss);
    }

    function settle(
        uint256 gameId,
        DecryptionAttestation calldata attestation,
        bytes[] calldata signatures
    ) external nonReentrant {
        (uint256 seed, PendingGame storage game) = _consumeSettlement(gameId, attestation, signatures);
        Params memory p = abi.decode(game.params, (Params));

        uint8[] memory houseActions = new uint8[](p.numBets);
        uint256[] memory payouts = new uint256[](p.numBets);
        int256 totalValue;
        uint256 payout;
        uint32 i;

        for (i = 0; i < p.numBets; i++) {
            if (totalValue >= int256(p.stopGain)) break;
            if (p.stopLoss != 0 && totalValue <= -int256(p.stopLoss)) break;

            houseActions[i] = uint8(_word(seed, i) % 3);

            if (houseActions[i] == p.action) {
                // tie: refund
                payouts[i] = p.wager;
                payout += p.wager;
                totalValue += int256(p.wager);
            } else if (
                (p.action == 0 && houseActions[i] == 2) ||
                (p.action == 1 && houseActions[i] == 0) ||
                (p.action == 2 && houseActions[i] == 1)
            ) {
                // win: 1.75x
                uint256 win = (p.wager * 7) / 4;
                payouts[i] = win;
                payout += win;
                totalValue += int256(win);
            } else {
                totalValue -= int256(p.wager);
            }
        }

        payout += (p.numBets - i) * p.wager;

        _finishPayout(gameId, game, payout, seed);
        emit RPS_Outcome_Event(gameId, game.player, p.wager, payout, payouts, houseActions, i);
    }
}
