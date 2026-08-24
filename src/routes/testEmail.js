const express = require('express');
const nodemailer = require('nodemailer');

const router = express.Router();

// GET /api/test-email --> send a test email to ADMIN_EMAIL
router.get('/', async (req, res) => {
  try {
    if (!process.env.EMAIL_HOST || !process.env.ADMIN_EMAIL) {
      return res.status(400).json({ error: 'EMAIL_HOST or ADMIN_EMAIL not configured in .env' });
    }

    const port = parseInt(process.env.EMAIL_PORT || '587', 10);
    const isSecure = port === 465;
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port,
      secure: isSecure,
      auth: process.env.EMAIL_USER ? {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      } : undefined,
      tls: { rejectUnauthorized: false }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER || `no-reply@${req.hostname}`,
      to: process.env.ADMIN_EMAIL,
      subject: 'Test email from Sneh backend',
      text: `This is a test email sent at ${new Date().toISOString()}`
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      return res.json({ ok: true, messageId: info.messageId, info });
    } catch (err) {
      console.error('Test email send failed:', err);
      return res.status(500).json({ ok: false, error: err.message || err.toString() });
    }
  } catch (err) {
    console.error('Test email endpoint error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
