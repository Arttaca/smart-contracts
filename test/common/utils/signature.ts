import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";

const Split = [
    { name: 'account', type: 'address' },
    { name: 'shares', type: 'uint96' },
]

const Minting = [
    { name: 'collectionAddress', type: 'address' },
    { name: 'id', type: 'uint' },
    { name: 'quantity', type: 'uint' },
    { name: 'tokenURI', type: 'string' },
    { name: 'splits', type: 'Split[]'},
    { name: 'percentage', type: 'uint96' },
    { name: 'expTimestamp', type: 'uint' }
]

const Listing = [
    { name: 'collectionAddress', type: 'address' },
    { name: 'id', type: 'uint' },
    { name: 'quantity', type: 'uint' },
    { name: 'price', type: 'uint' },
    { name: 'expTimestamp', type: 'uint'},
]

async function createMintSignature(
    contractAddress: string,
    signer: SignerWithAddress,
    tokenId: BigNumber,
    quantity: BigNumber,
    tokenURI: string,
    royalties: any,
    expTimestamp: number
): Promise<string> {
    const message = {
        collectionAddress: contractAddress,
        id: tokenId,
        quantity,
        tokenURI,
        splits: royalties.splits,
        percentage: royalties.percentage,
        expTimestamp
    };

    const data = {
        types: {
            Split,
            Minting
        },
        domain: { name: 'Arttaca Collection', version: '1', chainId: 31337, verifyingContract: contractAddress },
        primaryType: 'Minting',
        message,
    };
    return signer._signTypedData(data.domain, data.types, data.message)
}

async function createSaleSignature(
    collectionAddress: string,
    signer: SignerWithAddress,
    marketplaceAddress: string,
    tokenId: BigNumber,
    quantity: BigNumber,
    price: string,
    expirationTimestamp: number
): Promise<string> {
    const message = {
        collectionAddress,
        id: tokenId,
        quantity,
        price,
        expTimestamp: expirationTimestamp
    };

    const data = {
        types: { Listing },
        domain: { name: 'Arttaca Marketplace', version: '1', chainId: 31337, verifyingContract: marketplaceAddress },
        primaryType: 'Listing',
        message,
    };

    return signer._signTypedData(data.domain, data.types, data.message)
}

export { createMintSignature, createSaleSignature }
