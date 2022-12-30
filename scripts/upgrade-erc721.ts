import {ethers} from "hardhat";

const arttacaERC721FactoryAddress = '0xc658e4faedD8703e88FCec6cbccbbD1Df6d9810e';

async function main() {

    const ArttacaERC721FactoryUpgradeable = await ethers.getContractFactory("ArttacaERC721FactoryUpgradeable");
    const ArttacaERC721Upgradeable = await ethers.getContractFactory("ArttacaERC721Upgradeable");
    const ArttacaERC721Beacon = await ethers.getContractFactory("ArttacaERC721Beacon");

    const phygitalFactory = ArttacaERC721FactoryUpgradeable.attach(arttacaERC721FactoryAddress)

    const beacon = ArttacaERC721Beacon.attach(await phygitalFactory.getBeacon());

    const deployedUpgrade = await ArttacaERC721Upgradeable.deploy();
    await deployedUpgrade.deployed()

    await beacon.upgradeTo(deployedUpgrade.address);

    console.log('Arttaca ERC721 from factory', phygitalFactory.address,' upgraded to', deployedUpgrade.address)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
