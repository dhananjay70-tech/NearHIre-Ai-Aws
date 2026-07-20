/**
 * createAdmin.js — Bootstrap the first admin account.
 *
 * Public registration can never create an admin, and the admin-only endpoint
 * needs an existing admin — so the very first one is seeded here.
 *
 * Usage:
 *   node src/database/createAdmin.js <email> <password> [name]
 *
 * If the user already exists they are promoted to admin instead.
 */

import bcrypt from 'bcrypt';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import * as userRepo from '../repositories/userRepository.js';
import { ROLES } from '../utils/roles.js';

const SALT_ROUNDS = 12;

async function main() {
  const [emailArg, passwordArg, ...nameParts] = process.argv.slice(2);

  if (!emailArg || !passwordArg) {
    console.error('\nUsage: node src/database/createAdmin.js <email> <password> [name]\n');
    process.exit(1);
  }

  const email = emailArg.toLowerCase().trim();
  const name = nameParts.join(' ').trim() || 'Administrator';

  if (passwordArg.length < 8) {
    console.error('❌  Password must be at least 8 characters.');
    process.exit(1);
  }

  const existing = await userRepo.findByEmail(email);

  if (existing) {
    await db
      .update(users)
      .set({ role: ROLES.ADMIN, updatedAt: new Date() })
      .where(eq(users.id, existing.id));

    console.log(`✅  Existing user ${email} promoted to admin.`);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(passwordArg, SALT_ROUNDS);

  const user = await userRepo.createUser({
    name,
    email,
    password_hash: passwordHash,
    role: ROLES.ADMIN,
  });

  await userRepo.createPreferences(user.id);

  console.log(`✅  Admin account created: ${email}`);
  process.exit(0);
}

main().catch((error) => {
  console.error('❌  Failed to create admin:', error.message);
  process.exit(1);
});
