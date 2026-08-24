const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

const DEFAULT_PORTS = [587, 465, 2525];
const VERIFY_TIMEOUT = 8000;

function verifyWithTimeout(transporter, timeoutMs) {
  return Promise.race([
    transporter.verify(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('verify timeout')), timeoutMs))
  ]);
}

async function trySmtpPorts(host, user, pass, ports, admin, req) {
  const results = [];
  for (const port of ports) {
    const secure = port === 465;
    const opts = {
      host,
      port,
      secure,
      auth: user ? { user, pass } : undefined,
      tls: { rejectUnauthorized: false },
      connectionTimeout: VERIFY_TIMEOUT,
      greetingTimeout: VERIFY_TIMEOUT,
      socketTimeout: VERIFY_TIMEOUT * 2
    };

    const masked = { host: opts.host, port: opts.port, secure: opts.secure, auth: opts.auth ? { user: opts.auth.user, pass: '***' } : undefined };
    console.log('Probing SMTP port with options (masked):', masked);

    const transporter = nodemailer.createTransport(opts);
    try {
      await verifyWithTimeout(transporter, VERIFY_TIMEOUT);
      console.log(`Verified SMTP on port ${port}`);

      const mailOptions = {
        from: user || `no-reply@${req.hostname}`,
        to: admin,
        subject: `sneh-backend SMTP probe (${port})`,
        text: `SMTP probe from ${req.hostname} at ${new Date().toISOString()} using port ${port}`
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`Sent probe email via port ${port}:`, info && info.messageId);
      results.push({ port, ok: true, method: 'smtp', messageId: info && info.messageId });
      return { success: true, results };
    } catch (err) {
      console.error(`Port ${port} failed:`, err && err.message ? err.message : err);
      results.push({ port, ok: false, error: err && err.message ? err.message : String(err) });
    }
  }
  return { success: false, results };
}

async function trySendGrid(sendgridKey, admin, req) {
  try {
    const payload = {
      personalizations: [{ to: [{ email: admin }] }],
      from: { email: process.env.EMAIL_USER || `no-reply@${req.hostname}` },
      subject: 'sneh-backend SendGrid fallback test',
      content: [{ type: 'text/plain', value: `SendGrid test at ${new Date().toISOString()}` }]
    };

    const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sendgridKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (resp.ok) {
      console.log('SendGrid fallback email accepted (202)');
      return { ok: true, method: 'sendgrid' };
    }

    const text = await resp.text();
    console.error('SendGrid returned error:', resp.status, text);
    return { ok: false, method: 'sendgrid', status: resp.status, details: text };
  } catch (err) {
    console.error('SendGrid fallback error:', err && err.message ? err.message : err);
    return { ok: false, method: 'sendgrid', error: err && err.message ? err.message : String(err) };
  }
}

router.get('/', async (req, res) => {
  try {
    const host = process.env.EMAIL_HOST;
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;
    const admin = process.env.ADMIN_EMAIL;

    console.log('Debug SMTP endpoint called. Env sample:', { host, user: user ? user : '(none)', admin: !!admin });

    if (!host || !admin) {
      return res.status(500).json({ error: 'Missing EMAIL_HOST or ADMIN_EMAIL in env' });
    }

    const portsQuery = req.query.ports;
    const ports = portsQuery ? portsQuery.split(',').map(p => parseInt(p, 10)).filter(Boolean) : DEFAULT_PORTS;

    const smtpResult = await trySmtpPorts(host, user, pass, ports, admin, req);
    if (smtpResult.success) return res.json({ ok: true, via: 'smtp', details: smtpResult.results });

    const sendgridKey = process.env.SENDGRID_API_KEY;
    if (sendgridKey) {
      const sg = await trySendGrid(sendgridKey, admin, req);
      if (sg.ok) return res.json({ ok: true, via: 'sendgrid', details: sg });
      return res.status(500).json({ error: 'All SMTP ports failed and SendGrid also failed', smtp: smtpResult.results, sendgrid: sg });
    }

    return res.status(500).json({ error: 'All SMTP ports failed', smtp: smtpResult.results, note: 'If deployed host blocks SMTP, consider using SendGrid or another transactional provider.' });
  } catch (err) {
    console.error('Unexpected error in debug-smtp route:', err && err.stack ? err.stack : err);
    return res.status(500).json({ error: 'Unexpected error', details: err && err.message ? err.message : String(err) });
  }
});

module.exports = router;
