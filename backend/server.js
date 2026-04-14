require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// In-memory store for OTPs
// Structure: { email: { otp: '123456', expiresAt: 1234567890 } }
const otpStore = {};

// Temporary transporter (Mailtrap or similar for demo)
// User will provide credentials in .env
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

app.post('/api/send-otp', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins

    otpStore[email] = { otp, expiresAt };

    try {
        await transporter.sendMail({
            from: process.env.SMTP_USER || '"Voting DApp" <noreply@votingdapp.com>',
            to: email,
            subject: 'Your Voting OTP',
            text: `Your OTP for casting vote is: ${otp}. It is valid for 5 minutes.`,
        });
        res.json({ success: true, message: 'OTP sent successfully' });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ success: false, message: 'Failed to send OTP' });
    }
});

app.post('/api/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) {
        return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    const record = otpStore[email];
    if (!record) {
        return res.status(400).json({ success: false, message: 'OTP not requested or expired' });
    }

    if (Date.now() > record.expiresAt) {
        delete otpStore[email];
        return res.status(400).json({ success: false, message: 'OTP has expired' });
    }

    if (record.otp !== otp) {
        return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    // Mark as verified and remove to prevent reuse
    delete otpStore[email];
    res.json({ success: true, message: 'OTP verified successfully' });
});

app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});
