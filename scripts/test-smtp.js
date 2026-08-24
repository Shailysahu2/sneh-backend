#!/usr/bin/env node
require('dotenv').config();
const nodemailer = require('nodemailer');

const host = process.env.EMAIL_HOST;
const port = parseInt(process.env.EMAIL_PORT || '587', 10);
const user = process.env.EMAIL_USER;
const pass = process.env.EMAIL_PASS;
const admin = process.env.ADMIN_EMAIL;

if (!host || !admin) {
  console.error('EMAIL_HOST or ADMIN_EMAIL not set in environment.');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  auth: user
    ? {
        user,
        pass
      }
    : undefined,
  tls: { rejectUnauthorized: false },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 20000
});

console.log('Transport options:', { host, port, secure: port === 465, user: user ? user : '(none)' });

transporter
  .verify()
  .then(() => {
    console.log('SMTP transporter verified and ready');
    const mailOptions = {
      from: user || 'no-reply@localhost',
      to: admin,
      subject: 'sneh-backend SMTP test',
      text: `This is a test email from sneh-backend at ${new Date().toISOString()}`
    };
    return transporter.sendMail(mailOptions);
  })
  .then(info => {
    console.log('Test email sent:', info && info.messageId);
    process.exit(0);
  })
  .catch(err => {
    console.error('SMTP verification/send failed:', err);
    process.exit(2);
  });
