// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.30;

import {CasinoBase} from "./CasinoBase.sol";
import {DecryptionAttestation} from "@inco/lightning/src/lightning-parts/DecryptionAttester.types.sol";

/// @title CoinFlip
/// @notice Bet heads/tails over numBets rounds; a win pays 1.98x.
contract CoinFlip is CasinoBase {
    uint256 private constant WIN_NUM = 19800;
    uint256 private constant WIN_DEN = 10000;

    struct Params {
        uint256 wagerPerBet;
        bool isHeads;
        uint32 numBets;
        uint256 stopGain;
        uint256 stopLoss;
    }

    error InvalidNumBets(uint256 maxNumBets);

    event CoinFlip_Play_Event(
        uint256 indexed gameId,
        address indexed player,
        uint256 wager,
        bool isHeads,
        uint32 numBets,
        uint256 stopGain,
        uint256 stopLoss
    );
    event CoinFlip_Outcome_Event(
        uint256 indexed gameId,
        address indexed player,
        uint256 wager,
        uint256 payout,
        uint8[] coinOutcomes,
        uint256[] payouts,
        uint32 numGames
    );

    constructor(address token) CasinoBase(token) {}

    function play(
        uint256 wager,
        bool isHeads,
        uint32 numBets,
        uint256 stopGain,
        uint256 stopLoss
    ) external payable nonReentrant returns (uint256 gameId) {
        if (!(numBets > 0 && numBets <= 100)) revert InvalidNumBets(100);

        uint256 totalWager = wager * numBets;
        uint256 maxPayout = (totalWager * WIN_NUM) / WIN_DEN;

        gameId = _openGame(
            totalWager,
            maxPayout,
            abi.encode(Params(wager, isHeads, numBets, stopGain, stopLoss))
        );
        emit CoinFlip_Play_Event(gameId, msg.sender, wager, isHeads, numBets, stopGain, stopLoss);
    }

    function settle(
        uint256 gameId,
        DecryptionAttestation calldata attestation,
        bytes[] calldata signatures
    ) external nonReentrant {
        (uint256 seed, PendingGame storage game) = _consumeSettlement(gameId, attestation, signatures);
        Params memory p = abi.decode(game.params, (Params));

        uint8[] memory coinFlip = new uint8[](p.numBets);
        uint256[] memory payouts = new uint256[](p.numBets);
        int256 totalValue;
        uint256 payout;
        uint32 i;

        for (i = 0; i < p.numBets; i++) {
            if (totalValue >= int256(p.stopGain)) break;
            if (p.stopLoss != 0 && totalValue <= -int256(p.stopLoss)) break;

            coinFlip[i] = uint8(_word(seed, i) % 2);

            if ((coinFlip[i] == 1 && p.isHeads) || (coinFlip[i] == 0 && !p.isHeads)) {
                uint256 win = (p.wagerPerBet * WIN_NUM) / WIN_DEN;
                payout += win;
                payouts[i] = win;
                totalValue += int256((p.wagerPerBet * 9800) / 10000);
            } else {
                totalValue -= int256(p.wagerPerBet);
            }
        }

        // Refund rounds skipped by stopGain/stopLoss.
        payout += (p.numBets - i) * p.wagerPerBet;

        _finishPayout(gameId, game, payout, seed);
        emit CoinFlip_Outcome_Event(gameId, game.player, p.wagerPerBet, payout, coinFlip, payouts, i);
    }
}
