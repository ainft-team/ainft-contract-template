import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
    
const name = 'AINFT V1 Mock';
const symbol = 'AINFTV1MOCK';
const baseURI = 'http://localhost:3000/';
const maxTokenId = 10;

describe("AINFTv1Mock", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployAINFTv1MockFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, minter, ...users] = await ethers.getSigners();
    const AINFTv1Mock = await ethers.getContractFactory("AINFTv1Mock");
    const ainftV1Mock = await AINFTv1Mock.deploy(name, symbol, baseURI, maxTokenId);

    const minterRole = await ainftV1Mock.MINTER_ROLE();
    await ainftV1Mock.connect(owner).grantRole(minterRole, minter.address);

    return { ainftV1Mock, owner, minter, users };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { ainftV1Mock, owner } = await loadFixture(deployAINFTv1MockFixture);

      expect(await ainftV1Mock.owner()).to.equal(owner.address);
    });
    
    it("Should set the right name", async function () {
      const { ainftV1Mock } = await loadFixture(deployAINFTv1MockFixture);

      expect(await ainftV1Mock.name()).to.equal(name);
    });
    
    it("Should set the right symbol", async function () {
      const { ainftV1Mock } = await loadFixture(deployAINFTv1MockFixture);

      expect(await ainftV1Mock.symbol()).to.equal(symbol);
    });
    
    it("Should set the right baseURI", async function () {
      const { ainftV1Mock } = await loadFixture(deployAINFTv1MockFixture);

      expect(await ainftV1Mock.baseURI()).to.equal(baseURI);
    });
    
    it("Should set the right maxTokenId", async function () {
      const { ainftV1Mock } = await loadFixture(deployAINFTv1MockFixture);

      expect(await ainftV1Mock.maxTokenId()).to.equal(maxTokenId);
    });
  });

  describe("Roles", function() {
    it("Should fail to grantRole if sender is unauthorized", async () => {
      const { ainftV1Mock, users } = await loadFixture(deployAINFTv1MockFixture);
      await expect(
        ainftV1Mock.connect(users[0]).grantRole(await ainftV1Mock.MINTER_ROLE(), users[0].address)
      ).to.be.revertedWith(
        "AccessControl: account 0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc is missing role 0x6270edb7c868f86fda4adedba75108201087268ea345934db8bad688e1feb91b"
      );
    });

    it("Should grantRole", async () => {
      const { ainftV1Mock, owner, users } = await loadFixture(deployAINFTv1MockFixture);
      const minterRole = await ainftV1Mock.MINTER_ROLE();
      expect(await ainftV1Mock.hasRole(minterRole, users[0].address)).to.equal(false);
      await ainftV1Mock.connect(owner).grantRole(minterRole, users[0].address);
      expect(await ainftV1Mock.hasRole(minterRole, users[0].address)).to.equal(true);
    });
  });

  describe("Mint", function () {
    describe("Validations", function () {
      it("Should revert with the right error if sender is not authorized", async function () {
        const { ainftV1Mock, users } = await loadFixture(deployAINFTv1MockFixture);

        await expect(ainftV1Mock.connect(users[0]).mint(users[0].address, 1)).to.be.revertedWith(
          "AccessControl: account 0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc is missing role 0xf0887ba65ee2024ea881d91b74c2450ef19e1557f03bed3ea9f16b037cbe2dc9"
        );
      });

      it("Should revert with the right error if invalid 'to' address given", async function () {
        const { ainftV1Mock, minter } = await loadFixture(deployAINFTv1MockFixture);

        await expect(
          ainftV1Mock.connect(minter).mint(ethers.constants.AddressZero, 1)
        ).to.be.revertedWith("AINFTv1: invalid address");
      });

      it("Should revert with invalid quantity is given", async function () {
        const { ainftV1Mock, minter } = await loadFixture(deployAINFTv1MockFixture);

        await expect(ainftV1Mock.connect(minter).mint(minter.address, 0)).to.be.revertedWith(
          "AINFTv1: invalid quantity"
        );
        await expect(ainftV1Mock.connect(minter).mint(minter.address, 101)).to.be.revertedWith(
          "AINFTv1: invalid quantity"
        );
      });

      it("Should revert with the right error if exceeds maxTokenId", async function () {
        const { ainftV1Mock, minter, users } = await loadFixture(deployAINFTv1MockFixture);

        await expect(
          ainftV1Mock.connect(minter).mint(users[0].address, maxTokenId)
        ).not.to.be.reverted;
        await expect(ainftV1Mock.connect(minter).mint(users[0].address, 1)).to.be.revertedWith(
          "AINFTv1: exceeds maxTokenId"
        );
      });

      it("Should mint", async function () {
        const { ainftV1Mock, minter, users } = await loadFixture(deployAINFTv1MockFixture);

        const userAddr = users[0].address;
        await expect(ainftV1Mock.connect(minter).mint(userAddr, 1)).not.to.be.reverted;
        expect(await ainftV1Mock.totalSupply()).to.equal(1);
        expect(await ainftV1Mock.nextTokenId()).to.equal(2);
        expect(await ainftV1Mock.balanceOf(userAddr)).to.equal(1);
        expect(await ainftV1Mock.ownerOf(1)).to.equal(userAddr);
        expect(await ainftV1Mock.tokensOf(userAddr, 0, 1)).to.deep.equal(['1']);
      });
    });

    describe("Events", function () {
      it("Should emit an event on mint", async function () {
        const { ainftV1Mock, minter, users } = await loadFixture(deployAINFTv1MockFixture);
        
        const expectedTokenId = (await ainftV1Mock.nextTokenId()).toNumber();
        await expect(ainftV1Mock.connect(minter).mint(users[0].address, 1))
          .to.emit(ainftV1Mock, "Mint")
          .withArgs(users[0].address, expectedTokenId, 1);
      });

      it("Should emit right events on batch mint", async function () {
        const { ainftV1Mock, minter, users } = await loadFixture(deployAINFTv1MockFixture);
        
        const expectedTokenId = (await ainftV1Mock.nextTokenId()).toNumber();
        await expect(ainftV1Mock.connect(minter).mint(users[0].address, 3))
          .to.emit(ainftV1Mock, "Mint")
          .withArgs(users[0].address, expectedTokenId, 3);
      });
    });

    describe("Transfers", function () {
      it("Should transfer token to the 'to' address", async function () {
        const { ainftV1Mock, minter, users } = await loadFixture(deployAINFTv1MockFixture);

        const userAddr = users[0].address;
        const expectedTokenId = (await ainftV1Mock.nextTokenId()).toNumber();
        await expect(ainftV1Mock.connect(minter).mint(userAddr, 1))
          .to.emit(ainftV1Mock, "Transfer")
          .withArgs(ethers.constants.AddressZero, users[0].address, expectedTokenId);
        expect(await ainftV1Mock.ownerOf(expectedTokenId)).to.equal(userAddr);
        expect(await ainftV1Mock.balanceOf(userAddr)).to.equal(1);
      });
    });
  });

  describe("Tokens Of", function() {
    it("Should fail if invalid limit is given", async () => {
      const { ainftV1Mock, minter, users } = await loadFixture(deployAINFTv1MockFixture);

      await expect(ainftV1Mock.connect(minter).mint(users[0].address, 1)).not.to.be.reverted;
      await expect(ainftV1Mock.tokensOf(users[0].address, 0, 101)).to.be.revertedWith(
        'AINFTv1: limit too large'
      );
    });

    it("Should fail if invalid offset is given", async () => {
      const { ainftV1Mock, minter, users } = await loadFixture(deployAINFTv1MockFixture);

      await expect(ainftV1Mock.connect(minter).mint(users[0].address, 1)).not.to.be.reverted;
      await expect(ainftV1Mock.tokensOf(users[0].address, 2, 1)).to.be.revertedWith(
        'AINFTv1: invalid offset'
      );
    });

    it("Should return the right tokens owned by accounts", async () => {
      const { ainftV1Mock, minter, users } = await loadFixture(deployAINFTv1MockFixture);

      await expect(ainftV1Mock.connect(minter).mint(users[0].address, 2)).not.to.be.reverted; // 1, 2
      await expect(ainftV1Mock.connect(minter).mint(users[1].address, 1)).not.to.be.reverted; // 3
      await expect(ainftV1Mock.connect(minter).mint(users[0].address, 1)).not.to.be.reverted; // 4
      expect(await ainftV1Mock.tokensOf(users[0].address, 0, 10)).to.deep.equal(['1', '2', '4']);
      expect(await ainftV1Mock.tokensOf(users[1].address, 0, 10)).to.deep.equal(['3']);
    });
  });

  describe("Burn", function() {
    it("Should fail with a nonexistent token ID", async () => {
      const { ainftV1Mock, owner } = await loadFixture(deployAINFTv1MockFixture);

      await expect(ainftV1Mock.connect(owner).burn(1)).to.be.revertedWith(
        "ERC721: invalid token ID"
      );
    });
    
    it("Should fail if sender is unauthorized", async () => {
      const { ainftV1Mock, minter } = await loadFixture(deployAINFTv1MockFixture);

      await expect(ainftV1Mock.connect(minter).mint(minter.address, 1)).not.to.be.reverted;
      await expect(ainftV1Mock.connect(minter).burn(1)).to.be.revertedWith(
        "AccessControl: account 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 is missing role 0x6270edb7c868f86fda4adedba75108201087268ea345934db8bad688e1feb91b"
      );
    });

    it("Should burn", async () => {
      const { ainftV1Mock, owner, minter, users } = await loadFixture(deployAINFTv1MockFixture);
      const userAddr = users[0].address;
      await expect(ainftV1Mock.connect(minter).mint(userAddr, 1)).not.to.be.reverted;
      await expect(ainftV1Mock.connect(owner).burn(1))
        .to.emit(ainftV1Mock, "Transfer")
        .withArgs(userAddr, ethers.constants.AddressZero, 1);
      expect(await ainftV1Mock.totalSupply()).to.equal(0);
      expect(await ainftV1Mock.nextTokenId()).to.equal(2);
      expect(await ainftV1Mock.balanceOf(userAddr)).to.equal(0);
      await expect(ainftV1Mock.ownerOf(1)).to.be.revertedWith("ERC721: invalid token ID");
      await expect(ainftV1Mock.tokensOf(userAddr, 0, 1)).to.be.revertedWith(
        "AINFTv1: invalid offset"
      );
    });
  });

  describe("Set maxTokenId", function() {
    it("Should fail if sender is unauthorized", async () => {
      const { ainftV1Mock, minter } = await loadFixture(deployAINFTv1MockFixture);

      await expect(ainftV1Mock.connect(minter).setMaxTokenId(1000)).to.be.revertedWith(
        "AccessControl: account 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 is missing role 0x6270edb7c868f86fda4adedba75108201087268ea345934db8bad688e1feb91b"
      );
    });

    it("Should fail with an invalid value", async () => {
      const { ainftV1Mock, owner, minter, users } = await loadFixture(deployAINFTv1MockFixture);
      const userAddr = users[0].address;

      // mint 2 tokens to make nextTokenId - 2 > 0
      await ainftV1Mock.connect(minter).mint(userAddr, 2);
      const nextTokenId = (await ainftV1Mock.nextTokenId()).toNumber();
      await expect(
        ainftV1Mock.connect(owner).setMaxTokenId(nextTokenId - 2)
      ).to.be.revertedWith("AINFTv1: invalid value");
    });

    it("Should set maxTokenId", async () => {
      const { ainftV1Mock, owner, minter, users } = await loadFixture(deployAINFTv1MockFixture);

      await ainftV1Mock.connect(owner).setMaxTokenId((await ainftV1Mock.nextTokenId()).toNumber() - 1);
      await expect(ainftV1Mock.connect(minter).mint(users[0].address, 1)).to.be.revertedWith(
        "AINFTv1: exceeds maxTokenId"
      );
    });
  });

  describe("Destroy", function() {
    it("Should fail if sender is unauthorized", async () => {
      const { ainftV1Mock, minter } = await loadFixture(deployAINFTv1MockFixture);

      await expect(ainftV1Mock.connect(minter).destroy(minter.address)).to.be.revertedWith(
        "AccessControl: account 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 is missing role 0x6270edb7c868f86fda4adedba75108201087268ea345934db8bad688e1feb91b"
      );
    });
    
    it("Should fail with an invalid payable address", async () => {
      const { ainftV1Mock, owner } = await loadFixture(deployAINFTv1MockFixture);

      await expect(
        ainftV1Mock.connect(owner).destroy(ethers.constants.AddressZero)
      ).to.be.revertedWith("AINFTv1: invalid address");
    });

    it("Should destroy", async () => {
      const { ainftV1Mock, owner, minter, users } = await loadFixture(deployAINFTv1MockFixture);

      await ainftV1Mock.connect(owner).destroy(owner.address);
      await expect(ainftV1Mock.nextTokenId()).to.be.reverted;
      const tx = await ainftV1Mock.connect(minter).mint(users[0].address, 1);
      const receipt = await tx.wait(1);
      expect(receipt.logs.length).to.equal(0);
      expect(receipt?.events?.length).to.equal(0);
    });
  });
});
