import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { deployMarketplace } from "../util/fixtures";
import { getLastBlockTimestamp } from "../../common/utils/time";
import { createMintSignature, createSaleSignature } from "../../common/utils/signature";

const ONE = BigNumber.from(1)

const feeDenominator = 10000;
const protocolFee = 3;
const royaltiesFee = 10; // 10%
const TOKEN_ID =  BigNumber.from(3);
const tokenURI = 'ipfs://123123';
const PRICE = '1000000000000000000'; // 1 ETH
let listingSignature, nodeSignature, saleData, timestamp, expTimestamp, listingExpTimestamp, nodeExpTimestamp, tokenData, splits, royalties;

describe("ArttacaMarketplaceUpgradeable ERC1155 secondary sales", function () {
  let erc1155factory, erc1155, owner, user , erc1155collection, marketplace, operator, protocol, minter, split1, split2, buyer1;
  beforeEach(async () => {
      ({ erc1155factory, erc1155, owner, user , erc1155collection, marketplace, operator, protocol, minter, split1, split2, buyer1 } = await loadFixture(deployMarketplace));
      splits = [{account: minter.address, shares: 100}];
      royalties = {splits, percentage: royaltiesFee}
      timestamp = await getLastBlockTimestamp();
      expTimestamp = timestamp + 100;
      listingExpTimestamp = expTimestamp + 100;
      nodeExpTimestamp = listingExpTimestamp + 100;

      let tx = await erc1155collection.transferOwnership(minter.address);
      await tx.wait();
      tx = await erc1155collection.connect(minter).mintAndTransferByOwner(user.address, TOKEN_ID, ONE, tokenURI, royalties);
      await tx.wait();
      tx = await erc1155collection.connect(user).setApprovalForAll(marketplace.address, true);
      await tx.wait();

  });

  it("Owner receives payment less royalties pct and protocol fee, royalties are paid to splits", async function () {

    const priceBigNumber = BigNumber.from(PRICE);

    const expectedProtocolFee = priceBigNumber.mul(protocolFee * 100).div(feeDenominator);
    const amountToSplit = priceBigNumber.sub(expectedProtocolFee)
    const expectedMinterFee = amountToSplit.mul(royaltiesFee * 100).div(feeDenominator);
    const expectedSellerFee = amountToSplit.sub(expectedMinterFee);

    const userBalanceBefore = await user.getBalance();
    const minterBalanceBefore = await minter.getBalance();
    const protocolBalanceBefore = await protocol.getBalance();
    const buyer1BalanceBefore = await buyer1.getBalance();

    listingSignature = await createSaleSignature(
        erc1155collection.address,
      user,
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

    tokenData = [ TOKEN_ID, tokenURI, royalties ]
    saleData = [ user.address, ONE, PRICE, listingExpTimestamp, nodeExpTimestamp, listingSignature, nodeSignature ];

    const tx = await marketplace.connect(buyer1).buyAndTransfer(
        erc1155collection.address,
      tokenData,
      saleData,
      {value: PRICE}
    );
    const receipt = await tx.wait();
    const transactionFee = receipt.gasUsed.mul(receipt.effectiveGasPrice)

    const buyer1BalanceAfter = await buyer1.getBalance();

    const userBalanceDiff = (await user.getBalance()).sub(userBalanceBefore);
    const protocolBalanceDiff = (await protocol.getBalance()).sub(protocolBalanceBefore);
    const minterBalanceDiff = (await minter.getBalance()).sub(minterBalanceBefore);
    const buyer1BalanceDiff = buyer1BalanceBefore.sub(buyer1BalanceAfter);

    expect(await erc1155collection.totalSupply(TOKEN_ID)).to.equal(1);
    expect(await erc1155collection.balanceOf(buyer1.address, TOKEN_ID)).to.equal(1);
    expect(protocolBalanceDiff).to.equal(expectedProtocolFee);
    expect(minterBalanceDiff).to.equal(expectedMinterFee);
    expect(userBalanceDiff).to.equal(expectedSellerFee);
    expect(buyer1BalanceDiff).to.equal(priceBigNumber.add(transactionFee));
  });

  it("If sent additional funds, will return them to the transaction sender", async function () {

    const priceBigNumber = BigNumber.from(PRICE);

    const expectedProtocolFee = priceBigNumber.mul(protocolFee * 100).div(feeDenominator);
    const amountToSplit = priceBigNumber.sub(expectedProtocolFee)
    const expectedMinterFee = amountToSplit.mul(royaltiesFee * 100).div(feeDenominator);
    const expectedSellerFee = amountToSplit.sub(expectedMinterFee);

    const userBalanceBefore = await user.getBalance();
    const minterBalanceBefore = await minter.getBalance();
    const protocolBalanceBefore = await protocol.getBalance();
    const buyer1BalanceBefore = await buyer1.getBalance();

    listingSignature = await createSaleSignature(
        erc1155collection.address,
      user,
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

    tokenData = [ TOKEN_ID, tokenURI, royalties ]
    saleData = [ user.address, ONE, PRICE, listingExpTimestamp, nodeExpTimestamp, listingSignature, nodeSignature ];

    const tx = await marketplace.connect(buyer1).buyAndTransfer(
        erc1155collection.address,
      tokenData,
      saleData,
      {value: priceBigNumber.mul(2)} // sending additional funds
    );
    const receipt = await tx.wait();
    const transactionFee = receipt.gasUsed.mul(receipt.effectiveGasPrice)

    const buyer1BalanceAfter = await buyer1.getBalance();

    const userBalanceDiff = (await user.getBalance()).sub(userBalanceBefore);
    const protocolBalanceDiff = (await protocol.getBalance()).sub(protocolBalanceBefore);
    const minterBalanceDiff = (await minter.getBalance()).sub(minterBalanceBefore);
    const buyer1BalanceDiff = buyer1BalanceBefore.sub(buyer1BalanceAfter);

    expect(await erc1155collection.totalSupply(TOKEN_ID)).to.equal(1);
    expect(await erc1155collection.balanceOf(buyer1.address, TOKEN_ID)).to.equal(1);
    expect(protocolBalanceDiff).to.equal(expectedProtocolFee);
    expect(minterBalanceDiff).to.equal(expectedMinterFee);
    expect(userBalanceDiff).to.equal(expectedSellerFee);
    expect(buyer1BalanceDiff).to.equal(priceBigNumber.add(transactionFee));
  });
});
