// SPDX-License-Identifier: MIT
// Arttaca Contracts (last updated v1.0.0) (marketplace/ArttacaMarketplaceUpgradeable.sol)

pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

import "../access/OperableUpgradeable.sol";
import "../lib/Marketplace.sol";
import "../utils/VerifySignature.sol";
import "../collections/erc1155/IArttacaERC1155Upgradeable.sol";

interface ArttacaCollection {
    function mintAndTransfer(Marketplace.TokenData calldata _tokenData, Marketplace.MintData calldata _mintData) external;
    function owner() external returns (address);
    function getBaseRoyalty() external returns (Ownership.Split memory);
    function getRoyalties(uint tokenId) external returns (Ownership.Royalties memory);
    function supportsInterface(bytes4 interfaceId) external view virtual returns (bool);
}

interface ERC721 is ArttacaCollection {
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function ownerOf(uint) external returns (address);
}

interface ERC1155 is ArttacaCollection{
    function safeTransferFrom(address from, address to, uint256 tokenId, uint256 quantity, bytes memory data) external;
    function balanceOf(address, uint) external returns (address);
}

/**
 * @title ArttacaMarketplaceUpgradeable

 * @dev This contract
 */
contract ArttacaMarketplaceUpgradeable is VerifySignature, PausableUpgradeable, OperableUpgradeable, EIP712Upgradeable {

    // @dev Recipient of protocol fees.
    Ownership.Split protocolFee;

    function __ArttacaMarketplace_init(
        address owner,
        Ownership.Split memory _protocolFee
    ) external initializer {
        __EIP712_init("Arttaca Marketplace", "1");
        __OperableUpgradeable_init(owner);
        _addOperator(owner);

        protocolFee = _protocolFee;
    }

    function buyAndMint(
        address collectionAddress,
        Marketplace.TokenData calldata _tokenData,
        Marketplace.MintData calldata _mintData,
        Marketplace.SaleData calldata _saleData
    ) external payable {
        require(!paused(), "ArttacaMarketplaceUpgradeable::buyAndMint: cannot mint and buy while is paused.");
        require(msg.value >= _saleData.price, "ArttacaMarketplaceUpgradeable::buyAndMint: Value sent is insufficient.");

        ArttacaCollection collection = ArttacaCollection(collectionAddress);

        _verifySaleSignatures(_tokenData, _saleData, collectionAddress);

        uint saleProceedingsToSend = _saleData.price - _takeProtocolFee(_saleData.price);

        Ownership.Royalties memory royalties = _tokenData.royalties;
        _distributeSplits(royalties.splits, saleProceedingsToSend);

        collection.mintAndTransfer(_tokenData, _mintData);
    }

    function buyAndTransfer(
        address collectionAddress,
        Marketplace.TokenData calldata _tokenData,
        Marketplace.SaleData calldata _saleData
    ) external payable {
        require(!paused(), "ArttacaMarketplaceUpgradeable::buyAndMint: cannot mint and buy while is paused.");
        require(msg.value >= _saleData.price, "ArttacaMarketplaceUpgradeable::buyAndMint: Value sent is insufficient.");

        require(block.timestamp <= _saleData.listingExpTimestamp, "ArttacaMarketplaceUpgradeable:buyAndMint:: Listing signature is probably expired.");
        require(block.timestamp <= _saleData.nodeExpTimestamp, "ArttacaMarketplaceUpgradeable:buyAndMint:: Node signature is probably expired.");

        ArttacaCollection collection = ArttacaCollection(collectionAddress);

        _verifySaleSignatures(_tokenData, _saleData, collectionAddress);

        uint saleProceedingsToSend = _saleData.price;
        saleProceedingsToSend -= _takeProtocolFee(_saleData.price);

        Ownership.Royalties memory royalties = collection.getRoyalties(_tokenData.id);
        if (!(royalties.splits[0].account == _saleData.lister && royalties.splits.length == 1)) {
            uint royaltyAmount = (saleProceedingsToSend * royalties.percentage * 100) / _feeDenominator();
            _distributeSplits(royalties.splits, royaltyAmount);
            saleProceedingsToSend -= royaltyAmount;
        }

        AddressUpgradeable.sendValue(payable(_saleData.lister), saleProceedingsToSend);

        if (collection.supportsInterface(type(IArttacaERC1155Upgradeable).interfaceId)) {
            ERC1155(collectionAddress).safeTransferFrom(_saleData.lister, msg.sender, _tokenData.id, _saleData.quantity, "");
        } else {
            ERC721(collectionAddress).safeTransferFrom(_saleData.lister, msg.sender, _tokenData.id);
        }
    }

    function _takeProtocolFee(uint _price) internal returns (uint protocolFeeAmount) {
        protocolFeeAmount = (_price * protocolFee.shares) / _feeDenominator();
        AddressUpgradeable.sendValue(protocolFee.account, protocolFeeAmount);
        _returnIfAdditionalFunds(_price);
    }

    function _returnIfAdditionalFunds(uint _price) internal {
        if (msg.value > _price) {
            AddressUpgradeable.sendValue(payable(msg.sender), msg.value - _price);
        }
    }

    function _distributeSplits(Ownership.Split[] memory splits, uint _amountToSplit) internal {
        uint amountToSend = _amountToSplit;
        for (uint i; i < splits.length; i++) {
            uint splitAmount = (_amountToSplit * (splits[i].shares * 100)) / _feeDenominator();
            if(i == splits.length - 1) {
                AddressUpgradeable.sendValue(splits[i].account, amountToSend);
            } else {
                AddressUpgradeable.sendValue(splits[i].account, splitAmount);
                amountToSend -= splitAmount;
            }
        }
    }

    function _verifySaleSignatures(
        Marketplace.TokenData calldata _tokenData,
        Marketplace.SaleData calldata _saleData,
        address collectionAddress
    ) internal view {
        require(block.timestamp <= _saleData.listingExpTimestamp, "ArttacaMarketplaceUpgradeable:buyAndMint:: Listing signature is probably expired.");
        require(block.timestamp <= _saleData.nodeExpTimestamp, "ArttacaMarketplaceUpgradeable:buyAndMint:: Node signature is probably expired.");

        require(
            ECDSAUpgradeable.recover(
                _hashTypedDataV4(Marketplace.hashListing(collectionAddress, _tokenData, _saleData, false)),
                _saleData.listingSignature
            ) == _saleData.lister,
            "ArttacaMarketplaceUpgradeable:buyAndMint:: Listing signature is not valid."
        );

        address nodeSignerRecovered = ECDSAUpgradeable.recover(
            _hashTypedDataV4(Marketplace.hashListing(collectionAddress, _tokenData, _saleData, true)),
            _saleData.nodeSignature
        );

        require(
            isOperator(nodeSignerRecovered),
            "ArttacaMarketplaceUpgradeable:buyAndMint:: Node signature is not from a valid operator."
        );
    }

    /**
     * @dev Change the protocol fee recipient (owner only)
     * @param _protocolFee New protocol fee recipient address
     */
    function changeProtocolFee(Ownership.Split memory _protocolFee) public onlyOwner {
        protocolFee = _protocolFee;
    }

    function _feeDenominator() internal pure virtual returns (uint96) {
        return 10000;
    }

    function pause() external onlyOperator {
        _pause();
    }

    function unpause() external onlyOperator {
        _unpause();
    }


    uint256[50] private __gap;
}
