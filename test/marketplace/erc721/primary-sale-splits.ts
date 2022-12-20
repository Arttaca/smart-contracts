import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { deployMarketplace } from "../util/fixtures";
import { getLastBlockTimestamp } from "../../common/utils/time";
import { createMintSignature, createSaleSignature } from "../../common/utils/signature";

const ONE = BigNumber.from(1)
const feeDenominator = 10000;
const minterFee = 50;
const split1Fee = 25;
const split2Fee = 25;
const protocolFee = 3;
const royaltiesFee = 10; // 10%
const TOKEN_ID = BigNumber.from(3);
const tokenURI = 'ipfs://123123';
const PRICE = '1000000000000000000'; // 1 ETH
let mintSignature, listingSignature, nodeSignature, mintData, saleData, timestamp, expTimestamp, listingExpTimestamp, nodeExpTimestamp, tokenData, splits, royalties;

describe("ArttacaMarketplaceUpgradeable ERC721 primary sale splits", function () {
  let erc721factory, erc721, owner, user , erc721collection, marketplace, operator, protocol, minter, split1, split2;
  beforeEach(async () => {
      ({ erc721factory, erc721, owner, user , erc721collection, marketplace, operator, protocol, minter, split1, split2 } = await loadFixture(deployMarketplace));
      splits = [
          {account: minter.address, shares: minterFee},
          {account: split1.address, shares: split1Fee},
          {account: split2.address, shares: split2Fee},
      ];
      royalties = {splits, percentage: royaltiesFee}
      timestamp = await getLastBlockTimestamp();
      expTimestamp = timestamp + 100;
      listingExpTimestamp = expTimestamp + 100;
      nodeExpTimestamp = listingExpTimestamp + 100;
      mintSignature = await createMintSignature(
          erc721collection.address,
        minter,
        TOKEN_ID,
          ONE,
        tokenURI,
        royalties,
        expTimestamp
      );
      listingSignature = await createSaleSignature(
          erc721collection.address,
        minter,
          marketplace.address,
        TOKEN_ID,
          ONE,
        PRICE,
        listingExpTimestamp
      );
      nodeSignature = await createSaleSignature(
          erc721collection.address,
        operator,
          marketplace.address,
        TOKEN_ID,
          ONE,
        PRICE,
        nodeExpTimestamp
      );
      const tx = await erc721collection.transferOwnership(minter.address)
      await tx.wait()
  });

  // it("Minter receives full payment if no splits", async function () {

  //   const priceBigNumber = BigNumber.from(PRICE);

  //   const expectedProtocolFee = priceBigNumber.mul(protocolFee).div(feeDenominator);
  //   const expectedMinterFee = priceBigNumber.sub(expectedProtocolFee);

  //   const userBalanceBefore = await user.getBalance();
  //   const minterBalanceBefore = await minter.getBalance();
  //   const protocolBalanceBefore = await protocol.getBalance();

  //   const emptyRoyalties = [[], 0];
  //   mintSignature = await createMintSignature(
  //     collection.address,
  //     minter,
  //     TOKEN_ID,
  //     tokenURI,
  //     emptyRoyalties,
  //     expTimestamp
  //   );

  //   tokenData = [ TOKEN_ID, tokenURI, emptyRoyalties ]
  //   mintData = [ user.address, expTimestamp, mintSignature ];
  //   saleData = [ PRICE, listingExpTimestamp, nodeExpTimestamp, listingSignature, nodeSignature ];

  //   const tx = await marketplace.connect(user).buyAndMint(
  //     collection.address,
  //     tokenData,
  //     mintData,
  //     saleData,
  //     {value: PRICE}
  //   );
  //   await tx.wait();

  //   const minterBalanceAfter = await minter.getBalance();

  //   const userBalanceDiff = (await user.getBalance()).sub(userBalanceBefore);
  //   const protocolBalanceDiff = (await protocol.getBalance()).sub(protocolBalanceBefore);
  //   const minterBalanceDiff = (await minter.getBalance()).sub(minterBalanceBefore);

  //   expect(await collection.totalSupply()).to.equal(1);
  //   expect((await collection.tokensOfOwner(user.address)).length).to.equal(1);
  //   expect((await collection.tokensOfOwner(user.address))[0]).to.equal(TOKEN_ID);
  //   expect(await collection.tokenOfOwnerByIndex(user.address, 0)).to.equal(TOKEN_ID);
  //   expect(protocolBalanceDiff).to.equal(expectedProtocolFee);
  //   expect(minterBalanceDiff).to.equal(expectedMinterFee);
  //   expect(userBalanceDiff).to.be.below(userBalanceBefore.sub(priceBigNumber));
  // });

  it("User can buy and mint with splits", async function () {

    const priceBigNumber = BigNumber.from(PRICE);

    const expectedProtocolFee = priceBigNumber.mul(protocolFee * 100).div(feeDenominator);
    const amountToSplit = priceBigNumber.sub(expectedProtocolFee);
    const expectedMinterFee = amountToSplit.mul(minterFee * 100).div(feeDenominator);
    const expectedSplit1Fee = amountToSplit.mul(split1Fee * 100).div(feeDenominator);
    const expectedSplit2Fee = amountToSplit.mul(split2Fee * 100).div(feeDenominator);

    const userBalanceBefore = await user.getBalance();
    const minterBalanceBefore = await minter.getBalance();
    const split1BalanceBefore = await split1.getBalance();
    const split2BalanceBefore = await split2.getBalance();
    const protocolBalanceBefore = await protocol.getBalance();

    tokenData = [ TOKEN_ID, tokenURI, royalties ]
    mintData = [ user.address, ONE, expTimestamp, mintSignature ];
    saleData = [ minter.address, ONE, PRICE, listingExpTimestamp, nodeExpTimestamp, listingSignature, nodeSignature ];

    const tx = await marketplace.connect(user).buyAndMint(
        erc721collection.address,
      tokenData,
      mintData,
      saleData,
      {value: PRICE}
    );
    await tx.wait();

    const userBalanceDiff = (await user.getBalance()).sub(userBalanceBefore);
    const protocolBalanceDiff = (await protocol.getBalance()).sub(protocolBalanceBefore);
    const minterBalanceDiff = (await minter.getBalance()).sub(minterBalanceBefore);
    const split1BalanceDiff = (await split1.getBalance()).sub(split1BalanceBefore);
    const split2BalanceDiff = (await split2.getBalance()).sub(split2BalanceBefore);

    expect(await erc721collection.totalSupply()).to.equal(1);
    expect((await erc721collection.tokensOfOwner(user.address)).length).to.equal(1);
    expect((await erc721collection.tokensOfOwner(user.address))[0]).to.equal(TOKEN_ID);
    expect(await erc721collection.tokenOfOwnerByIndex(user.address, 0)).to.equal(TOKEN_ID);
    expect(protocolBalanceDiff).to.equal(expectedProtocolFee);
    expect(minterBalanceDiff).to.equal(expectedMinterFee);
    expect(split1BalanceDiff).to.equal(expectedSplit1Fee);
    expect(split2BalanceDiff).to.equal(expectedSplit2Fee);
    expect(userBalanceDiff).to.be.below(userBalanceBefore.sub(priceBigNumber));
  });

  it("splits with wrong number of shares should fail", async function () {
    const wrongSplits = [
        {account: minter.address, shares: 30},
        {account: split1.address, shares: 20},
        {account: split2.address, shares: 20}
    ];

    royalties = {splits: wrongSplits, percentage: royaltiesFee}

    mintSignature = await createMintSignature(
        erc721collection.address,
      minter,
      TOKEN_ID,
        ONE,
      tokenURI,
      royalties,
      expTimestamp
    );
    tokenData = [ TOKEN_ID, tokenURI, royalties ]
    mintData = [ user.address, ONE, expTimestamp, mintSignature ];
    saleData = [ minter.address, ONE, PRICE, listingExpTimestamp, nodeExpTimestamp, listingSignature, nodeSignature ];

    await expect(
      marketplace.connect(user).buyAndMint(
          erc721collection.address,
        tokenData,
        mintData,
        saleData,
        {value: PRICE}
      )
    ).to.rejectedWith("VM Exception while processing transaction: reverted with reason string 'AbstractSplits::_setSplits: Total shares should be equal to 100.'");

    expect(await erc721collection.totalSupply()).to.equal(0);
    expect((await erc721collection.tokensOfOwner(user.address)).length).to.equal(0);
  });
});
