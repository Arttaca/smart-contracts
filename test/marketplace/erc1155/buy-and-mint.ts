import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { deployMarketplace } from "../util/fixtures";
import { getLastBlockTimestamp } from "../../common/utils/time";
import { createMintSignature, createSaleSignature } from "../../common/utils/signature";
import {BigNumber} from "@ethersproject/bignumber";

const ONE = BigNumber.from(1)
const royaltiesFee = 10;
const splitShares = 100;
const TOKEN_ID = BigNumber.from(3);
const tokenURI = 'ipfs://123123';
const PRICE = '10000000000000000'; // 0.01 ETH
let mintSignature, listingSignature, nodeSignature, mintData, saleData, timestamp, expTimestamp, listingExpTimestamp, nodeExpTimestamp, tokenData, splits, royalties;

describe("ArttacaMarketplaceUpgradeable ERC1155 buy and mint", function () {
  let erc1155factory, erc1155, owner, user , erc1155collection, marketplace, operator, protocol;
  beforeEach(async () => {
      ({ erc1155factory, erc1155, owner, user , erc1155collection, marketplace, operator, protocol } = await loadFixture(deployMarketplace));
      splits = [{account: owner.address, shares: splitShares}];
      royalties = {splits, percentage: royaltiesFee}
      tokenData = {
        id: TOKEN_ID,
        URI:tokenURI,
        royalties
      }
      timestamp = await getLastBlockTimestamp();
      expTimestamp = timestamp + 100;
      listingExpTimestamp = expTimestamp + 100;
      nodeExpTimestamp = listingExpTimestamp + 100;
      mintSignature = await createMintSignature(
          erc1155collection.address,
        owner,
        TOKEN_ID,
          ONE,
        tokenURI,
        royalties,
        expTimestamp
      );
      listingSignature = await createSaleSignature(
          erc1155collection.address,
        owner,
        marketplace.address,
        TOKEN_ID,
          ONE,
        PRICE,
        listingExpTimestamp
      );
      nodeSignature = await createSaleSignature(
          erc1155collection.address,
        operator,
        marketplace.address,
        TOKEN_ID,
          ONE,
        PRICE,
        nodeExpTimestamp
      );

      mintData = [ user.address, ONE, expTimestamp, mintSignature ];
      saleData = [ owner.address, ONE, PRICE, listingExpTimestamp, nodeExpTimestamp, listingSignature, nodeSignature ];
  });

  it("User can buy and mint", async function () {

    await expect(marketplace.connect(user).buyAndMint(
        erc1155collection.address,
      tokenData,
      mintData,
      saleData,
      {value: PRICE}
    )).to.emit(marketplace, "SaleExecuted")
        .withArgs(
            erc1155collection.address,
            TOKEN_ID,
            ONE,
            owner.address,
            user.address,
            PRICE.toString()
        )
    expect(await erc1155collection.totalSupply(TOKEN_ID)).to.equal(1);
  });

  it("User cannot buy and mint if sent less ETH", async function () {

    const WRONG_PRICE = BigNumber.from(PRICE).div(2).toString();

    await expect(
      marketplace.connect(user).buyAndMint(
          erc1155collection.address,
        tokenData,
        mintData,
        saleData,
        {value: WRONG_PRICE}
      )
    ).to.rejectedWith("VM Exception while processing transaction: reverted with reason string 'ArttacaMarketplaceUpgradeable::buyAndMint: Value sent is insufficient.'");

      expect(await erc1155collection.totalSupply(TOKEN_ID)).to.equal(0);
  });

  it("User cannot buy and mint if expired timestamp value send or expired sale signature", async function () {

    const expiredTimestamp = expTimestamp - 200;

    listingSignature = await createSaleSignature(
        erc1155collection.address,
      owner,
        marketplace.address,
      TOKEN_ID,
        ONE,
      PRICE,
      expiredTimestamp
    );

    const wrongExpiredTimeStampSaleData = [ owner.address, ONE, PRICE, expiredTimestamp, nodeExpTimestamp, listingSignature, nodeSignature ];
    const wrongListingSignatureSaleData = [ owner.address, ONE, PRICE, listingExpTimestamp, nodeExpTimestamp, listingSignature, nodeSignature ];

    await expect(
      marketplace.connect(user).buyAndMint(
          erc1155collection.address,
        tokenData,
        mintData,
        wrongExpiredTimeStampSaleData,
        {value: PRICE}
      )
    ).to.rejectedWith("VM Exception while processing transaction: reverted with reason string 'ArttacaMarketplaceUpgradeable:buyAndMint:: Listing signature is probably expired.");

    expect(await erc1155collection.totalSupply(TOKEN_ID)).to.equal(0);
    expect(await erc1155collection.balanceOf(user.address, TOKEN_ID)).to.equal(0);

    await expect(
      marketplace.connect(user).buyAndMint(
          erc1155collection.address,
        tokenData,
        mintData,
        wrongListingSignatureSaleData,
        {value: PRICE}
      )
    ).to.rejectedWith("VM Exception while processing transaction: reverted with reason string 'ArttacaMarketplaceUpgradeable:buyAndMint:: Listing signature is not valid.'");

      expect(await erc1155collection.totalSupply(TOKEN_ID)).to.equal(0);
      expect(await erc1155collection.balanceOf(user.address, TOKEN_ID)).to.equal(0);
  });

  it("User cannot buy and mint if wrong operator signature", async function () {

    const wrongOperatorSignature = await createSaleSignature(
        erc1155collection.address,
      user,
        marketplace.address,
      TOKEN_ID,
        ONE,
      PRICE,
      expTimestamp
    );

    saleData = [ owner.address, ONE, PRICE, listingExpTimestamp, nodeExpTimestamp, listingSignature, wrongOperatorSignature ];

    await expect(
      marketplace.connect(user).buyAndMint(
          erc1155collection.address,
        tokenData,
        mintData,
        saleData,
        {value: PRICE}
      )
    ).to.rejectedWith("VM Exception while processing transaction: reverted with reason string 'ArttacaMarketplaceUpgradeable:buyAndMint:: Node signature is not from a valid operator.'");

      expect(await erc1155collection.totalSupply(TOKEN_ID)).to.equal(0);
      expect(await erc1155collection.balanceOf(user.address, TOKEN_ID)).to.equal(0);
  });
});
