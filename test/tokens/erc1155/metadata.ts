import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { deployCollectionMinted } from "./util/fixtures";

describe("ArttacaERC1155Upgradeable metadata", function () {
  let collection, owner, user, tokenId;
  const TOKEN_URI = "3jASDHFASDFKJHASDFKHJ"
  beforeEach(async () => {
      ({ collection, owner, user, tokenId } = await loadFixture(deployCollectionMinted));
  });

  it("Owner can set a new token URI", async function () {
    const tx = await collection.setURI(tokenId, TOKEN_URI);
    await tx.wait();
    expect(await collection.uri(tokenId)).to.equal(TOKEN_URI);
  });

  it("Not owner cannot set a token URI", async function () {
    await expect(
        collection.connect(user).setURI(tokenId, TOKEN_URI)
    ).to.rejectedWith("VM Exception while processing transaction: reverted with reason string 'Ownable: caller is not the owner'");
  });
});
