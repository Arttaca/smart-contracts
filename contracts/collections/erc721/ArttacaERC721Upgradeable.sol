// SPDX-License-Identifier: MIT
// Arttaca Contracts (last updated v1.0.0) (collections/erc721/ArttacaERC721Upgradeable.sol)

pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";

import "../../splits/AbstractSplitsUpgradeable.sol";
import "../../utils/VerifySignature.sol";
import "./IArttacaERC721Upgradeable.sol";
import "./ArttacaERC721URIStorageUpgradeable.sol";

interface Operatable {
    function isOperator(address _user) external view returns (bool);
}

/**
 * @title ArttacaERC721Upgradeable
 * @dev This contract is an Arttaca ERC721 upgradeable collection.
 */
contract ArttacaERC721Upgradeable is OwnableUpgradeable, VerifySignature, ERC721BurnableUpgradeable, ERC721PausableUpgradeable, ArttacaERC721URIStorageUpgradeable, ERC721EnumerableUpgradeable, AbstractSplitsUpgradeable, IArttacaERC721Upgradeable, EIP712Upgradeable {

    address public factoryAddress;

    function __ArttacaERC721_initialize(
        address _factoryAddress,
        address _owner,
        string memory _name,
        string memory _symbol,
        string memory baseURI_,
        uint96 _royaltyPct
    ) external initializer {
        __ERC721_init(_name, _symbol);
        __EIP712_init("Arttaca721", "1");
        __Ownable_init();
        __Pausable_init();
        __ERC721Burnable_init();
        __ArttacaERC721URIStorage_init(baseURI_);
        __Splits_init(_royaltyPct);
        _transferOwnership(_owner);

        factoryAddress = _factoryAddress;
    }

    function mintAndTransferByOwner(address _to, uint _tokenId, string calldata _tokenURI, Ownership.Royalties memory _royalties) override external onlyOwner {
        _mint(_to, _tokenId);
        _setTokenURI(_tokenId, _tokenURI);
        _setRoyalties(_tokenId, _royalties);
    }

    function mintAndTransfer(
        Marketplace.TokenData calldata _tokenData,
        Marketplace.MintData calldata _mintData
    ) override external {
        require(Operatable(factoryAddress).isOperator(msg.sender), "ArttacaERC721Upgradeable:mintAndTransfer:: Caller is not a valid factory operator.");
        require(block.timestamp <= _mintData.expTimestamp, "ArttacaERC721Upgradeable:mintAndTransfer:: Signature is expired.");
        require(
            ECDSAUpgradeable.recover(
                _hashTypedDataV4(Marketplace.hashMint(address(this), _tokenData, _mintData)),
                _mintData.signature
            ) == owner(),
            "ArttacaERC721Upgradeable:mintAndTransfer:: Signature is not valid."
        );
        _mint(_mintData.to, _tokenData.id);
        _setTokenURI(_tokenData.id, _tokenData.URI);
        _setRoyalties(_tokenData.id, _tokenData.royalties);
    }

    function tokensOfOwner(address _owner) external view returns(uint[] memory ) {
        uint tokenCount = balanceOf(_owner);
        if (tokenCount == 0) {
            return new uint[](0);
        } else {
            uint[] memory result = new uint[](tokenCount);
            uint index;
            for (index = 0; index < tokenCount; index++) {
                result[index] = tokenOfOwnerByIndex(_owner, index);
            }
            return result;
        }
    }

    function pause() external virtual onlyOwner {
        _pause();
    }

    function unpause() external virtual onlyOwner {
        _unpause();
    }

    function _burn(uint tokenId) internal virtual override(ERC721Upgradeable, ArttacaERC721URIStorageUpgradeable) {
        super._burn(tokenId);
        require(!paused(), "ERC721Pausable: token transfer while paused");
    }

    function tokenURI(uint _tokenId) public view override(ERC721Upgradeable, ArttacaERC721URIStorageUpgradeable) returns (string memory) {
        require(_exists(_tokenId), "ArttacaERC721Upgradeable::tokenURI: token has not been minted.");
        return ArttacaERC721URIStorageUpgradeable.tokenURI(_tokenId);
    }

    struct TokenInformation {
        address owner;
        string tokenURI;
        Ownership.Royalties royalties;
    }

    function getTokenInformation(uint _tokenId) external view returns (TokenInformation memory tokenInformation) {
        require(_exists(_tokenId), "ArttacaERC721Upgradeable::getTokenInformation: token has not been minted.");
        return TokenInformation({
            owner: ownerOf(_tokenId),
            tokenURI: tokenURI(_tokenId),
            royalties: getRoyalties(_tokenId)
        });
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(IERC165Upgradeable, ERC721Upgradeable, ERC721EnumerableUpgradeable) returns (bool) {
        return interfaceId == type(IArttacaERC721Upgradeable).interfaceId || super.supportsInterface(interfaceId);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal virtual override(ERC721Upgradeable, ERC721PausableUpgradeable, ERC721EnumerableUpgradeable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    uint256[50] private __gap;
}
