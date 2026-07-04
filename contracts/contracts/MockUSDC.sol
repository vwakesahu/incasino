// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockUSDC
/// @notice Plain public ERC20 bet token (18 decimals).
contract MockUSDC is ERC20 {
    uint256 public constant FAUCET_AMOUNT = 1_000 * 1e18;

    constructor() ERC20("USDC Token", "USDC") {
        _mint(msg.sender, 1_000_000_000 * 1e18);
    }

    /// @notice Mint FAUCET_AMOUNT to the caller.
    function faucet() external {
        _mint(msg.sender, FAUCET_AMOUNT);
    }

    /// @notice Mint to an address (test helper).
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
