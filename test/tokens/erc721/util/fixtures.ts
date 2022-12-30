import { ethers, upgrades } from "hardhat";

async function deployFactory() {
  const [owner, user] = await ethers.getSigners();

  const ArttacaERC721Upgradeable = await ethers.getContractFactory("ArttacaERC721Upgradeable");
  const ArttacaERC721FactoryUpgradeable = await ethers.getContractFactory("ArttacaERC721FactoryUpgradeable");

  const erc721 = await ArttacaERC721Upgradeable.connect(owner).deploy();

  const factory = await upgrades.deployProxy(ArttacaERC721FactoryUpgradeable, [erc721.address], { initializer: '__ArttacaERC721Factory_initialize' });

  await factory.deployed()


  return { factory, erc721, owner, user };
}

async function deployCollection() {
  const { factory, erc721, owner, user } = await deployFactory();

  const tx = await factory.createCollection('Arttaca Test','ARTTT', 'https://api.arttaca.io/v1/assets/', 5, 'https://api.arttaca.io/v1/collections/blabla')
  await tx.wait();
  const newCollectionAddress = await factory.getCollectionAddress(0);
  const collection = await ethers.getContractAt('ArttacaERC721Upgradeable', newCollectionAddress, owner)

  return { factory, erc721, owner, user , collection };
}

async function deployCollectionMinted() {
  const { factory, erc721, owner, user, collection } = await deployCollection();

  const tokenId = 250;
  const splits = [{account: owner.address, shares: 100}];
  const royalties = {splits, percentage: 10}
  const tx = await collection.mintAndTransferByOwner(owner.address, tokenId, '', royalties);
  await tx.wait();

  return { factory, erc721, owner, user , collection, tokenId };
}


export { deployFactory, deployCollection, deployCollectionMinted };
