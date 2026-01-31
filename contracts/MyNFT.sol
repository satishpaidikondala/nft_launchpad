// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract MyNFT is ERC721, Ownable, ERC2981, ReentrancyGuard {
    using Strings for uint256;

    uint256 public constant MAX_SUPPLY = 10000;
    uint256 public constant MAX_PER_WALLET = 5;
    
    uint256 public mintPrice = 0.05 ether;
    
    // URI handling
    string public baseURI;
    string public revealedURI;
    bool public isRevealed;

    // Merkle Root for allowlist
    bytes32 public merkleRoot;

    // Sale State
    enum SaleState { Paused, Allowlist, Public }
    SaleState public saleState;

    // Counters
    uint256 public totalSupply;
    mapping(address => uint256) public mintedPerWallet;

    constructor(
        string memory _name,
        string memory _symbol,
        string memory _initBaseURI
    ) ERC721(_name, _symbol) Ownable(msg.sender) {
        baseURI = _initBaseURI;
        saleState = SaleState.Paused;
        // Set default royalty to 5% (500 basis points)
        _setDefaultRoyalty(msg.sender, 500);
    }

    // --- Modifiers ---

    modifier onlyAllowlist() {
        require(saleState == SaleState.Allowlist, "Allowlist sale not active");
        _;
    }

    modifier onlyPublic() {
        require(saleState == SaleState.Public, "Public sale not active");
        _;
    }

    // --- Minting Functions ---

    function allowlistMint(bytes32[] calldata merkleProof, uint256 quantity) 
        external 
        payable 
        nonReentrant 
        onlyAllowlist 
    {
        require(quantity > 0, "Quantity must be > 0");
        require(totalSupply + quantity <= MAX_SUPPLY, "Exceeds max supply");
        require(mintedPerWallet[msg.sender] + quantity <= MAX_PER_WALLET, "Exceeds wallet limit");
        require(msg.value == mintPrice * quantity, "Incorrect ETH value");

        // Verify Merkle Proof
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        require(MerkleProof.verify(merkleProof, merkleRoot, leaf), "Invalid proof");

        _mintTokens(msg.sender, quantity);
    }

    function publicMint(uint256 quantity) 
        external 
        payable 
        nonReentrant 
        onlyPublic 
    {
        require(quantity > 0, "Quantity must be > 0");
        require(totalSupply + quantity <= MAX_SUPPLY, "Exceeds max supply");
        require(mintedPerWallet[msg.sender] + quantity <= MAX_PER_WALLET, "Exceeds wallet limit");
        require(msg.value == mintPrice * quantity, "Incorrect ETH value");

        _mintTokens(msg.sender, quantity);
    }

    function _mintTokens(address to, uint256 quantity) internal {
        for (uint256 i = 0; i < quantity; i++) {
            totalSupply++;
            _safeMint(to, totalSupply);
        }
        mintedPerWallet[to] += quantity;
    }

    // --- Admin Functions ---

    function setMintPrice(uint256 _price) external onlyOwner {
        mintPrice = _price;
    }

    function setBaseURI(string calldata _newBaseURI) external onlyOwner {
        baseURI = _newBaseURI;
    }

    function setRevealedURI(string calldata _newRevealedURI) external onlyOwner {
        revealedURI = _newRevealedURI;
    }

    function setMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
        merkleRoot = _merkleRoot;
    }

    function setSaleState(SaleState _state) external onlyOwner {
        saleState = _state;
    }

    function reveal() external onlyOwner {
        isRevealed = true;
    }

    function withdraw() external onlyOwner nonReentrant {
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        require(success, "Withdraw failed");
    }

    function setDefaultRoyalty(address receiver, uint96 feeNumerator) external onlyOwner {
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    // --- View Functions ---

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        _requireOwned(tokenId);

        if (isRevealed) {
            return string(abi.encodePacked(revealedURI, tokenId.toString(), ".json"));
        } else {
            return baseURI; // Placeholder URI
        }
    }

    // --- Overrides ---

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
