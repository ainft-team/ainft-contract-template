// SPDX-License-Identifier: UNLICENSED
// AINFT Contracts v1.0.0
pragma solidity ^0.8.9;

import { Strings } from "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

abstract contract AINFTv1 is ERC721Enumerable, ERC721Burnable, Ownable, AccessControl {
  using Strings for uint256;

  uint256 public maxMintQuantity = 100;
  uint256 public nextTokenId = 1;
  uint256 public maxTokenId;
  bytes32 public constant OWNER_ROLE = keccak256("OWNER");
  bytes32 public constant MINTER_ROLE = keccak256("MINTER");
  string public baseURI = "";
  uint8 private constant TOKEN_FETCH_LIMIT = 100;

  event Mint(address indexed to, uint256 indexed startTokenId, uint256 quantity);

  constructor(
    string memory name_,
    string memory symbol_,
    string memory baseURI_,
    uint256 maxTokenId_
  ) ERC721(name_, symbol_) {
    require(bytes(baseURI_).length > 0, "AINFTv1: invalid baseURI");

    _grantRole(OWNER_ROLE, msg.sender);
    _grantRole(MINTER_ROLE, msg.sender);
    _setRoleAdmin(MINTER_ROLE, OWNER_ROLE);

    baseURI = baseURI_;
    maxTokenId = maxTokenId_;
  }
  
  // ============= QUERY
  
  function supportsInterface(
    bytes4 interfaceId_
  ) public view virtual override(AccessControl, ERC721, ERC721Enumerable) returns (bool) {
    return super.supportsInterface(interfaceId_);
  }

  function tokenURI(uint256 tokenId_) public view override returns (string memory) {
    require(_exists(tokenId_), "AINFTv1: URI query for nonexistent token");
    require(bytes(baseURI).length > 0, "AINFTv1: invalid baseURI");

    return string(abi.encodePacked(baseURI, tokenId_.toString()));
  }

  /**
   * @dev Returns the token IDs of the owner, starting at the `offset_` ending at `offset_ + limit_ - 1`
   * @param owner_ address of the owner
   * @param offset_ index offset to start enumerating within the ownedTokens list of the owner
   * @param limit_ max number of IDs to fetch
   */
  function tokensOf(
    address owner_,
    uint256 offset_,
    uint256 limit_
  ) public view returns (uint256[] memory) {
    uint256 balance = ERC721.balanceOf(owner_);
    require(limit_ <= TOKEN_FETCH_LIMIT, "AINFTv1: limit too large");
    require(offset_ < balance, "AINFTv1: invalid offset");

    uint256 numToReturn = (offset_ + limit_ <= balance) ? limit_ : balance - offset_;
    uint256[] memory ownedTokens = new uint256[](numToReturn);
    for (uint256 i = 0; i < numToReturn; i++) {
      ownedTokens[i] = tokenOfOwnerByIndex(owner_, offset_ + i);
    }
    return ownedTokens;
  }

  // ============= TX

  function setBaseURI(string calldata baseURI_) public onlyRole(OWNER_ROLE) {
    require(bytes(baseURI_).length > 0, "AINFTv1: invalid value");
    baseURI = baseURI_;
  }

  function setMaxTokenId(uint256 maxTokenId_) public onlyRole(OWNER_ROLE) {
    require(nextTokenId - 1 <= maxTokenId_, "AINFTv1: invalid value");
    maxTokenId = maxTokenId_;
  }

  function mint(address to_, uint256 quantity_) public onlyRole(MINTER_ROLE) returns (uint256) {
    require(to_ != address(0), "AINFTv1: invalid address");
    require(0 < quantity_ && quantity_ <= maxMintQuantity, "AINFTv1: invalid quantity");
    require(nextTokenId + quantity_ - 1 <= maxTokenId, "AINFTv1: exceeds maxTokenId");
    
    uint256 startTokenId = nextTokenId;
    for (uint256 i = 0; i < quantity_; i++) {
      _safeMint(to_, nextTokenId);
      nextTokenId += 1;
    }
    emit Mint(to_, startTokenId, quantity_);

    return startTokenId;
  }

  function burn(uint256 tokenId_) public override virtual onlyRole(OWNER_ROLE) {
    _burn(tokenId_);
  }

  function destroy(address payable to_) public onlyRole(OWNER_ROLE) {
    require(to_ != address(0), "AINFTv1: invalid address");
    selfdestruct(to_);
  }

  // ============= HOOKS

  function _beforeTokenTransfer(
    address from_,
    address to_,
    uint256 tokenId_
  ) internal override(ERC721, ERC721Enumerable) {
    super._beforeTokenTransfer(from_, to_, tokenId_);
  }
}
