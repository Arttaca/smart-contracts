import { ethers, upgrades } from "hardhat";

async function deployCollectionFactory() {
  const [owner, user, operator, protocol, minter, split1, split2, buyer1] = await ethers.getSigners();

  const ArttacaERC721Upgradeable = await ethers.getContractFactory("ArttacaERC721Upgradeable");
  const ArttacaERC721FactoryUpgradeable = await ethers.getContractFactory("ArttacaERC721FactoryUpgradeable");
  const ArttacaERC1155Upgradeable = await ethers.getContractFactory("ArttacaERC1155Upgradeable");
  const ArttacaERC1155FactoryUpgradeable = await ethers.getContractFactory("ArttacaERC1155FactoryUpgradeable");

  const erc721 = await ArttacaERC721Upgradeable.connect(owner).deploy();
  const erc1155 = await ArttacaERC1155Upgradeable.connect(owner).deploy();

  const erc721factory = await upgrades.deployProxy(ArttacaERC721FactoryUpgradeable, [erc721.address], { initializer: '__ArttacaERC721Factory_initialize' });
  const erc1155factory = await upgrades.deployProxy(ArttacaERC1155FactoryUpgradeable, [erc1155.address], { initializer: '__ArttacaERC1155Factory_initialize' });
  await erc721factory.deployed()
  await erc1155factory.deployed()

  return { erc721factory, erc1155factory, erc721, erc1155, owner, user, operator, protocol, minter, split1, split2, buyer1 };
}

async function deployCollection() {
  const { erc721factory, erc1155factory, erc721, erc1155, owner, user, operator, protocol, minter, split1, split2, buyer1 } = await deployCollectionFactory();

  let tx = await erc721factory.createCollection('Arttaca Test', 'ARTTT', 'https://api.arttaca.io/v1/assets/', 5, 'https://api.arttaca.io/v1/collections/blabla')
  await tx.wait();
  const newErc721CollectionAddress = await erc721factory.getCollectionAddress(0);
  const erc721collection = await ethers.getContractAt('ArttacaERC721Upgradeable', newErc721CollectionAddress, owner)

  tx = await erc1155factory.createCollection('Arttaca Test', 'ARTTT', 5, 'https://api.arttaca.io/v1/collections/blabla')
  await tx.wait();
  const newErc1155CollectionAddress = await erc1155factory.getCollectionAddress(0);
  const erc1155collection = await ethers.getContractAt('ArttacaERC1155Upgradeable', newErc1155CollectionAddress, owner)

  return { erc721factory, erc1155factory, erc721, erc1155, owner, user , erc721collection, erc1155collection, operator, protocol, minter, split1, split2, buyer1 };
}

async function deployMarketplace() {
  const { erc721factory, erc1155factory, erc721, erc1155, owner, user, erc721collection, erc1155collection, operator, protocol, minter, split1, split2, buyer1 } = await deployCollection();

  const ArttacaMarketplaceUpgradeable = await ethers.getContractFactory("ArttacaMarketplaceUpgradeable");
  const marketplace = await upgrades.deployProxy(ArttacaMarketplaceUpgradeable, [owner.address, {account: protocol.address, shares: 300}], { initializer: '__ArttacaMarketplace_init' });

  await marketplace.deployed()

  let tx = await marketplace.addOperator(operator.address);
  await tx.wait();

  tx = await erc721factory.addOperator(marketplace.address);
  await tx.wait();

  tx = await erc1155factory.addOperator(marketplace.address);
  await tx.wait();

  return { erc721factory, erc1155factory, erc721, erc1155, owner, user , erc721collection, erc1155collection, marketplace, operator, protocol, minter, split1, split2, buyer1 };
}


export { deployCollectionFactory, deployCollection, deployMarketplace };
