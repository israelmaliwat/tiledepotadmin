require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const otpStore = new Map();

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function makeTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

app.post('/api/send-otp', async (req, res) => {
  const { email } = req.body || {};

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ message: 'Invalid email address.' });
  }

  const code = generateOtp();
  const expiresAt = Date.now() + 5 * 60 * 1000;
  otpStore.set(email.toLowerCase(), { code, expiresAt });

  const transporter = makeTransporter();

  if (!transporter) {
    return res.status(500).json({ message: 'SMTP is not configured.' });
  }

  try {
    const html = `
      <div style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
        <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e2e2;border-radius:12px;overflow:hidden;">
          <div style="background:#0f172a;padding:22px 28px;">
            <div style="font-size:24px;font-weight:700;letter-spacing:1px;color:#ffffff;">Tile Depot</div>
            <div style="font-size:12px;letter-spacing:2px;color:#dbeafe;margin-top:6px;text-transform:uppercase;">Discount Center</div>
          </div>

          <div style="padding:32px 28px 20px;">
            <p style="margin:0 0 16px;font-size:18px;color:#1f2937;">Hello,</p>
            <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#374151;">
              Your verification code for Tile Depot is below. Use it to complete your sign-in securely.
            </p>

            <div style="text-align:center;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:24px 20px;margin:22px 0;">
              <div style="font-size:12px;letter-spacing:2px;color:#64748b;text-transform:uppercase;margin-bottom:12px;">Your OTP</div>
              <div style="font-size:36px;letter-spacing:8px;font-weight:700;color:#0f172a;">${code}</div>
            </div>

            <p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:#4b5563;">
              This code expires in 5 minutes. Do not share it with anyone.
            </p>
          </div>

          <div style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:18px 28px;text-align:center;">
            <div style="font-size:12px;color:#64748b;">
              © 2025 Tile Depot Discount Center
            </div>
          </div>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: 'Tile Depot OTP Verification',
      text: `Your Tile Depot verification code is: ${code}. It expires in 5 minutes.`,
      html,
    });

    return res.json({ message: 'OTP sent successfully.' });
  } catch (error) {
    console.error('Email send failed:', error);
    return res.status(500).json({
      message: 'Failed to send OTP email. Check your Gmail App Password and SMTP settings.',
    });
  }
});

app.post('/api/verify-otp', (req, res) => {
  const { email, code } = req.body || {};

  if (!email || !code) {
    return res.status(400).json({ message: 'Email and code are required.' });
  }

  const key = email.toLowerCase();
  const stored = otpStore.get(key);

  if (!stored) {
    return res.status(400).json({ message: 'No OTP found for this email.' });
  }

  if (Date.now() > stored.expiresAt) {
    otpStore.delete(key);
    return res.status(400).json({ message: 'OTP expired.' });
  }

  if (String(code).trim() !== String(stored.code)) {
    return res.status(400).json({ message: 'Invalid OTP.' });
  }

  otpStore.delete(key);
  return res.json({ message: 'OTP verified successfully.' });
});

app.listen(PORT, () => {
  console.log(`OTP server running on http://localhost:${PORT}`);
});
