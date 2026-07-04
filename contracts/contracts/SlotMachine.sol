// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.30;

import {CasinoBase} from "./CasinoBase.sol";
import {DecryptionAttestation} from "@inco/lightning/src/lightning-parts/DecryptionAttester.types.sol";

/// @title SlotMachine
/// @notice Spin three reels (0..7); 7-7-7 pays 5x, max 5.25x.
contract SlotMachine is CasinoBase {
    struct Params {
        uint256 wager;
    }

    event Slot_Play_Event(uint256 indexed gameId, address indexed player, uint256 wager);
    event Slot_Outcome_Event(
        uint256 indexed gameId,
        address indexed player,
        uint256 wager,
        uint256 payout,
        uint8[3] spin
    );

    constructor(address token) CasinoBase(token) {}

    function play(uint256 wager) external payable nonReentrant returns (uint256 gameId) {
        uint256 maxPayout = (wager * 21) / 4; // 6-6-6 -> 5.25x
        gameId = _openGame(wager, maxPayout, abi.encode(Params(wager)));
        emit Slot_Play_Event(gameId, msg.sender, wager);
    }

    function settle(
        uint256 gameId,
        DecryptionAttestation calldata attestation,
        bytes[] calldata signatures
    ) external nonReentrant {
        (uint256 seed, PendingGame storage game) = _consumeSettlement(gameId, attestation, signatures);
        Params memory p = abi.decode(game.params, (Params));

        uint8 n1 = uint8(_word(seed, 0) % 8);
        uint8 n2 = uint8(_word(seed, 1) % 8);
        uint8 n3 = uint8(_word(seed, 2) % 8);

        uint256 payout = _slotPayout(n1, n2, n3, p.wager);
        _finishPayout(gameId, game, payout, seed);
        emit Slot_Outcome_Event(gameId, game.player, p.wager, payout, [n1, n2, n3]);
    }

    function _slotPayout(uint8 n1, uint8 n2, uint8 n3, uint256 bet) internal pure returns (uint256) {
        if (n1 == 7 && n2 == 7 && n3 == 7) return bet * 5;
        if (n1 == n2 && n2 == n3) return (bet * (uint256(n1) + 1) * 3) / 4;
        if ((n1 == 7 && n2 == 7) || (n2 == 7 && n3 == 7) || (n1 == 7 && n3 == 7)) {
            return (bet * 3) / 2;
        }
        // Consecutive run, additions only to avoid underflow.
        bool ascending = (n1 + 1 == n2 && n2 + 1 == n3);
        bool descending = (n3 + 1 == n2 && n2 + 1 == n1);
        if (ascending || descending) {
            return (bet * 2) / 3;
        }
        if (n1 == n2 || n1 == n3 || n2 == n3) return bet / 3;
        return 0;
    }
}
