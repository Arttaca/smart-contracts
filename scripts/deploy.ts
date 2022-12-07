import { ethers } from "hardhat";


async function main() {

  const ArttacaERC721Upgradeable = await ethers.getContractFactory("ArttacaERC721Upgradeable");
  const ArttacaERC721FactoryUpgradeable = await ethers.getContractFactory("ArttacaERC721FactoryUpgradeable");
  const ArttacaMarketplaceUpgradeable = await ethers.getContractFactory("ArttacaMarketplaceUpgradeable");

  const erc721 = await ArttacaERC721Upgradeable.deploy();
  await erc721.deployed()
  console.log(`Arttaca ERC721 collection for beacon has been deployed at ${erc721.address}`);
  
  const factory = await upgrades.deployProxy(ArttacaERC721FactoryUpgradeable, [erc721.address], { initializer: '__ArttacaERC721Factory_initialize' });

  await factory.deployed()
  console.log(`Arttaca ERC721 collection factory has been deployed at ${factory.address}`);

  const marketplace = await upgrades.deployProxy(ArttacaMarketplaceUpgradeable, [process.env.DEPLOYER_ADDRESS, [process.env.DEPLOYER_ADDRESS, 300]], { initializer: '__ArttacaMarketplace_init' });

  await marketplace.deployed()

  console.log(`Arttaca Marketplace has been deployed at ${marketplace.address}`);

  let tx = await marketplace.addOperator(process.env.ARTTACA_OPERATOR_ADDRESS);
  await tx.wait();

  console.log(`Added operator to marketplace ${process.env.ARTTACA_OPERATOR_ADDRESS}`);

  tx = await factory.addOperator(marketplace.address);
  await tx.wait();
  
  console.log('added marketplace as operator in the factory');

  console.log(`Deployment script executed successfully.`);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
