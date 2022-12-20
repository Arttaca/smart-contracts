import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { deployCollection } from "./util/fixtures";

describe("ArttacaERC721Upgradeable pausable", function () {
  let collection, owner, user;
  beforeEach(async () => {
      ({ collection, owner, user } = await loadFixture(deployCollection));
  });


  it("Owner can pause the contract", async function () {
    const tx = await collection.pause()
    await tx.wait();
    expect(await collection.paused()).to.equal(true);
  });

  it("Non-owner can't pause the contract", async function () {
    await expect(
      collection.connect(user).pause()
    ).to.be.rejectedWith(
      "VM Exception while processing transaction: reverted with reason string 'Ownable: caller is not the owner'"
    );
    expect(await collection.paused()).to.equal(false);
  });

  it("Can't transfer when paused", async function () {

    const royaltiesFee = 10;
    const splitShares = 100;
    const splits = [{account: owner.address, shares: splitShares}];
    const royalties = {splits, percentage: royaltiesFee}

    let tx = await collection.mintAndTransferByOwner(owner.address, 0 , '', royalties);
    await tx.wait();

    tx = await collection.pause()
    await tx.wait();

    await expect(
      collection.connect(owner).transferFrom(owner.address, user.address, 0)
    ).to.be.rejectedWith(
      "VM Exception while processing transaction: reverted with reason string 'ERC721Pausable: token transfer while paused'"
    );
  });
});
