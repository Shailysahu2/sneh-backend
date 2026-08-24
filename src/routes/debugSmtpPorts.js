const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

const DEFAULT_PORTS = [587, 465, 2525];
const TIMEOUT_MS = 8000;

function verifyWithTimeout(transporter, timeoutMs) {
  return Promise.race([
    transporter.verify(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs))
  ]);
}

router.get('/', async (req, res) => {
  const portsParam = req.query.ports;
  const ports = portsParam ? portsParam.split(',').map(p => parseInt(p, 10)).filter(Boolean) : DEFAULT_PORTS;
  const host = process.env.EMAIL_HOST;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !user || !pass) {
    return res.status(500).json({ error: 'Missing EMAIL_HOST/EMAIL_USER/EMAIL_PASS in env' });
  }

  const results = [];

  await Promise.all(ports.map(async (port) => {
    const secure = port === 465;
    const options = {
      host,
      port,
      secure,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
      connectionTimeout: TIMEOUT_MS,
      greetingTimeout: TIMEOUT_MS,
      socketTimeout: TIMEOUT_MS,
    };

    const transporter = nodemailer.createTransport(options);
    try {
      await verifyWithTimeout(transporter, TIMEOUT_MS);
      results.push({ port, ok: true, details: 'verified' });
    } catch (err) {
      results.push({ port, ok: false, error: err && err.message ? err.message : String(err) });
    }
  }));

  res.json({ host, results });
});

module.exports = router;
