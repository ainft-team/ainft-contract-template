import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

const name = 'AINFT V2 Mock';
const symbol = 'AINFTV2MOCK';
const baseURI = 'http://localhost:3000/';
const maxTokenId = 10;

describe('AINFTv2Mock', function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployAINFTv2MockFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, minter, ...users] = await ethers.getSigners();
    const AINFTv2Mock = await ethers.getContractFactory('AINFTv2Mock');
    const ainftV2Mock = await AINFTv2Mock.deploy(name, symbol, baseURI, maxTokenId);

    const minterRole = await ainftV2Mock.MINTER_ROLE();
    await ainftV2Mock.connect(owner).grantRole(minterRole, minter.address);

    return { ainftV2Mock, owner, minter, users };
  }

  describe('Deployment', function () {
    it('Should set the right owner', async function () {
      const { ainftV2Mock, owner } = await loadFixture(deployAINFTv2MockFixture);

      expect(await ainftV2Mock.owner()).to.equal(owner.address);
    });

    it('Should set the right name', async function () {
      const { ainftV2Mock } = await loadFixture(deployAINFTv2MockFixture);

      expect(await ainftV2Mock.name()).to.equal(name);
    });

    it('Should set the right symbol', async function () {
      const { ainftV2Mock } = await loadFixture(deployAINFTv2MockFixture);

      expect(await ainftV2Mock.symbol()).to.equal(symbol);
    });

    it('Should set the right baseURI', async function () {
      const { ainftV2Mock } = await loadFixture(deployAINFTv2MockFixture);

      expect(await ainftV2Mock.baseURI()).to.equal(baseURI);
    });

    it('Should set the right maxTokenId', async function () {
      const { ainftV2Mock } = await loadFixture(deployAINFTv2MockFixture);

      expect(await ainftV2Mock.maxTokenId()).to.equal(maxTokenId);
    });

    it('Should support AINFTv2 interface', async function () {
      const { ainftV2Mock } = await loadFixture(deployAINFTv2MockFixture);

      expect(await ainftV2Mock.supportsInterface(0xffffffff)).to.equal(false);

      expect(await ainftV2Mock.supportsInterface(0x01ffc9a7)).to.equal(true); // ERC165
      expect(await ainftV2Mock.supportsInterface(0x80ac58cd)).to.equal(true); // ERC721
      expect(await ainftV2Mock.supportsInterface(0x780e9d63)).to.equal(true); // ERC721Enumerable
      expect(await ainftV2Mock.supportsInterface(0x5b5e139f)).to.equal(true); // ERC721Metadata
      expect(await ainftV2Mock.supportsInterface(0x7965db0b)).to.equal(true); // AccessControl
      expect(await ainftV2Mock.supportsInterface(0x9de93351)).to.equal(true); // IAINFTBaseV1
    });
  });

  describe('Roles', function () {
    it('Should fail to grantRole if sender is unauthorized', async () => {
      const { ainftV2Mock, users } = await loadFixture(deployAINFTv2MockFixture);
      await expect(
        ainftV2Mock.connect(users[0]).grantRole(await ainftV2Mock.MINTER_ROLE(), users[0].address),
      ).to.be.revertedWith(
        'AccessControl: account 0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc is missing role 0x6270edb7c868f86fda4adedba75108201087268ea345934db8bad688e1feb91b',
      );
    });

    it('Should grantRole', async () => {
      const { ainftV2Mock, owner, users } = await loadFixture(deployAINFTv2MockFixture);
      const minterRole = await ainftV2Mock.MINTER_ROLE();
      expect(await ainftV2Mock.hasRole(minterRole, users[0].address)).to.equal(false);
      await ainftV2Mock.connect(owner).grantRole(minterRole, users[0].address);
      expect(await ainftV2Mock.hasRole(minterRole, users[0].address)).to.equal(true);
    });
  });

  describe('Mint', function () {
    describe('Validations', function () {
      it('Should revert with the right error if sender is not authorized', async function () {
        const { ainftV2Mock, users } = await loadFixture(deployAINFTv2MockFixture);

        await expect(ainftV2Mock.connect(users[0]).mint(users[0].address, 1)).to.be.revertedWith(
          'AccessControl: account 0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc is missing role 0xf0887ba65ee2024ea881d91b74c2450ef19e1557f03bed3ea9f16b037cbe2dc9',
        );
      });

      it("Should revert with the right error if invalid 'to' address given", async function () {
        const { ainftV2Mock, minter } = await loadFixture(deployAINFTv2MockFixture);

        await expect(ainftV2Mock.connect(minter).mint(ethers.constants.AddressZero, 1)).to.be.revertedWith(
          'AINFTv2: invalid to_ address',
        );
      });

      it('Should revert with invalid quantity is given', async function () {
        const { ainftV2Mock, minter } = await loadFixture(deployAINFTv2MockFixture);

        await expect(ainftV2Mock.connect(minter).mint(minter.address, 0)).to.be.revertedWith(
          'AINFTv2: invalid quantity_',
        );
        await expect(ainftV2Mock.connect(minter).mint(minter.address, 101)).to.be.revertedWith(
          'AINFTv2: invalid quantity_',
        );
      });

      it('Should revert with the right error if exceeds maxTokenId', async function () {
        const { ainftV2Mock, minter, users } = await loadFixture(deployAINFTv2MockFixture);

        await expect(ainftV2Mock.connect(minter).mint(users[0].address, maxTokenId)).not.to.be.reverted;
        await expect(ainftV2Mock.connect(minter).mint(users[0].address, 1)).to.be.revertedWith(
          'AINFTv2: exceeds maxTokenId',
        );
      });

      it('Should mint', async function () {
        const { ainftV2Mock, minter, users } = await loadFixture(deployAINFTv2MockFixture);

        const userAddr = users[0].address;
        await expect(ainftV2Mock.connect(minter).mint(userAddr, 1)).not.to.be.reverted;
        expect(await ainftV2Mock.totalSupply()).to.equal(1);
        expect(await ainftV2Mock.nextTokenId()).to.equal(2);
        expect(await ainftV2Mock.balanceOf(userAddr)).to.equal(1);
        expect(await ainftV2Mock.ownerOf(1)).to.equal(userAddr);
        expect(await ainftV2Mock.tokensOf(userAddr, 0, 1)).to.deep.equal(['1']);
      });
    });

    describe('Events', function () {
      it('Should emit an event on mint', async function () {
        const { ainftV2Mock, minter, users } = await loadFixture(deployAINFTv2MockFixture);

        const expectedTokenId = (await ainftV2Mock.nextTokenId()).toNumber();
        await expect(ainftV2Mock.connect(minter).mint(users[0].address, 1))
          .to.emit(ainftV2Mock, 'Mint')
          .withArgs(users[0].address, expectedTokenId, 1);
      });

      it('Should emit right events on batch mint', async function () {
        const { ainftV2Mock, minter, users } = await loadFixture(deployAINFTv2MockFixture);

        const expectedTokenId = (await ainftV2Mock.nextTokenId()).toNumber();
        await expect(ainftV2Mock.connect(minter).mint(users[0].address, 3))
          .to.emit(ainftV2Mock, 'Mint')
          .withArgs(users[0].address, expectedTokenId, 3);
      });
    });

    describe('Transfers', function () {
      it("Should transfer token to the 'to' address", async function () {
        const { ainftV2Mock, minter, users } = await loadFixture(deployAINFTv2MockFixture);

        const userAddr = users[0].address;
        const expectedTokenId = (await ainftV2Mock.nextTokenId()).toNumber();
        await expect(ainftV2Mock.connect(minter).mint(userAddr, 1))
          .to.emit(ainftV2Mock, 'Transfer')
          .withArgs(ethers.constants.AddressZero, users[0].address, expectedTokenId);
        expect(await ainftV2Mock.ownerOf(expectedTokenId)).to.equal(userAddr);
        expect(await ainftV2Mock.balanceOf(userAddr)).to.equal(1);
      });

      it("Should transfer token from the 'from' address to the 'to' address", async function () {
        const { ainftV2Mock, minter, users } = await loadFixture(deployAINFTv2MockFixture);

        await expect(ainftV2Mock.connect(minter).mint(users[0].address, 1)).not.to.be.reverted;
        expect(await ainftV2Mock.ownerOf(1)).to.equal(users[0].address);
        expect(await ainftV2Mock.balanceOf(users[0].address)).to.equal(1);
        expect(await ainftV2Mock.balanceOf(users[1].address)).to.equal(0);

        await ainftV2Mock
          .connect(users[0])
          ['safeTransferFrom(address,address,uint256)'](users[0].address, users[1].address, 1);
        expect(await ainftV2Mock.ownerOf(1)).to.equal(users[1].address);
        expect(await ainftV2Mock.balanceOf(users[0].address)).to.equal(0);
        expect(await ainftV2Mock.balanceOf(users[1].address)).to.equal(1);
      });
    });
  });

  describe('Tokens Of', function () {
    it('Should fail if invalid limit is given', async () => {
      const { ainftV2Mock, minter, users } = await loadFixture(deployAINFTv2MockFixture);

      await expect(ainftV2Mock.connect(minter).mint(users[0].address, 1)).not.to.be.reverted;
      await expect(ainftV2Mock.tokensOf(users[0].address, 0, 0))
        .to.be.revertedWithCustomError(ainftV2Mock, 'InvalidLimit')
        .withArgs(0, 100);
      await expect(ainftV2Mock.tokensOf(users[0].address, 0, 101))
        .to.be.revertedWithCustomError(ainftV2Mock, 'InvalidLimit')
        .withArgs(101, 100);
    });

    it('Should fail if invalid offset is given', async () => {
      const { ainftV2Mock, minter, users } = await loadFixture(deployAINFTv2MockFixture);

      await expect(ainftV2Mock.connect(minter).mint(users[0].address, 1)).not.to.be.reverted;
      await expect(ainftV2Mock.tokensOf(users[0].address, 2, 1))
        .to.be.revertedWithCustomError(ainftV2Mock, 'InvalidOffset')
        .withArgs(2, 1);
    });

    it('Should return the right tokens owned by accounts', async () => {
      const { ainftV2Mock, minter, users } = await loadFixture(deployAINFTv2MockFixture);

      await expect(ainftV2Mock.connect(minter).mint(users[0].address, 2)).not.to.be.reverted; // 1, 2
      await expect(ainftV2Mock.connect(minter).mint(users[1].address, 1)).not.to.be.reverted; // 3
      await expect(ainftV2Mock.connect(minter).mint(users[0].address, 1)).not.to.be.reverted; // 4
      expect(await ainftV2Mock.tokensOf(users[0].address, 0, 10)).to.deep.equal(['1', '2', '4']);
      expect(await ainftV2Mock.tokensOf(users[1].address, 0, 10)).to.deep.equal(['3']);
    });
  });

  describe('Burn', function () {
    it('Should fail with a nonexistent token ID', async () => {
      const { ainftV2Mock, owner } = await loadFixture(deployAINFTv2MockFixture);

      await expect(ainftV2Mock.connect(owner).burn(1)).to.be.revertedWith('ERC721: invalid token ID');
    });

    it('Should fail if sender is unauthorized', async () => {
      const { ainftV2Mock, minter } = await loadFixture(deployAINFTv2MockFixture);

      await expect(ainftV2Mock.connect(minter).mint(minter.address, 1)).not.to.be.reverted;
      await expect(ainftV2Mock.connect(minter).burn(1)).to.be.revertedWith(
        'AccessControl: account 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 is missing role 0x6270edb7c868f86fda4adedba75108201087268ea345934db8bad688e1feb91b',
      );
    });

    it('Should burn', async () => {
      const { ainftV2Mock, owner, minter, users } = await loadFixture(deployAINFTv2MockFixture);
      const userAddr = users[0].address;
      await expect(ainftV2Mock.connect(minter).mint(userAddr, 1)).not.to.be.reverted;
      await expect(ainftV2Mock.connect(owner).burn(1))
        .to.emit(ainftV2Mock, 'Transfer')
        .withArgs(userAddr, ethers.constants.AddressZero, 1);
      expect(await ainftV2Mock.totalSupply()).to.equal(0);
      expect(await ainftV2Mock.nextTokenId()).to.equal(2);
      expect(await ainftV2Mock.balanceOf(userAddr)).to.equal(0);
      await expect(ainftV2Mock.ownerOf(1)).to.be.revertedWith('ERC721: invalid token ID');
      await expect(ainftV2Mock.tokensOf(userAddr, 0, 1))
        .to.be.revertedWithCustomError(ainftV2Mock, 'InvalidOffset')
        .withArgs(0, 0);
    });
  });

  describe('Set maxTokenId', function () {
    it('Should fail if sender is unauthorized', async () => {
      const { ainftV2Mock, minter } = await loadFixture(deployAINFTv2MockFixture);

      await expect(ainftV2Mock.connect(minter).setMaxTokenId(1000)).to.be.revertedWith(
        'AccessControl: account 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 is missing role 0x6270edb7c868f86fda4adedba75108201087268ea345934db8bad688e1feb91b',
      );
    });

    it('Should fail with an invalid value', async () => {
      const { ainftV2Mock, owner, minter, users } = await loadFixture(deployAINFTv2MockFixture);
      const userAddr = users[0].address;

      // mint 2 tokens to make nextTokenId - 2 > 0
      await ainftV2Mock.connect(minter).mint(userAddr, 2);
      const nextTokenId = (await ainftV2Mock.nextTokenId()).toNumber();
      await expect(ainftV2Mock.connect(owner).setMaxTokenId(nextTokenId - 2)).to.be.revertedWith(
        'AINFTv2: invalid maxTokenId_',
      );
    });

    it('Should set maxTokenId', async () => {
      const { ainftV2Mock, owner, minter, users } = await loadFixture(deployAINFTv2MockFixture);

      await ainftV2Mock.connect(owner).setMaxTokenId((await ainftV2Mock.nextTokenId()).toNumber() - 1);
      await expect(ainftV2Mock.connect(minter).mint(users[0].address, 1)).to.be.revertedWith(
        'AINFTv2: exceeds maxTokenId',
      );
    });
  });

  describe('Destroy', function () {
    it('Should fail if sender is unauthorized', async () => {
      const { ainftV2Mock, minter } = await loadFixture(deployAINFTv2MockFixture);

      await expect(ainftV2Mock.connect(minter).destroy(minter.address)).to.be.revertedWith(
        'AccessControl: account 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 is missing role 0x6270edb7c868f86fda4adedba75108201087268ea345934db8bad688e1feb91b',
      );
    });

    it('Should fail with an invalid payable address', async () => {
      const { ainftV2Mock, owner } = await loadFixture(deployAINFTv2MockFixture);

      await expect(ainftV2Mock.connect(owner).destroy(ethers.constants.AddressZero)).to.be.revertedWith(
        'AINFTv2: invalid to_ address',
      );
    });

    it('Should destroy', async () => {
      const { ainftV2Mock, owner, minter, users } = await loadFixture(deployAINFTv2MockFixture);

      await ainftV2Mock.connect(owner).destroy(owner.address);
      await expect(ainftV2Mock.nextTokenId()).to.be.reverted;
      const tx = await ainftV2Mock.connect(minter).mint(users[0].address, 1);
      const receipt = await tx.wait(1);
      expect(receipt.logs.length).to.equal(0);
      expect(receipt?.events?.length).to.equal(0);
    });
  });
});
