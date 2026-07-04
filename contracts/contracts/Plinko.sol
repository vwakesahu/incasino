// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.30;

import {CasinoBase} from "./CasinoBase.sol";
import {DecryptionAttestation} from "@inco/lightning/src/lightning-parts/DecryptionAttester.types.sol";

/// @title Plinko
/// @notice Drop through 8 random pegs; edges pay up to 16x.
contract Plinko is CasinoBase {
    struct Params {
        uint256 wager;
    }

    event Plinko_Play_Event(uint256 indexed gameId, address indexed player, uint256 wager);
    event Plinko_Outcome_Event(
        uint256 indexed gameId,
        address indexed player,
        uint256 wager,
        uint256 payout,
        uint8[8] randomBits
    );

    constructor(address token) CasinoBase(token) {}

    function play(uint256 wager) external payable nonReentrant returns (uint256 gameId) {
        uint256 maxPayout = wager * 16;
        gameId = _openGame(wager, maxPayout, abi.encode(Params(wager)));
        emit Plinko_Play_Event(gameId, msg.sender, wager);
    }

    function settle(
        uint256 gameId,
        DecryptionAttestation calldata attestation,
        bytes[] calldata signatures
    ) external nonReentrant {
        (uint256 seed, PendingGame storage game) = _consumeSettlement(gameId, attestation, signatures);
        Params memory p = abi.decode(game.params, (Params));

        uint8 r = uint8(seed);
        uint8[8] memory bits;
        int8 position = 0;
        for (uint8 i = 0; i < 8; i++) {
            bits[i] = (r >> i) & 1;
            if (bits[i] == 1) position += 1;
            else position -= 1;
        }

        uint256 payout = _plinkoPayout(p.wager, position);
        _finishPayout(gameId, game, payout, seed);
        emit Plinko_Outcome_Event(gameId, game.player, p.wager, payout, bits);
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
}
