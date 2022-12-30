import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { deployFactory } from "./util/fixtures";

describe("ArttacaERC721Factory create collection", function () {
  let factory, owner, user;
  beforeEach(async () => {
      ({factory, owner, user } = await loadFixture(deployFactory));
  });

  it("Deployer can create new collections", async function () {
    expect(await factory.collectionsCount()).to.equal(0);
    await factory.connect(owner).createCollection('Arttaca Test','ARTTT','https://api.arttaca.io/v1/assets/{address}/{id}', 5, 'https://api.arttaca.io/v1/collections/blabla')
    expect(await factory.collectionsCount()).to.equal(1);
  });

  it("Any other user can create new collections", async function () {
    expect(await factory.collectionsCount()).to.equal(0);
    await factory.connect(owner).createCollection('Arttaca Test','ARTTT','https://api.arttaca.io/v1/assets/{address}/{id}', 5, 'https://api.arttaca.io/v1/collections/blabla')
    expect(await factory.collectionsCount()).to.equal(1);
  });
});
