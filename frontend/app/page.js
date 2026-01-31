'use client';

import { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { MerkleTree } from 'merkletreejs';
import keccak256 from 'keccak256';
import MyNFTABI from '../utils/MyNFT.json';
import allowlist from '../utils/allowlist.json';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export default function Home() {
  const { address, isConnected } = useAccount();
  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const [quantity, setQuantity] = useState(1);
  const [merkleProof, setMerkleProof] = useState([]);
  const [isValidUser, setIsValidUser] = useState(false);

  // Read Contract Data
  const { data: totalSupply } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: MyNFTABI.abi,
    functionName: 'totalSupply',
    watch: true,
  });

  const { data: saleState } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: MyNFTABI.abi,
    functionName: 'saleState',
    watch: true,
  });

  const { data: mintPrice } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: MyNFTABI.abi,
    functionName: 'mintPrice',
  });

  // Generate Merkle Proof
  useEffect(() => {
    if (isConnected && address && allowlist) {
      const leaves = allowlist.map((addr) => keccak256(addr));
      const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
      const leaf = keccak256(address);
      const proof = tree.getHexProof(leaf);
      setMerkleProof(proof);
      // Check if proof is valid for this address in this tree
      // Note: verify returns true if the proof/leaf belongs to root.
      setIsValidUser(tree.verify(proof, leaf, tree.getRoot()));
    }
  }, [address, isConnected]);

  const handleMint = async () => {
    if (!mintPrice) return;
    
    // Convert BigInt to string/value carefully if needed, but wagmi handles BigInts well
    const value = BigInt(mintPrice) * BigInt(quantity);

    if (saleState === 1) { // Allowlist
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: MyNFTABI.abi,
        functionName: 'allowlistMint',
        args: [merkleProof, BigInt(quantity)],
        value,
      });
    } else if (saleState === 2) { // Public
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: MyNFTABI.abi,
        functionName: 'publicMint',
        args: [BigInt(quantity)],
        value,
      });
    }
  };

  const getSaleStatusString = (state) => {
    if (state === 0) return 'Paused';
    if (state === 1) return 'Allowlist';
    if (state === 2) return 'Public';
    return 'Loading...';
  };

  return (
    <main>
      <nav>
        <span className="brand">PARTNR LAUNCHPAD</span>
        <div data-testid="connect-wallet-button">
            <ConnectButton />
        </div>
      </nav>

      <div className="main-container">
        {/* Preview Section */}
        <div className="preview-card">
           <div className="preview-overlay"></div>
           <span>??</span>
        </div>

        {/* Minting Section */}
        <div className="info-section">
          <div>
            <div className="stats-row">
                <span>Total Minted</span>
                <span data-testid="sale-status" className="status-badge">
                    {getSaleStatusString(saleState)}
                </span>
            </div>
            <div className="progress-bar">
                <div 
                    className="progress-fill"
                    style={{ width: `${(Number(totalSupply || 0) / 10000) * 100}%` }}
                ></div>
            </div>
            <div className="count-row">
                <span data-testid="mint-count">{totalSupply?.toString() || '0'}</span>
                <span data-testid="total-supply">10000</span>
            </div>
          </div>

          <div className="mint-card">
            {isConnected ? (
                <div className="connected-info">
                    <p className="address-text" data-testid="connected-address">
                        Connected: {address}
                    </p>
                    
                    <div className="quantity-selector">
                        <button 
                            className="quantity-btn"
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        >-</button>
                        <input 
                            type="number" 
                            min="1" 
                            max="5"
                            value={quantity}
                            onChange={(e) => setQuantity(Number(e.target.value))}
                            className="quantity-input"
                            data-testid="quantity-input"
                        />
                        <button 
                            className="quantity-btn"
                            onClick={() => setQuantity(Math.min(5, quantity + 1))}
                        >+</button>
                    </div>

                    <button
                        onClick={handleMint}
                        disabled={isPending || isConfirming || (saleState === 0) || (saleState === 1 && !isValidUser)}
                        className={`mint-btn ${
                             (saleState === 1 && !isValidUser) ? 'error-btn' : ''
                        }`}
                        data-testid="mint-button"
                    >
                        {isPending ? 'Confirming...' : 
                         isConfirming ? 'Minting...' : 
                         saleState === 0 ? 'Sale Paused' :
                         (saleState === 1 && !isValidUser) ? 'Not Allowlisted' :
                         'Mint Now'}
                    </button>
                    
                    {hash && <div className="tx-hash">Tx: {hash}</div>}
                    {isConfirmed && <div className="success-msg">Mint Successful!</div>}
                </div>
            ) : (
                <div className="connect-prompt">
                    Connect wallet to mint
                </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
