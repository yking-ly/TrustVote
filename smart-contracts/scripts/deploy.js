const hre = require("hardhat");

async function main() {
  console.log("Starting TrustVote Deployment (Phone OTP + Signature Auth)...\n");

  // The backend signer address — MUST match the private key in backend/.env
  const rawAddress = process.env.BACKEND_SIGNER_ADDRESS;
  if (!rawAddress) {
    throw new Error(
      "BACKEND_SIGNER_ADDRESS not set in .env!\n" +
      "Run the backend first (npm start) to see the signer address, then add it to smart-contracts/.env"
    );
  }

  // Checksum the address so ethers treats it as a valid address (avoids resolveName ENS issue)
  const BACKEND_SIGNER_ADDRESS = hre.ethers.getAddress(rawAddress.trim());
  console.log(`Using backend signer: ${BACKEND_SIGNER_ADDRESS}`);

  // Deploy the Voting contract with the backend signer address
  const Voting = await hre.ethers.getContractFactory("Voting");
  const voting = await Voting.deploy(BACKEND_SIGNER_ADDRESS);
  await voting.waitForDeployment();

  const votingAddress = await voting.getAddress();

  console.log(`✅ Voting contract deployed to: ${votingAddress}`);
  console.log(`🔑 Backend signer authorized:   ${BACKEND_SIGNER_ADDRESS}`);
  console.log(`\n📋 Next steps:`);
  console.log(`   1. Copy the Voting address to frontend/.env as VITE_CONTRACT_ADDRESS=${votingAddress}`);
  console.log(`   2. Start the backend: cd backend && node server.js`);
  console.log(`   3. Start the frontend: cd frontend && npm run dev`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
