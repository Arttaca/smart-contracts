import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { deployMarketplace } from "./util/fixtures";

describe("ArttacaMarketplaceUpgradeable pausable", function () {
  let factory, erc721, owner, user , collection, marketplace;
  beforeEach(async () => {
      ({ factory, erc721, owner, user , collection, marketplace } = await loadFixture(deployMarketplace));
  });


  it("Initial operator (owner) can pause the contract", async function () {
    const tx = await marketplace.pause()
    await tx.wait();
    expect(await marketplace.paused()).to.equal(true);
  });

  it("Non-operator can't pause the contract", async function () {
    await expect(
      marketplace.connect(user).pause()
    ).to.be.rejectedWith(
      "VM Exception while processing transaction: reverted with reason string 'OperableUpgradeable::onlyOperator: the caller is not an operator.'"
    );
    expect(await marketplace.paused()).to.equal(false);
  });

  it("Another operator can pause the contract", async function () {
    let tx = await marketplace.addOperator(user.address);
    await tx.wait();

    tx = await marketplace.connect(user).pause()
    await tx.wait();
    expect(await marketplace.paused()).to.equal(true);
  });
});
