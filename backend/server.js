require('dotenv').config();
const express = require('express');
const cors = require('cors');
const twilio = require('twilio');
const { ethers } = require('ethers');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// --- Twilio SMS Client ---
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER;

// --- Ethereum Signer (signs vote authorizations after OTP verification) ---
const backendSigner = new ethers.Wallet(process.env.BACKEND_SIGNER_PRIVATE_KEY);

// --- In-memory OTP Store ---
// Structure: { phoneNumber: { otp: '123456', expiresAt: timestamp } }
const otpStore = {};

// ========================
//   SEND OTP via Twilio
// ========================
app.post('/api/send-otp', async (req, res) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) {
    return res.status(400).json({ success: false, message: 'Phone number is required' });
  }

  // Basic validation: must start with + and have at least 10 digits
  const phoneRegex = /^\+[1-9]\d{9,14}$/;
  if (!phoneRegex.test(phoneNumber)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid phone number format. Use international format like +919876543210'
    });
  }

  // Rate limiting: prevent spam (1 OTP per phone per 60 seconds)
  const existing = otpStore[phoneNumber];
  if (existing && (Date.now() - (existing.expiresAt - 5 * 60 * 1000)) < 60 * 1000) {
    return res.status(429).json({
      success: false,
      message: 'Please wait 60 seconds before requesting another OTP'
    });
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  otpStore[phoneNumber] = { otp, expiresAt };

  try {
    await twilioClient.messages.create({
      body: `Your TrustVote verification code is: ${otp}. Valid for 5 minutes. Do not share this code with anyone.`,
      from: TWILIO_PHONE,
      to: phoneNumber
    });

    console.log(`[OTP] Sent to ${phoneNumber.substring(0, 5)}***`);
    res.json({ success: true, message: 'OTP sent successfully via SMS' });
  } catch (error) {
    console.error('[OTP] Twilio error:', error.message);
    delete otpStore[phoneNumber];
    res.status(500).json({
      success: false,
      message: `Failed to send SMS: ${error.message}`
    });
  }
});

// ==========================================
//   VERIFY OTP + SIGN VOTE AUTHORIZATION
// ==========================================
app.post('/api/verify-and-sign', async (req, res) => {
  const { phoneNumber, otp, candidateId, electionId } = req.body;

  if (!phoneNumber || !otp || candidateId === undefined || !electionId) {
    return res.status(400).json({
      success: false,
      message: 'phoneNumber, otp, candidateId, and electionId are all required'
    });
  }

  const record = otpStore[phoneNumber];
  if (!record) {
    return res.status(400).json({
      success: false,
      message: 'OTP not requested or already used. Please send a new OTP.'
    });
  }

  if (Date.now() > record.expiresAt) {
    delete otpStore[phoneNumber];
    return res.status(400).json({
      success: false,
      message: 'OTP has expired. Please request a new one.'
    });
  }

  if (record.otp !== otp) {
    return res.status(400).json({ success: false, message: 'Invalid OTP code' });
  }

  // OTP verified! Delete it to prevent reuse
  delete otpStore[phoneNumber];

  try {
    // Create phone hash (matches what the smart contract expects)
    const phoneHash = ethers.keccak256(ethers.toUtf8Bytes(phoneNumber));

    // Create the message hash: must match the contract's keccak256(abi.encodePacked(...))
    const messageHash = ethers.solidityPackedKeccak256(
      ['bytes32', 'uint256', 'uint256'],
      [phoneHash, candidateId, electionId]
    );

    // Sign the hash (signMessage auto-prepends "\x19Ethereum Signed Message:\n32")
    const signature = await backendSigner.signMessage(ethers.getBytes(messageHash));

    console.log(`[VOTE] Authorization signed for phone hash ${phoneHash.substring(0, 10)}...`);

    res.json({
      success: true,
      message: 'OTP verified! Vote authorization signed.',
      phoneHash,
      signature
    });
  } catch (error) {
    console.error('[SIGN] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to create vote authorization' });
  }
});

// ========================
//   HEALTH CHECK
// ========================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    signerAddress: backendSigner.address
  });
});

// ========================
//   START SERVER
// ========================
app.listen(PORT, () => {
  console.log(`\n🗳️  TrustVote Backend running on http://localhost:${PORT}`);
  console.log(`🔑 Backend Signer Address: ${backendSigner.address}`);
  console.log(`📱 Twilio Phone: ${TWILIO_PHONE}`);
  console.log(`\n⚠️  Use the signer address above when deploying the Voting contract!\n`);
});
