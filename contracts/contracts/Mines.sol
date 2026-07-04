// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.30;

import {CasinoBase} from "./CasinoBase.sol";
import {DecryptionAttestation} from "@inco/lightning/src/lightning-parts/DecryptionAttester.types.sol";

/// @title Mines
/// @notice Pick tiles on a 5x5 grid; avoid the hidden mines to win.
contract Mines is CasinoBase {
    struct Params {
        uint8[2][] points;
        uint8 numMines;
        uint256 wager;
    }

    event Mines_Play_Event(
        uint256 indexed gameId,
        address indexed player,
        uint8 numMines,
        uint256 wager
    );
    event Mines_Outcome_Event(
        uint256 indexed gameId,
        address indexed player,
        uint256 wager,
        uint256 payout,
        uint8[2][] selectedPoints,
        uint8[2][] minePositions
    );

    constructor(address token) CasinoBase(token) {}

    function play(
        uint8[2][] calldata points,
        uint8 numMines,
        uint256 wager
    ) external payable nonReentrant returns (uint256 gameId) {
        require(numMines > 0 && numMines <= 5, "Invalid number of mines");
        require(points.length > 0 && points.length <= 10, "Cannot select 0 or >10 points");
        for (uint8 i = 0; i < points.length; i++) {
            require(points[i][0] < 5 && points[i][1] < 5, "Invalid point coordinates");
        }

        uint256 maxPayout = wager * (uint256(points.length) * numMines);
        gameId = _openGame(wager, maxPayout, abi.encode(Params(points, numMines, wager)));
        emit Mines_Play_Event(gameId, msg.sender, numMines, wager);
    }

    function settle(
        uint256 gameId,
        DecryptionAttestation calldata attestation,
        bytes[] calldata signatures
    ) external nonReentrant {
        (uint256 seed, PendingGame storage game) = _consumeSettlement(gameId, attestation, signatures);
        Params memory p = abi.decode(game.params, (Params));

        // Derive mine positions from the seed.
        uint32 random = uint32(seed);
        uint8[2][] memory minePositions = new uint8[2][](p.numMines);
        for (uint8 i = 0; i < p.numMines; i++) {
            uint8 r1 = uint8(((random >> (i * 5)) & 0x3F) % 5);
            uint8 r2 = uint8(((random >> ((i * 5) + 3)) & 0x3F) % 5);
            minePositions[i] = [r1, r2];
        }

        bool hitMine = false;
        for (uint8 i = 0; i < p.points.length; i++) {
            for (uint8 j = 0; j < minePositions.length; j++) {
                if (p.points[i][0] == minePositions[j][0] && p.points[i][1] == minePositions[j][1]) {
                    hitMine = true;
                    break;
                }
            }
            if (hitMine) break;
        }

        uint256 payout = hitMine ? 0 : p.wager * (uint256(p.points.length) * p.numMines);
        _finishPayout(gameId, game, payout, seed);
        emit Mines_Outcome_Event(gameId, game.player, p.wager, payout, p.points, minePositions);
    }
}
