const nodemailer = require("nodemailer");
const { getEnv } = require("../config/env");
const { getLogger } = require("./logger");

let transport;
// Captured messages in the test environment, for assertions.
const outbox = [];

function getTransport() {
  const env = getEnv();
  if (!env.SMTP_URL) return null;
  if (!transport) transport = nodemailer.createTransport(env.SMTP_URL);
  return transport;
}

// Sends an email when SMTP is configured. Without SMTP, development logs the
// message so the flow can be exercised locally; production logs a warning and
// sends nothing (secrets such as reset tokens are never logged in production).
async function sendMail({ to, subject, text }) {
  const env = getEnv();
  if (env.isTest) {
    outbox.push({ to, subject, text });
    return { delivered: true };
  }
  const t = getTransport();
  if (t) {
    await t.sendMail({ from: env.MAIL_FROM, to, subject, text });
    return { delivered: true };
  }
  if (env.isProduction) {
    getLogger().warn({ subject }, "SMTP_URL not configured; email not sent");
    return { delivered: false };
  }
  getLogger().info({ to, subject, text }, "Email (development log driver, not sent)");
  return { delivered: false };
}

module.exports = { sendMail, outbox };
