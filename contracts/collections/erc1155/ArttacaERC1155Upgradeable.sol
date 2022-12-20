// SPDX-License-Identifier: MIT
// Arttaca Contracts (last updated v1.0.0) (collections/erc721/ArttacaERC1155Upgradeable.sol)

pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/common/ERC2981Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";

import "./ArttacaERC1155SplitsUpgradeable.sol";
import "./IArttacaERC1155Upgradeable.sol";

interface Operatable {
    function isOperator(address _user) external view returns (bool);
}

/**
 * @title ArttacaERC1155Upgradeable
 * @dev This contract is an Arttaca ERC1155 upgradeable collection.
 */
contract ArttacaERC1155Upgradeable is OwnableUpgradeable, ArttacaERC1155SplitsUpgradeable, ERC1155BurnableUpgradeable, ERC1155PausableUpgradeable, ERC1155URIStorageUpgradeable, IArttacaERC1155Upgradeable, EIP712Upgradeable {

    address public factoryAddress;
    string public name;
    string public symbol;

    function __ArttacaERC1155_initialize(
        address _factoryAddress,
        address _owner,
        string memory _name,
        string memory _symbol,
        uint96 _royaltyPct
    ) public initializer {
        __ERC1155_init("");
        __Ownable_init();
        __EIP712_init("Arttaca Collection", "1");
        __Pausable_init();
        __ERC1155Burnable_init();
        __ERC1155Supply_init();
        __Splits_init(_royaltyPct);
        _transferOwnership(_owner);

        factoryAddress = _factoryAddress;
        name = _name;
        symbol = _symbol;
    }

    function mintAndTransferByOwner(address _to, uint _tokenId, uint _quantity, string calldata _tokenURI, Ownership.Royalties memory _royalties) override external onlyOwner {
        require(!exists(_tokenId), "ArttacaERC1155Upgradeable::mintAndTransferByOwner: token has already been minted.");
        _mint(_to, _tokenId, _quantity, "");
        _setURI(_tokenId, _tokenURI);
        _setRoyalties(_tokenId, _royalties);
    }

    function mintAndTransfer(
        Marketplace.TokenData calldata _tokenData,
        Marketplace.MintData calldata _mintData
    ) override external {
        require(Operatable(factoryAddress).isOperator(msg.sender), "ArttacaERC1155Upgradeable:mintAndTransfer:: Caller is not a valid factory operator.");
        require(block.timestamp <= _mintData.expTimestamp, "ArttacaERC1155Upgradeable:mintAndTransfer:: Signature is expired.");
        require(
            ECDSAUpgradeable.recover(
                _hashTypedDataV4(Marketplace.hashMint(address(this), _tokenData, _mintData)),
                _mintData.signature
            ) == owner(),
            "ArttacaERC1155Upgradeable:mintAndTransfer:: Signature is not valid."
        );
        _mint(_mintData.to, _tokenData.id, _mintData.quantity, "");
        _setURI(_tokenData.id, _tokenData.URI);
        _setRoyalties(_tokenData.id, _tokenData.royalties);
    }

    function uri(uint _tokenId) public view override(ERC1155Upgradeable, ERC1155URIStorageUpgradeable) returns (string memory) {
        require(exists(_tokenId), "ArttacaERC1155Upgradeable::uri: token has not been minted.");
        return ERC1155URIStorageUpgradeable.uri(_tokenId);
    }

    // todo: think if we really would accept to change the token uri, we may not need that
    function setURI(uint _tokenId, string calldata _newTokenURI) onlyOwner external {
        require(exists(_tokenId), "ArttacaERC1155Upgradeable::setURI: token has not been minted.");
        _setURI(_tokenId, _newTokenURI);
    }

    function pause() public virtual onlyOwner {
        _pause();
    }

    function unpause() public virtual onlyOwner {
        _unpause();
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(IERC165Upgradeable, ERC1155Upgradeable, ArttacaERC1155SplitsUpgradeable) returns (bool) {
        return interfaceId == type(IArttacaERC1155Upgradeable).interfaceId || super.supportsInterface(interfaceId);
    }

    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal virtual override(ERC1155Upgradeable, ERC1155SupplyUpgradeable, ERC1155PausableUpgradeable) {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    }

    uint256[50] private __gap;
}
