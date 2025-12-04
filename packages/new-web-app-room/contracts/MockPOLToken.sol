// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockPOLToken
 * @dev Mock POL token for testing the prediction market
 * In production, this would be the actual POL token on Polygon
 */
contract MockPOLToken is ERC20, Ownable {
    uint256 public constant INITIAL_SUPPLY = 1000000 * 10**18; // 1 million POL
    
    constructor() ERC20("Polygon", "POL") Ownable(msg.sender) {
        _mint(msg.sender, INITIAL_SUPPLY);
    }
    
    /**
     * @dev Mint tokens for testing purposes
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    /**
     * @dev Faucet function for users to get test tokens
     * @param amount Amount of tokens to claim (max 1000 POL per call)
     */
    function faucet(uint256 amount) external {
        require(amount <= 1000 * 10**18, "Max 1000 POL per faucet call");
        _mint(msg.sender, amount);
    }
}


