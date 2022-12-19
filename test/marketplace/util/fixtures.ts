import { ethers, upgrades } from "hardhat";

async function deployCollectionFactory() {
  const [owner, user, operator, protocol, minter, split1, split2, buyer1] = await ethers.getSigners();

  const ArttacaERC721Upgradeable = await ethers.getContractFactory("ArttacaERC721Upgradeable");
  const ArttacaERC721FactoryUpgradeable = await ethers.getContractFactory("ArttacaERC721FactoryUpgradeable");

  const erc721 = await ArttacaERC721Upgradeable.connect(owner).deploy();

  const factory = await upgrades.deployProxy(ArttacaERC721FactoryUpgradeable, [erc721.address], { initializer: '__ArttacaERC721Factory_initialize' });

  await factory.deployed()

  return { factory, erc721, owner, user, operator, protocol, minter, split1, split2, buyer1 };
}

async function deployCollection() {
  const { factory, erc721, owner, user, operator, protocol, minter, split1, split2, buyer1 } = await deployCollectionFactory();

  const tx = await factory.createCollection('Arttaca Test','ARTTT', 'https://api.arttaca.io/v1/assets/',5)
  await tx.wait();
  const newCollectionAddress = await factory.getCollectionAddress(0);
  const collection = await ethers.getContractAt('ArttacaERC721Upgradeable', newCollectionAddress, owner)

  return { factory, erc721, owner, user , collection, operator, protocol, minter, split1, split2, buyer1 };
}

async function deployMarketplace() {
  const { factory, erc721, owner, user, collection, operator, protocol, minter, split1, split2, buyer1 } = await deployCollection();

  const ArttacaMarketplaceUpgradeable = await ethers.getContractFactory("ArttacaMarketplaceUpgradeable");
  const marketplace = await upgrades.deployProxy(ArttacaMarketplaceUpgradeable, [owner.address, [protocol.address, 300]], { initializer: '__ArttacaMarketplace_init' });

  await marketplace.deployed()

  let tx = await marketplace.addOperator(operator.address);
  await tx.wait();

  tx = await factory.addOperator(marketplace.address);
  await tx.wait();

  return { factory, erc721, owner, user , collection, marketplace, operator, protocol, minter, split1, split2, buyer1 };
}


export { deployCollectionFactory, deployCollection, deployMarketplace };
