# 🗳️ TrustVote — Decentralized Voting DApp

TrustVote is a secure, transparent decentralized voting application built on the **Ethereum Sepolia testnet**. It combines **Phone OTP verification** (via Twilio SMS) with **on-chain ECDSA signature validation** to deliver a tamper-proof, Sybil-resistant election system — ensuring each phone number can only vote once per election.

---

## ✨ Key Features

- **Phone OTP Authentication** — Voters verify their identity with a 6-digit SMS code sent via Twilio before casting a vote.
- **On-Chain Signature Verification** — The backend signs a vote authorization after OTP verification; the smart contract verifies the ECDSA signature on-chain before accepting the vote.
- **Privacy-Preserving** — Only a `keccak256` hash of the phone number is stored on-chain. No raw personal data is ever written to the blockchain.
- **Modern Glassmorphism UI** — A polished, responsive React interface with dynamic gradients, micro-animations, and dark-mode aesthetics.
- **Admin Danger Zone** — The contract administrator can halt voting, reset the entire election to start fresh, and manage candidates from a dedicated admin console.
- **Strict Election Rules** — The smart contract enforces a minimum of 2 candidates to start an election and prohibits the admin wallet from casting a vote.
- **Instant Winner Declaration** — When voting is closed, the UI automatically announces the winner(s) with a dynamic trophy banner.

---

## 📂 Project Structure

```
TrustVote/
├── backend/            # Node.js + Express — Twilio OTP + ECDSA vote signing
├── frontend/           # React + Vite + TailwindCSS v4 + ethers.js v6
├── smart-contracts/    # Solidity + Hardhat (Sepolia testnet)
├── .gitignore
└── README.md
```

| Layer | Tech Stack |
|---|---|
| **Smart Contract** | Solidity `0.8.27`, OpenZeppelin ECDSA, Hardhat |
| **Backend** | Node.js, Express, Twilio SDK, ethers.js v6 |
| **Frontend** | React 19, Vite, TailwindCSS v4, React Router v7, Lucide Icons, ethers.js v6 |
| **Network** | Ethereum Sepolia Testnet |

---

## 🔐 How Voting Works

```
┌──────────┐     OTP Request     ┌──────────┐     SMS OTP      ┌──────────┐
│  Voter   │ ──────────────────► │ Backend  │ ───────────────► │  Twilio  │
│ (React)  │                     │(Express) │                  │   SMS    │
│          │ ◄────────────────── │          │ ◄─────────────── │          │
│          │     OTP Verified    │          │                  └──────────┘
│          │   + ECDSA Signature │          │
│          │                     └──────────┘
│          │    castVote(id, phoneHash, sig)
│          │ ──────────────────────────────────────────► ┌──────────────┐
│          │                                             │Smart Contract│
│          │                                             │  (Sepolia)   │
│          │     ◄────────────────────────────────────── │  ✅ Verified │
└──────────┘            Vote Recorded On-Chain           └──────────────┘
```

1. Voter enters their phone number → Backend sends a 6-digit OTP via Twilio SMS.
2. Voter submits the OTP + selected candidate → Backend verifies OTP, then signs `(phoneHash, candidateId, electionId)` with its ECDSA private key.
3. Voter's wallet submits the signed payload to the smart contract → Contract recovers the signer, verifies it matches the trusted `backendSigner`, and records the vote.

---

## 🔑 Environment Variables

Each subdirectory requires its own `.env` file. **Template `.env.example` files** are included in each folder — copy and fill them in.

> **⚠️ All `.env` files are gitignored. Only `.env.example` files are tracked. Never commit real keys.**

### 1. Backend — `backend/.env`

Get your Twilio credentials from [console.twilio.com](https://console.twilio.com).

```env
# Twilio SMS Credentials
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1your_twilio_phone_number

# Ethereum Signer (create a NEW MetaMask account — NOT your admin wallet)
# Export its private key and paste here
BACKEND_SIGNER_PRIVATE_KEY=your_signer_wallet_private_key

# Server
PORT=3001
```

### 2. Smart Contracts — `smart-contracts/.env`

You need a Sepolia RPC endpoint (free from [Alchemy](https://alchemy.com) or [Infura](https://infura.io)) and your deployer wallet's private key (must hold Sepolia test ETH).

```env
# RPC endpoint for Sepolia
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY

# Deployer wallet private key (must hold Sepolia ETH — NEVER use mainnet key)
PRIVATE_KEY=your_deployer_wallet_private_key

# Etherscan API key (optional — for contract verification)
ETHERSCAN_API_KEY=your_etherscan_api_key

# Backend signer address (the PUBLIC address of the signer wallet from backend/.env)
# Run the backend first to see this address printed in the console
BACKEND_SIGNER_ADDRESS=0xYourBackendSignerPublicAddress
```

### 3. Frontend — `frontend/.env`

```env
# Deployed contract address (from Hardhat deploy output)
VITE_CONTRACT_ADDRESS=0xYourDeployedContractAddress

# Backend URL
VITE_BACKEND_URL=http://localhost:3001
```

---

## 🚀 Setup & Launch Instructions

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [MetaMask](https://metamask.io/) browser extension (connected to Sepolia)
- A [Twilio](https://www.twilio.com/) account with an SMS-capable phone number
- Sepolia test ETH (get from a [faucet](https://sepoliafaucet.com/))

### Phase 1: Start the Backend

```bash
cd backend
npm install
node server.js
```

> 📋 On startup, the console will print the **Backend Signer Address** — copy this for the next step.

### Phase 2: Deploy the Smart Contract

```bash
cd smart-contracts
npm install

# Add the backend signer address to smart-contracts/.env
# BACKEND_SIGNER_ADDRESS=0x... (from Phase 1 console output)

npx hardhat compile
npx hardhat run scripts/deploy.js --network sepolia
```

> 📋 Copy the deployed **Voting contract address** from the output and paste it into `frontend/.env` as `VITE_CONTRACT_ADDRESS`.

### Phase 3: Launch the Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## ⚙️ Usage Guide

### Admin Flow
1. Open the app and connect your **deployer wallet** via MetaMask (Sepolia network).
2. The UI will detect you as the **Admin** and display a purple badge.
3. Navigate to the **Admin Console** → add at least 2 candidates → click **Start Voting**.
4. When the election is done, click **Halt Voting** to lock the contract and reveal the winner.
5. Use **Reset Election** to clear all candidates and votes for a fresh round.

### Voter Flow
1. Connect any MetaMask wallet (different from admin) on Sepolia.
2. Enter your phone number and click **Send OTP** — you'll receive a 6-digit code via SMS.
3. Enter the OTP, select your candidate, and click **Cast Vote**.
4. Confirm the MetaMask transaction — your vote is recorded immutably on-chain.

---

## 🛡️ Security Model

| Layer | Protection |
|---|---|
| **Sybil Resistance** | Each phone number can only vote once per election (enforced on-chain via `keccak256` phone hash) |
| **Vote Authorization** | Backend ECDSA signature required — only issued after valid OTP verification |
| **On-Chain Verification** | Smart contract recovers the signer from the signature and rejects any vote not signed by the trusted backend |
| **Admin Separation** | Admin wallet is blocked from voting by a `notAdmin` modifier |
| **Privacy** | No raw phone numbers stored on-chain — only their keccak256 hashes |
| **OTP Security** | Rate-limited (1 per 60s), expires after 5 minutes, single-use |

---

## 📄 License

MIT
