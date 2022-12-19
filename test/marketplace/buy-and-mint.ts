import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { deployMarketplace } from "./util/fixtures";
import { getLastBlockTimestamp } from "../common/utils/time";
import { createMintSignature, createSaleSignature } from "../common/utils/signature";
import {BigNumber} from "@ethersproject/bignumber";

const feeDenominator = 10000;
const protocolFee = 300;
const royaltiesFee = 1000;
const splitShares = 10000;
const TOKEN_ID = BigNumber.from(3);
const tokenURI = 'ipfs://123123';
const PRICE = '1000000000000000000'; // 1 ETH
let mintSignature, listingSignature, nodeSignature, mintData, saleData, timestamp, expTimestamp, listingExpTimestamp, nodeExpTimestamp, tokenData, splits, royalties;

describe("ArttacaMarketplaceUpgradeable buy and mint", function () {
  let factory, erc721, owner, user , collection, marketplace, operator, protocol;
  beforeEach(async () => {
      ({ factory, erc721, owner, user , collection, marketplace, operator, protocol } = await loadFixture(deployMarketplace));
      splits = [{account: owner.address, shares: splitShares}];
      royalties = {splits, percentage: royaltiesFee}
      tokenData = [
        TOKEN_ID,
        tokenURI,
        royalties
      ]
      timestamp = await getLastBlockTimestamp();
      expTimestamp = timestamp + 100;
      listingExpTimestamp = expTimestamp + 100;
      nodeExpTimestamp = listingExpTimestamp + 100;
      mintSignature = await createMintSignature(
        collection.address,
        owner,
        TOKEN_ID,
        tokenURI,
        royalties,
        expTimestamp
      );
      listingSignature = await createSaleSignature(
        collection.address,
        owner,
        marketplace.address,
        TOKEN_ID,
        PRICE,
        listingExpTimestamp
      );
      nodeSignature = await createSaleSignature(
        collection.address,
        operator,
        marketplace.address,
        TOKEN_ID,
        PRICE,
        nodeExpTimestamp
      );

      mintData = [ user.address, expTimestamp, mintSignature ];
      saleData = [ PRICE, listingExpTimestamp, nodeExpTimestamp, listingSignature, nodeSignature ];
  });

  it("User can buy and mint", async function () {

    const userBalanceBefore = await user.getBalance();
    const protocolBalanceBefore = await protocol.getBalance();

    const tx = await marketplace.connect(user).buyAndMint(
      collection.address,
      tokenData,
      mintData,
      saleData,
      {value: PRICE}
    );
    await tx.wait();

    const userBalanceAfter = await user.getBalance();

    const protocolBalanceAfter = await protocol.getBalance();

    expect(await collection.totalSupply()).to.equal(1);
    expect((await collection.tokensOfOwner(user.address)).length).to.equal(1);
    expect((await collection.tokensOfOwner(user.address))[0]).to.equal(TOKEN_ID);
    expect(await collection.tokenOfOwnerByIndex(user.address, 0)).to.equal(TOKEN_ID);
  });

  it("User cannot buy and mint if sent less ETH", async function () {

    const WRONG_PRICE = '500000000000000000';

    await expect(
      marketplace.connect(user).buyAndMint(
        collection.address,
        tokenData,
        mintData,
        saleData,
        {value: WRONG_PRICE}
      )
    ).to.rejectedWith("VM Exception while processing transaction: reverted with reason string 'ArttacaMarketplaceUpgradeable::buyAndMint: Value sent is insufficient.'");

    expect(await collection.totalSupply()).to.equal(0);
    expect((await collection.tokensOfOwner(user.address)).length).to.equal(0);
  });

  it("User cannot buy and mint if expired timestamp value send or expired sale signature", async function () {

    const expiredTimestamp = expTimestamp - 200;

    listingSignature = await createSaleSignature(
      collection.address,
      owner,
        marketplace.address,
      TOKEN_ID,
      PRICE,
      expiredTimestamp
    );

    const wrongExpiredTimeStampSaleData = [ PRICE, expiredTimestamp, nodeExpTimestamp, listingSignature, nodeSignature ];
    const wrongListingSignatureSaleData = [ PRICE, listingExpTimestamp, nodeExpTimestamp, listingSignature, nodeSignature ];

    await expect(
      marketplace.connect(user).buyAndMint(
        collection.address,
        tokenData,
        mintData,
        wrongExpiredTimeStampSaleData,
        {value: PRICE}
      )
    ).to.rejectedWith("VM Exception while processing transaction: reverted with reason string 'ArttacaMarketplaceUpgradeable:buyAndMint:: Listing signature is probably expired.");

    expect(await collection.totalSupply()).to.equal(0);
    expect((await collection.tokensOfOwner(user.address)).length).to.equal(0);

    await expect(
      marketplace.connect(user).buyAndMint(
        collection.address,
        tokenData,
        mintData,
        wrongListingSignatureSaleData,
        {value: PRICE}
      )
    ).to.rejectedWith("VM Exception while processing transaction: reverted with reason string 'ArttacaMarketplaceUpgradeable:buyAndMint:: Listing signature is not valid.'");

    expect(await collection.totalSupply()).to.equal(0);
    expect((await collection.tokensOfOwner(user.address)).length).to.equal(0);
  });

  it("User cannot buy and mint if wrong operator signature", async function () {

    const wrongOperatorSignature = await createSaleSignature(
      collection.address,
      user,
        marketplace.address,
      TOKEN_ID,
      PRICE,
      expTimestamp
    );

    saleData = [ PRICE, listingExpTimestamp, nodeExpTimestamp, listingSignature, wrongOperatorSignature ];

    await expect(
      marketplace.connect(user).buyAndMint(
        collection.address,
        tokenData,
        mintData,
        saleData,
        {value: PRICE}
      )
    ).to.rejectedWith("VM Exception while processing transaction: reverted with reason string 'ArttacaMarketplaceUpgradeable:buyAndMint:: Node signature is not from a valid operator.'");

    expect(await collection.totalSupply()).to.equal(0);
    expect((await collection.tokensOfOwner(user.address)).length).to.equal(0);
  });
});
