// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;
import '../ainft/AINFTBaseV1.sol';

contract AINFTv1Mock is AINFTBaseV1 {
  constructor(
    string memory name_,
    string memory symbol_,
    string memory baseURI_,
    uint256 maxTokenId_
  ) AINFTBaseV1(name_, symbol_, baseURI_, maxTokenId_) {}
}
