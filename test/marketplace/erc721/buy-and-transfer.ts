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

describe("ArttacaMarketplaceUpgradeable ERC721 buy and transfer", function () {
  let erc721factory, erc721, owner, user, erc721collection, marketplace, operator;
  beforeEach(async () => {
      ({ erc721factory, erc721, owner, user , erc721collection, marketplace, operator } = await loadFixture(deployMarketplace));
      splits = [{account: owner.address, shares:splitShares}];
      royalties = {splits, percentage: royaltiesFee}
      tokenData = [
        TOKEN_ID,
        tokenURI,
        royalties
      ]
      const tx = await erc721collection.mintAndTransferByOwner(owner.address, TOKEN_ID, tokenURI, royalties);
      await tx.wait();
      timestamp = await getLastBlockTimestamp();
      expTimestamp = timestamp + 100;
      listingExpTimestamp = expTimestamp + 100;
      nodeExpTimestamp = listingExpTimestamp + 100;
      listingSignature = await createSaleSignature(
          erc721collection.address,
        owner,
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

      saleData = [ owner.address, ONE, PRICE, listingExpTimestamp, nodeExpTimestamp, listingSignature, nodeSignature ];
  });

  it("User can buy and transfer", async function () {

      erc721collection.connect(owner).approve(marketplace.address, TOKEN_ID);

    const tx = await marketplace.connect(user).buyAndTransfer(
        erc721collection.address,
      tokenData,
      saleData,
      {value: PRICE}
    );
    await tx.wait();

    expect((await erc721collection.tokensOfOwner(user.address)).length).to.equal(1);
    expect((await erc721collection.tokensOfOwner(user.address))[0]).to.equal(TOKEN_ID);
    expect(await erc721collection.tokenOfOwnerByIndex(user.address, 0)).to.equal(TOKEN_ID);
  });

  it("User cannot buy and transfer if token transfer is not approved", async function () {

    await expect(
      marketplace.connect(user).buyAndTransfer(
          erc721collection.address,
        tokenData,
        saleData,
        {value: PRICE}
      )
    ).to.rejectedWith("VM Exception while processing transaction: reverted with reason string 'ERC721: caller is not token owner or approved'");

    expect((await erc721collection.tokensOfOwner(user.address)).length).to.equal(0);
  });

  it("User cannot buy and transfer if sent less ETH than price", async function () {

    const WRONG_PRICE = '50000000000000000';

    await expect(
      marketplace.connect(user).buyAndTransfer(
          erc721collection.address,
        tokenData,
        saleData,
        {value: WRONG_PRICE}
      )
    ).to.rejectedWith("VM Exception while processing transaction: reverted with reason string 'ArttacaMarketplaceUpgradeable::buyAndMint: Value sent is insufficient.'");

    expect((await erc721collection.tokensOfOwner(owner.address)).length).to.equal(1);
    expect((await erc721collection.tokensOfOwner(user.address)).length).to.equal(0);
  });

  it("User cannot buy and transfer if expired sale signature", async function () {

      erc721collection.connect(owner).approve(marketplace.address, TOKEN_ID);

    const expiredTimestamp = expTimestamp - 200;

    const expiredListingSignature = await createSaleSignature(
        erc721collection.address,
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
          erc721collection.address,
        tokenData,
        saleData,
        {value: PRICE}
      )
    ).to.rejectedWith("VM Exception while processing transaction: reverted with reason string 'ArttacaMarketplaceUpgradeable:buyAndMint:: Listing signature is probably expired.");

    expect((await erc721collection.tokensOfOwner(owner.address)).length).to.equal(1);
    expect((await erc721collection.tokensOfOwner(user.address)).length).to.equal(0);
  });

  it("User cannot buy and mint if wrong operator signature", async function () {

      erc721collection.connect(owner).approve(marketplace.address, TOKEN_ID);

    const wrongOperatorSignature = await createSaleSignature(
        erc721collection.address,
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
          erc721collection.address,
        tokenData,
        saleData,
        {value: PRICE}
      )
    ).to.rejectedWith("VM Exception while processing transaction: reverted with reason string 'ArttacaMarketplaceUpgradeable:buyAndMint:: Node signature is not from a valid operator.'");

    expect((await erc721collection.tokensOfOwner(owner.address)).length).to.equal(1);
    expect((await erc721collection.tokensOfOwner(user.address)).length).to.equal(0);
  });
});
