import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { deployCollectionMinted } from "./util/fixtures";

describe("ArttacaERC721Upgradeable metadata", function () {
  let collection, owner, user, tokenId;
  const NEW_BASE_URI = 'ipfs://';
  const TOKEN_URI = "3jASDHFASDFKJHASDFKHJ"
  beforeEach(async () => {
      ({ collection, owner, user, tokenId } = await loadFixture(deployCollectionMinted));
  });


  it("Owner can set a new base URI (base + tokenId)", async function () {
    expect(await collection.baseURI()).to.not.equal(NEW_BASE_URI);
    const tx = await collection.setBaseURI(NEW_BASE_URI);
    await tx.wait();
    expect(await collection.tokenURI(tokenId)).to.equal(NEW_BASE_URI + tokenId.toString());
    expect(await collection.baseURI()).to.equal(NEW_BASE_URI);
  });

  it("Owner can set a new base URI + token URI(base + tokenURI)", async function () {
    expect(await collection.baseURI()).to.not.equal(NEW_BASE_URI);
    let tx = await collection.setBaseURI(NEW_BASE_URI);
    await tx.wait();
    tx = await collection.setTokenURI(tokenId, TOKEN_URI);
    await tx.wait();
    expect(await collection.tokenURI(tokenId)).to.equal(NEW_BASE_URI + TOKEN_URI);
    expect(await collection.baseURI()).to.equal(NEW_BASE_URI);
  });

  it("Owner can set a token URI without base (tokenURI)", async function () {
    expect(await collection.baseURI()).to.not.equal(NEW_BASE_URI);
    let tx = await collection.setBaseURI("");
    await tx.wait();
    tx = await collection.setTokenURI(tokenId, TOKEN_URI);
    await tx.wait();
    expect(await collection.tokenURI(tokenId)).to.equal(TOKEN_URI);
    expect(await collection.baseURI()).to.equal("");
  });

  it("Non-owner can't set new base URI", async function () {
    await expect(
      collection.connect(user).setBaseURI(NEW_BASE_URI)
    ).to.be.rejectedWith(
      "VM Exception while processing transaction: reverted with reason string 'Ownable: caller is not the owner'"
    );
    expect(await collection.baseURI()).to.not.equal(NEW_BASE_URI);
  });
});
