import { ethers } from "hardhat";

const factoryAddress = "0x6C20eE5CD4EeF0D7CcfF731AC5C8FC8556BC7C22"
async function main() {

  const ArttacaERC721FactoryUpgradeable = await ethers.getContractFactory("ArttacaERC721FactoryUpgradeable");
  const ArttacaMarketplaceUpgradeable = await ethers.getContractFactory("ArttacaMarketplaceUpgradeable");
  
  const factory = await ethers.getContractAt("ArttacaERC721FactoryUpgradeable", factoryAddress);
  console.log('Factory has been loaded at ', factoryAddress);

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
