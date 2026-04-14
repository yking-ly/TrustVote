# 🗳️ TrustVote: Decentralized Voting DApp

TrustVote is a next-generation, secure, and transparent decentralized application (DApp) built on the Ethereum blockchain. It guarantees cryptographic identity security by blending traditional Two-Factor Authentication (Email OTP) with Web3 Wallet Signatures to ensure a tamper-proof election system.

## ✨ Key Features

- **Modern Glassmorphism UI**: A breathtaking, responsive, and highly interactive user interface with dynamic background effects.
- **Dual Verification**: Voters authenticate via an emailed OTP before they are allowed to sign the transaction using their wallet.
- **Admin Danger Zone**: The contract administrator can seamlessly Halt voting, and execute a full ledger reset of the active Election entirely to spin up a new instance.
- **Strict Election Rules**: The smart contract mathematically enforces a minimum of 2 candidates to start an election, and automatically restricts the admin wallet from casting a vote.
- **Instant Winner Declarations**: Upon the election closing, the UI automatically announces the winner(s) with a dynamic trophy banner!

---

## 📂 Project Architecture

1. **`smart-contracts/`**: Hardhat environment for our Solidity smart contract, deployed on the Sepolia testnet.
2. **`backend/`**: A lightweight Node.js + Express backend that securely generates and distributes 6-digit OTP codes via Nodemailer.
3. **`frontend/`**: The core user interface built with React Router, Vite, TailwindCSS (v4), and `ethers.js` (v6).

---

## 🔑 Comprehensive `.env` Configuration Guide

To run this application locally, you must correctly configure three separate `.env` files. If these files don't exist, create them in the root of the respective folders.

### 1. Backend Environment Variables (`backend/.env`)
This controls the email service that dispatches OTPs to voters. Create `backend/.env` and fill it with your SMTP provider details (e.g., Gmail, SendGrid, Mailtrap).

If you are using Gmail, you must generate an **App Password** for your account. Go to Google Account > Security > 2-Step Verification > App passwords.

```env
# The port the backend will run on
PORT=3001

# SMTP Configuration for sending out the OTP emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587

# Your actual email address
SMTP_USER=your_email@gmail.com

# The 16-character App Password (NOT your regular password)
SMTP_PASS=xxxx_xxxx_xxxx_xxxx
```

### 2. Smart Contract Environment Variables (`smart-contracts/.env`)
This is required to deploy your custom contract to the blockchain. Create `smart-contracts/.env`.

```env
# Your RPC Endpoint URL for the Sepolia Testnet. 
# You can get a free one by making an account on Alchemy.com or Infura.io
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY

# The Private Key of the wallet you are deploying from (Must hold Sepolia test ETH)
# DO NOT wrap in quotes. NEVER share this key. NEVER use your mainnet wallet key.
PRIVATE_KEY=your_metamask_wallet_private_key_here

# Optional: Etherscan API Key to verify your code on etherscan.io
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### 3. Frontend Environment Variables (`frontend/.env`)
This connects your User Interface to both the blockchain and your backend. Create `frontend/.env`.

```env
# The deployed contract address. You will get this directly from the 
# terminal output after running the Hardhat deployment script.
VITE_CONTRACT_ADDRESS=0x232fa9FD3c2a9A84a725569978bF2F96C534ac1E

# The local or hosted URL where your NodeJS backend process is running.
VITE_BACKEND_URL=http://localhost:3001
```

---

## 🚀 Setup & Launch Instructions

### Phase 1: Launch Backend
1. Open terminal and navigate: `cd backend`
2. Install dependencies: `npm install`
3. Start the OTP Server: `npm start` (or `node server.js`)
*Ensure your backend `.env` is setup correctly before starting or errors will be thrown.*

### Phase 2: Deploy Smart Contract
1. Open a second terminal and navigate: `cd smart-contracts`
2. Install dependencies: `npm install`
3. Compile the Solidity code: `npx hardhat compile`
4. Deploy the contract: `npx hardhat run scripts/deploy.js --network sepolia`
5. *Crucial:* Take the resulting Contract Address from the deployment output and place it in your `frontend/.env` under `VITE_CONTRACT_ADDRESS`.

### Phase 3: Launch Frontend UI
1. Open a third terminal and navigate: `cd frontend`
2. Install dependencies: `npm install`
3. Launch development server: `npm run dev`
4. Visit `http://localhost:5173` in your browser.

---

## ⚙️ Administration & DApp Usage
1. Click "Enter Dashboard" and Connect your MetaMask wallet (make sure you are on the **Sepolia** network).
2. The UI will dynamically recognize the contract deployer as the **Admin** and render a purple badge.
3. **As Admin**: Navigate to the "Admin Console". Register at least exactly 2 Candidate entities, then click "Start Voting".
4. **As Voter**: Head to the Voter View. Under digital ballot, verify your email using the OTP authenticator. Once verified, select a candidate and sign the immutable Web3 transaction to cast your vote!
5. **Declaring Winner**: Admin hits "Halt Voting", which securely locks the contract and instantly triggers the massive Winner Declaration Banner across all clients dynamically.
