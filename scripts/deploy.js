const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  const name = "GenerativeNFT";
  const symbol = "GNFT";
  const baseURI = "ipfs://QmPlaceholder/";

  const myNFT = await hre.ethers.deployContract("MyNFT", [name, symbol, baseURI]);

  await myNFT.waitForDeployment();

  console.log("MyNFT deployed to:", await myNFT.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
