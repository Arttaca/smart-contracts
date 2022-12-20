import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { deployMarketplace } from "../util/fixtures";
import { getLastBlockTimestamp } from "../../common/utils/time";
import { createSaleSignature } from "../../common/utils/signature";
import {BigNumber} from "ethers";

const ONE = BigNumber.from(1)
const TOKEN_ID = BigNumber.from(3);
const royaltiesFee = 10;
const splitShares = 100;
const tokenURI = 'ipfs://123123';
const PRICE = '100000000000000000'; // 0.1 ETH
let listingSignature, nodeSignature, saleData, timestamp, listingExpTimestamp, nodeExpTimestamp, expTimestamp, tokenData, splits, royalties;

describe("ArttacaMarketplaceUpgradeable ERC1155 buy and transfer", function () {
  let erc1155factory, erc1155, owner, user, erc1155collection, marketplace, operator;
  beforeEach(async () => {
      ({ erc1155factory, erc1155, owner, user , erc1155collection, marketplace, operator } = await loadFixture(deployMarketplace));
      splits = [{account: owner.address, shares:splitShares}];
      royalties = {splits, percentage: royaltiesFee}
      tokenData = [
        TOKEN_ID,
        tokenURI,
        royalties
      ]
      const tx = await erc1155collection.mintAndTransferByOwner(owner.address, TOKEN_ID, ONE, tokenURI, royalties);
      await tx.wait();
      timestamp = await getLastBlockTimestamp();
      expTimestamp = timestamp + 100;
      listingExpTimestamp = expTimestamp + 100;
      nodeExpTimestamp = listingExpTimestamp + 100;
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

      saleData = [ owner.address, ONE, PRICE, listingExpTimestamp, nodeExpTimestamp, listingSignature, nodeSignature ];
  });

  it("User can buy and transfer", async function () {

     let tx = await erc1155collection.connect(owner).setApprovalForAll(marketplace.address, true);
      await tx.wait();

     tx = await marketplace.connect(user).buyAndTransfer(
        erc1155collection.address,
      tokenData,
      saleData,
      {value: PRICE}
    );
    await tx.wait();

    expect(await erc1155collection.balanceOf(owner.address, TOKEN_ID)).to.equal(0);
      expect(await erc1155collection.balanceOf(user.address, TOKEN_ID)).to.equal(1);
  });

  it("User cannot buy and transfer if token transfer is not approved", async function () {

    await expect(
      marketplace.connect(user).buyAndTransfer(
          erc1155collection.address,
        tokenData,
        saleData,
        {value: PRICE}
      )
    ).to.rejectedWith("VM Exception while processing transaction: reverted with reason string 'ERC1155: caller is not token owner or approved'");

      expect(await erc1155collection.balanceOf(user.address, TOKEN_ID)).to.equal(0);
  });

  it("User cannot buy and transfer if sent less ETH than price", async function () {

    const WRONG_PRICE = '50000000000000000';

    await expect(
      marketplace.connect(user).buyAndTransfer(
          erc1155collection.address,
        tokenData,
        saleData,
        {value: WRONG_PRICE}
      )
    ).to.rejectedWith("VM Exception while processing transaction: reverted with reason string 'ArttacaMarketplaceUpgradeable::buyAndMint: Value sent is insufficient.'");

      expect(await erc1155collection.balanceOf(owner.address, TOKEN_ID)).to.equal(1);
      expect(await erc1155collection.balanceOf(user.address, TOKEN_ID)).to.equal(0);
  });

  it("User cannot buy and transfer if expired sale signature", async function () {

      let tx = await erc1155collection.connect(owner).setApprovalForAll(marketplace.address, true);
      await tx.wait();

    const expiredTimestamp = expTimestamp - 200;

    const expiredListingSignature = await createSaleSignature(
        erc1155collection.address,
      owner,
      marketplace.address,
      TOKEN_ID,
        ONE,
      PRICE,
      expiredTimestamp
    );

    saleData = [ owner.address, ONE, PRICE, expiredTimestamp, nodeExpTimestamp, expiredListingSignature, nodeSignature ];

    await expect(
      marketplace.connect(user).buyAndTransfer(
          erc1155collection.address,
        tokenData,
        saleData,
        {value: PRICE}
      )
    ).to.rejectedWith("VM Exception while processing transaction: reverted with reason string 'ArttacaMarketplaceUpgradeable:buyAndMint:: Listing signature is probably expired.");

      expect(await erc1155collection.balanceOf(owner.address, TOKEN_ID)).to.equal(1);
      expect(await erc1155collection.balanceOf(user.address, TOKEN_ID)).to.equal(0);
  });

  it("User cannot buy and mint if wrong operator signature", async function () {

      let tx = await erc1155collection.connect(owner).setApprovalForAll(marketplace.address, true);
      await tx.wait();

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
      marketplace.connect(user).buyAndTransfer(
          erc1155collection.address,
        tokenData,
        saleData,
        {value: PRICE}
      )
    ).to.rejectedWith("VM Exception while processing transaction: reverted with reason string 'ArttacaMarketplaceUpgradeable:buyAndMint:: Node signature is not from a valid operator.'");

      expect(await erc1155collection.balanceOf(owner.address, TOKEN_ID)).to.equal(1);
      expect(await erc1155collection.balanceOf(user.address, TOKEN_ID)).to.equal(0);
  });
});
