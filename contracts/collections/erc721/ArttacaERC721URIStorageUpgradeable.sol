// SPDX-License-Identifier: MIT
// Arttaca Contracts (last updated v1.0.0) (collections/erc721/ArttacaERC721URIStorageUpgradeable.sol)

pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";


/**
 * @dev ERC721 token with storage based token URI management.
 */
abstract contract ArttacaERC721URIStorageUpgradeable is Initializable, ERC721Upgradeable {
    using StringsUpgradeable for uint;
    using StringsUpgradeable for address;

    // Optional mapping for token URIs
    mapping(uint256 => string) private _tokenURIs;

    function __ArttacaERC721URIStorage_init() internal onlyInitializing {}

    function __ArttacaERC721URIStorage_init_unchained() internal onlyInitializing {}

    /**
     * Returns tokenURI if exists, if not baseURI
     */
    function tokenURI(uint tokenId) public view virtual override returns (string memory) {
        _requireMinted(tokenId);

        string memory _tokenURI = _tokenURIs[tokenId];

        // If tokenURI is set we return it.
        if (bytes(_tokenURI).length > 0) {
            return _tokenURI;
        }

        string memory base = _baseURI();

        // If there is no token URI, return the base URI.
        if (bytes(base).length > 0) {
            return string(
                abi.encodePacked(
                    base,
                    address(this).toHexString(),
                    '/',
                    tokenId.toString()
                )
            );
        }

        return super.tokenURI(tokenId);
    }

    /**
     * @dev Sets `_tokenURI` as the tokenURI of `tokenId`.
     *
     * Requirements:
     *
     * - `tokenId` must exist.
     */
    function _setTokenURI(uint tokenId, string memory _tokenURI) internal virtual {
        require(_exists(tokenId), "ERC721URIStorage: URI set of nonexistent token");
        _tokenURIs[tokenId] = _tokenURI;
    }

    /**
     * @dev See {ERC721-_burn}. This override additionally checks to see if a
     * token-specific URI was set for the token, and if so, it deletes the token URI from
     * the storage mapping.
     */
    function _burn(uint tokenId) internal virtual override {
        super._burn(tokenId);

        if (bytes(_tokenURIs[tokenId]).length != 0) {
            delete _tokenURIs[tokenId];
        }
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[50] private __gap;
}