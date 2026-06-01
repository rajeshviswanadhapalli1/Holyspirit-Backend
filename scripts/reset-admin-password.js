/**
 * Generates a bcrypt hash for the admin password.
 * Use this when you've forgotten the admin password.
 *
 * Usage: node scripts/reset-admin-password.js "YourNewPassword"
 *
 * Then update ADMIN_PASSWORD in your .env file with the generated hash.
 */

const bcrypt = require('bcrypt');

const newPassword = process.argv[2];

if (!newPassword) {
  console.error('Usage: node scripts/reset-admin-password.js "YourNewPassword"');
  console.error('Example: node scripts/reset-admin-password.js "MySecurePassword123"');
  process.exit(1);
}

async function generateHash() {
  const saltRounds = 10;
  const hash = await bcrypt.hash(newPassword, saltRounds);
  console.log('\n=== Admin Password Reset ===\n');
  console.log('Copy this hash and set it as ADMIN_PASSWORD in your .env file:\n');
  console.log(hash);
  console.log('\n================================\n');
}

generateHash().catch(console.error);
