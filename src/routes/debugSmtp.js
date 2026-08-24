const express = require('express');
const nodemailer = require('nodemailer');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const host = process.env.EMAIL_HOST;
    const port = parseInt(process.env.EMAIL_PORT || '587', 10);
    const user = process.env.EMAIL_USER;
    const admin = process.env.ADMIN_EMAIL;

    console.log('Debug SMTP endpoint called. Env sample:', { host, port, user: user ? user : '(none)', admin: !!admin });

    if (!host || !admin) {
      console.error('EMAIL_HOST or ADMIN_EMAIL not configured for debug endpoint');
      return res.status(500).json({ error: 'EMAIL_HOST or ADMIN_EMAIL not configured' });
    }

    const transporterOptions = {
      host,
      port,
      secure: port === 465,
      auth: user
        ? {
            user,
            pass: process.env.EMAIL_PASS
          }
        : undefined,
      tls: { rejectUnauthorized: false },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 20000
    };

    console.log('Creating transporter with options (masked):', {
      host: transporterOptions.host,
      port: transporterOptions.port,
      secure: transporterOptions.secure,
      auth: transporterOptions.auth ? { user: transporterOptions.auth.user, pass: '***' } : undefined
    });

    const transporter = nodemailer.createTransport(transporterOptions);

    try {
      await transporter.verify();
      console.log('SMTP transporter verified and ready (debug-endpoint)');
    } catch (verifyErr) {
      console.error('SMTP transporter verification failed (debug-endpoint):', verifyErr && verifyErr.stack ? verifyErr.stack : verifyErr);
      return res.status(500).json({ error: 'SMTP verification failed', details: verifyErr && verifyErr.message ? verifyErr.message : String(verifyErr) });
    }

    const mailOptions = {
      from: user || `no-reply@${req.hostname}`,
      to: admin,
      subject: 'sneh-backend Debug SMTP Test',
      text: `Debug SMTP test triggered at ${new Date().toISOString()} from host ${req.hostname}`
    };

    console.log('Sending debug email to', admin);

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('Debug email sent:', info && info.messageId, info);
      return res.json({ ok: true, messageId: info && info.messageId });
    } catch (sendErr) {
      console.error('Failed to send debug email (debug-endpoint):', sendErr && sendErr.stack ? sendErr.stack : sendErr);
      return res.status(500).json({ error: 'Send failed', details: sendErr && sendErr.message ? sendErr.message : String(sendErr) });
    }
  } catch (err) {
    console.error('Unexpected error in debug-smtp route:', err && err.stack ? err.stack : err);
    res.status(500).json({ error: 'Unexpected error', details: err && err.message ? err.message : String(err) });
  }
});

module.exports = router;
