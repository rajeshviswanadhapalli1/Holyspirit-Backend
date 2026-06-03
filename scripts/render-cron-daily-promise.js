/**
 * Render Cron Job script — calls the web service to send daily promise WhatsApp.
 * Runs on schedule (see render.yaml): 30 18 * * * UTC = 12:00 AM IST.
 *
 * Required env:
 *   RENDER_SERVICE_URL — e.g. https://holyspirit-backend.onrender.com
 *   CRON_SECRET          — same secret as web service
 */

require('dotenv').config();

const https = require('https');
const http = require('http');

const baseUrl = (process.env.RENDER_SERVICE_URL || process.env.API_BASE_URL || '').replace(/\/$/, '');
const secret = process.env.CRON_SECRET;

if (!baseUrl) {
  console.error('Missing RENDER_SERVICE_URL (your Render web service URL)');
  process.exit(1);
}
if (!secret) {
  console.error('Missing CRON_SECRET');
  process.exit(1);
}

const url = new URL(`${baseUrl}/api/promises/cron/daily-broadcast`);
const client = url.protocol === 'https:' ? https : http;

const req = client.request(
  url,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-cron-secret': secret,
    },
  },
  (res) => {
    let body = '';
    res.on('data', (chunk) => {
      body += chunk;
    });
    res.on('end', () => {
      console.log(`Status: ${res.statusCode}`);
      console.log(body);
      process.exit(res.statusCode >= 200 && res.statusCode < 300 ? 0 : 1);
    });
  }
);

req.on('error', (err) => {
  console.error('Cron request failed:', err.message);
  process.exit(1);
});

req.end();
