/**
 * Seeds (creates or updates) an admin user in MongoDB.
 *
 * Usage:
 *   node scripts/seed-admin.js "admin@example.com" "YourPassword"
 *
 * Requires:
 *   - MONGO_URI in .env
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/adminmodal');

async function main() {
  const emailArg = process.argv[2];
  const passwordArg = process.argv[3];

  if (!emailArg || !passwordArg) {
    console.error('Usage: node scripts/seed-admin.js "admin@example.com" "YourPassword"');
    process.exit(1);
  }

  const email = String(emailArg).trim().toLowerCase();
  const password = String(passwordArg);

  if (!process.env.MONGO_URI) {
    console.error('Missing MONGO_URI in environment.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  const existing = await Admin.findOne({ email });
  if (existing) {
    existing.password = password; // pre-save hook will hash
    await existing.save();
    console.log(`Updated admin password for ${email}`);
  } else {
    await Admin.create({ email, password }); // pre-save hook will hash
    console.log(`Created admin ${email}`);
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});

