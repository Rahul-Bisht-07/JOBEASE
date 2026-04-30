const nodemailer = require('nodemailer');

const getTransportConfig = () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  if (!user || !pass) {
    throw new Error(
      'SMTP credentials are not configured. Set SMTP_USER/SMTP_PASS or EMAIL_USER/EMAIL_PASS.',
    );
  }

  return {
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  };
};

let cachedTransporter;

const getTransporter = () => {
  if (cachedTransporter) return cachedTransporter;
  cachedTransporter = nodemailer.createTransport(getTransportConfig());
  return cachedTransporter;
};

const sendEmail = async ({ to, subject, text, html }) => {
  const from =
    process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.EMAIL_USER;

  if (!from) {
    throw new Error('No FROM email configured. Set SMTP_FROM or EMAIL_FROM.');
  }

  const transporter = getTransporter();

  return transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
};

module.exports = sendEmail;
