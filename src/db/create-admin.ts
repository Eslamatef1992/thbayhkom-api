import { sequelize } from './sequelize';
import { hashPassword } from '../services/auth';
import { User, Role, UserRole } from './models';

/**
 * Create or reset an admin login without touching anything else (unlike `seed`).
 * Handy after importing a production dump locally.
 *   npm run create-admin -- you@teknulugy.com 'StrongPass123' "Your Name"
 */
async function main() {
  const [email, password, name = 'Admin'] = process.argv.slice(2);
  if (!email || !password || password.length < 8) {
    console.error('Usage: npm run create-admin -- <email> <password (8+ chars)> [name]');
    process.exit(1);
  }
  await sequelize.authenticate();
  let user: any = await User.findOne({ where: { email } });
  const password_hash = await hashPassword(password);
  if (user) await user.update({ password_hash, role: 'admin', is_admin: true, status: 'active' });
  else user = await User.create({ email, name, password_hash, role: 'admin', is_admin: true, status: 'active', is_verified: 1 });
  const role: any = await Role.findOne({ where: { name: 'admin' } });
  if (role) await UserRole.findOrCreate({ where: { user_id: user.id, role_id: role.id } });
  console.log(`Admin ready: ${email}`);
  await sequelize.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
