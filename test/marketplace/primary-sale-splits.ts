import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { deployMarketplace } from "./util/fixtures";
import { getLastBlockTimestamp } from "../common/utils/time";
import { createMintSignature, createSaleSignature } from "../common/utils/signature";

const ONE = BigNumber.from(1)
const feeDenominator = 10000;
const minterFee = 5000;
const split1Fee = 2500;
const split2Fee = 2500;
const protocolFee = 300;
const royaltiesFee = 1000; // 10%
const TOKEN_ID = BigNumber.from(3);
const tokenURI = 'ipfs://123123';
const PRICE = '1000000000000000000'; // 1 ETH
let mintSignature, listingSignature, nodeSignature, mintData, saleData, timestamp, expTimestamp, listingExpTimestamp, nodeExpTimestamp, tokenData, splits, royalties;

describe("ArttacaMarketplaceUpgradeable primary sale splits", function () {
  let factory, erc721, owner, user , collection, marketplace, operator, protocol, minter, split1, split2;
  beforeEach(async () => {
      ({ factory, erc721, owner, user , collection, marketplace, operator, protocol, minter, split1, split2 } = await loadFixture(deployMarketplace));
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
        collection.address,
        minter,
        TOKEN_ID,
          ONE,
        tokenURI,
        royalties,
        expTimestamp
      );
      listingSignature = await createSaleSignature(
        collection.address,
        minter,
          marketplace.address,
        TOKEN_ID,
          ONE,
        PRICE,
        listingExpTimestamp
      );
      nodeSignature = await createSaleSignature(
        collection.address,
        operator,
          marketplace.address,
        TOKEN_ID,
          ONE,
        PRICE,
        nodeExpTimestamp
      );
      const tx = await collection.transferOwnership(minter.address)
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

    const expectedProtocolFee = priceBigNumber.mul(protocolFee).div(feeDenominator);
    const amountToSplit = priceBigNumber.sub(expectedProtocolFee);
    const expectedMinterFee = amountToSplit.mul(minterFee).div(feeDenominator);
    const expectedSplit1Fee = amountToSplit.mul(split1Fee).div(feeDenominator);
    const expectedSplit2Fee = amountToSplit.mul(split2Fee).div(feeDenominator);

    const userBalanceBefore = await user.getBalance();
    const minterBalanceBefore = await minter.getBalance();
    const split1BalanceBefore = await split1.getBalance();
    const split2BalanceBefore = await split2.getBalance();
    const protocolBalanceBefore = await protocol.getBalance();

    tokenData = [ TOKEN_ID, tokenURI, royalties ]
    mintData = [ user.address, ONE, expTimestamp, mintSignature ];
    saleData = [ ONE, PRICE, listingExpTimestamp, nodeExpTimestamp, listingSignature, nodeSignature ];

    const tx = await marketplace.connect(user).buyAndMint(
      collection.address,
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

    expect(await collection.totalSupply()).to.equal(1);
    expect((await collection.tokensOfOwner(user.address)).length).to.equal(1);
    expect((await collection.tokensOfOwner(user.address))[0]).to.equal(TOKEN_ID);
    expect(await collection.tokenOfOwnerByIndex(user.address, 0)).to.equal(TOKEN_ID);
    expect(protocolBalanceDiff).to.equal(expectedProtocolFee);
    expect(minterBalanceDiff).to.equal(expectedMinterFee);
    expect(split1BalanceDiff).to.equal(expectedSplit1Fee);
    expect(split2BalanceDiff).to.equal(expectedSplit2Fee);
    expect(userBalanceDiff).to.be.below(userBalanceBefore.sub(priceBigNumber));
  });

  it("splits with wrong number of shares should fail", async function () {
    const wrongSplits = [
        {account: minter.address, shares: 3000},
        {account: split1.address, shares: 2000},
        {account: split2.address, shares: 2000}
    ];

    royalties = {splits: wrongSplits, percentage: royaltiesFee}

    mintSignature = await createMintSignature(
      collection.address,
      minter,
      TOKEN_ID,
        ONE,
      tokenURI,
      royalties,
      expTimestamp
    );
    tokenData = [ TOKEN_ID, tokenURI, royalties ]
    mintData = [ user.address, ONE, expTimestamp, mintSignature ];
    saleData = [ ONE, PRICE, listingExpTimestamp, nodeExpTimestamp, listingSignature, nodeSignature ];

    await expect(
      marketplace.connect(user).buyAndMint(
        collection.address,
        tokenData,
        mintData,
        saleData,
        {value: PRICE}
      )
    ).to.rejectedWith("VM Exception while processing transaction: reverted with reason string 'AbstractSplits::_setSplits: Total shares should be equal to 10000.'");

    expect(await collection.totalSupply()).to.equal(0);
    expect((await collection.tokensOfOwner(user.address)).length).to.equal(0);
  });
});
