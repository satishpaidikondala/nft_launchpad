const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');
const fs = require('fs');
const path = require('path');

function main() {
  const allowlistPath = path.join(__dirname, '../allowlist.json');
  
  if (!fs.existsSync(allowlistPath)) {
    console.error("Error: allowlist.json not found in project root.");
    process.exit(1);
  }

  const allowlist = JSON.parse(fs.readFileSync(allowlistPath, 'utf8'));
  
  // Hash addresses to get leaf nodes
  const leaves = allowlist.map(addr => keccak256(addr));
  
  // Create Merkle Tree
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  
  // Get Root
  const root = tree.getHexRoot();
  
  console.log('Merkle Root:', root);
  
  // Optional: Output proofs for testing
  const proofs = {};
  allowlist.forEach(addr => {
    const leaf = keccak256(addr);
    proofs[addr] = tree.getHexProof(leaf);
  });
  
  // Write proofs to a file for frontend/testing usage
  fs.writeFileSync(path.join(__dirname, '../merkle-proofs.json'), JSON.stringify(proofs, null, 2));
  console.log('Proofs saved to merkle-proofs.json');
}

main();
