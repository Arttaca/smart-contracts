import { ethers, upgrades } from "hardhat";

async function deployFactory() {
  const [owner, user] = await ethers.getSigners();

  const ArttacaERC1155Upgradeable = await ethers.getContractFactory("ArttacaERC1155Upgradeable");
  const ArttacaERC1155FactoryUpgradeable = await ethers.getContractFactory("ArttacaERC1155FactoryUpgradeable");

  const erc1155 = await ArttacaERC1155Upgradeable.connect(owner).deploy();

  const factory = await upgrades.deployProxy(ArttacaERC1155FactoryUpgradeable, [erc1155.address], { initializer: '__ArttacaERC1155Factory_initialize' });

  await factory.deployed()


  return { factory, erc1155, owner, user };
}

async function deployCollection() {
  const { factory, erc1155, owner, user } = await deployFactory();

  const tx = await factory.createCollection('Arttaca Test','ARTTT', 10)
  await tx.wait();
  const newCollectionAddress = await factory.getCollectionAddress(0);
  const collection = await ethers.getContractAt('ArttacaERC1155Upgradeable', newCollectionAddress, owner)

  return { factory, erc1155, owner, user , collection };
}

async function deployCollectionMinted() {
  const { factory, erc1155, owner, user, collection } = await deployCollection();

  const tokenId = 250;
  const quantity = 50;
  const splits = [{account: owner.address, shares: 100}];
  const royalties = {splits, percentage: 10}
  const tx = await collection.mintAndTransferByOwner(owner.address, tokenId, quantity, '', royalties);
  await tx.wait();

  return { factory, erc1155, owner, user , collection, tokenId };
}


export { deployFactory, deployCollection, deployCollectionMinted };
