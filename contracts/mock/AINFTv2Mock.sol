// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;
import '../ainft/AINFTBaseV2.sol';

contract AINFTv2Mock is AINFTBaseV2 {
  constructor(
    string memory name_,
    string memory symbol_,
    string memory baseURI_,
    uint256 maxTokenId_
  ) AINFTBaseV2(name_, symbol_, baseURI_, maxTokenId_) {}
}
