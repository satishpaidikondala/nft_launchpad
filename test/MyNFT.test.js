const { expect } = require("chai");
const { ethers } = require("hardhat");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

describe("MyNFT", function () {
  let MyNFT;
  let myNFT;
  let owner;
  let addr1;
  let addr2;
  let addrs;
  let merkleTree;
  let merkleRoot;
  let proofs = {};

  beforeEach(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    // Setup Merkle Tree
    const allowlist = [owner.address, addr1.address];
    const leaves = allowlist.map((addr) => keccak256(addr));
    merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    merkleRoot = merkleTree.getHexRoot();
    
    // Generate proofs
    allowlist.forEach(addr => {
        proofs[addr] = merkleTree.getHexProof(keccak256(addr));
    });

    // Deploy
    MyNFT = await ethers.getContractFactory("MyNFT");
    myNFT = await MyNFT.deploy("GenerativeNFT", "GNFT", "ipfs://unrevealed/");
    await myNFT.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await myNFT.owner()).to.equal(owner.address);
    });

    it("Should return correct name and symbol", async function () {
      expect(await myNFT.name()).to.equal("GenerativeNFT");
      expect(await myNFT.symbol()).to.equal("GNFT");
    });

    it("Should start paused", async function () {
      expect(await myNFT.saleState()).to.equal(0); // 0 = Paused
    });
  });

  describe("Allowlist Minting", function () {
    beforeEach(async function () {
        await myNFT.setMerkleRoot(merkleRoot);
        await myNFT.setSaleState(1); // Allowlist
    });

    it("Should allow whitelisted user to mint", async function () {
        const quantity = 1;
        const price = await myNFT.mintPrice();
        const proof = proofs[addr1.address];

        await expect(myNFT.connect(addr1).allowlistMint(proof, quantity, { value: price }))
            .to.emit(myNFT, "Transfer")
            .withArgs(ethers.ZeroAddress, addr1.address, 1);
        
        expect(await myNFT.balanceOf(addr1.address)).to.equal(1);
    });

    it("Should fail if user not in allowlist", async function () {
        const quantity = 1;
        const price = await myNFT.mintPrice();
        // Generate a random proof or use an empty one, but effectively invalid for addr2
        const proof = []; 
        
        await expect(myNFT.connect(addr2).allowlistMint(proof, quantity, { value: price }))
            .to.be.revertedWith("Invalid proof");
    });

    it("Should fail if sale is not Allowlist", async function () {
        await myNFT.setSaleState(0); // Pause
        const quantity = 1;
        const price = await myNFT.mintPrice();
        const proof = proofs[addr1.address];

        await expect(myNFT.connect(addr1).allowlistMint(proof, quantity, { value: price }))
            .to.be.revertedWith("Allowlist sale not active");
    });
  });

  describe("Public Minting", function () {
    beforeEach(async function () {
        await myNFT.setSaleState(2); // Public
    });

    it("Should allow public minting", async function () {
        const quantity = 1;
        const price = await myNFT.mintPrice();

        await expect(myNFT.connect(addr2).publicMint(quantity, { value: price }))
             .to.emit(myNFT, "Transfer");
        
        expect(await myNFT.balanceOf(addr2.address)).to.equal(1);
    });

    it("Should fail if incorrect ETH sent", async function () {
         const quantity = 1;
         const price = await myNFT.mintPrice();
         
         await expect(myNFT.connect(addr2).publicMint(quantity, { value: 0 }))
              .to.be.revertedWith("Incorrect ETH value");
    });
  });

  describe("Reveal", function () {
    it("Should return placeholder URI initially", async function () {
        await myNFT.setSaleState(2);
        await myNFT.publicMint(1, { value: await myNFT.mintPrice() });
        expect(await myNFT.tokenURI(1)).to.equal("ipfs://unrevealed/");
    });

    it("Should return revealed URI after reveal", async function () {
        await myNFT.setSaleState(2);
        await myNFT.publicMint(1, { value: await myNFT.mintPrice() });
        
        await myNFT.setRevealedURI("ipfs://revealed/");
        await myNFT.reveal();

        expect(await myNFT.tokenURI(1)).to.equal("ipfs://revealed/1.json");
    });
  });
});
