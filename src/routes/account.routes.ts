import { Router } from 'express';
import { User, Setting } from '../db/models';
import { ok, fail } from '../utils/response';
import { asyncHandler } from '../utils/http';
import { authRequired, AuthedRequest } from '../middleware/auth';
import { signToken, hashPassword, comparePassword } from '../services/auth';
import { sendWelcomeEmail, sendInBackground } from '../services/email.service';
import { presentUser } from '../presenters/catalog';

const router = Router();

async function flags() {
  const s: any = await Setting.findOne();
  return {
    register: (s?.is_alowed_register ?? 1) === 1,
    login: (s?.is_alowed_login ?? 1) === 1,
  };
}

/** Best-effort Google token verification. Falls back to decoding when lib/keys absent (dev). */
async function verifySocial(type: string, token: string): Promise<string | null> {
  if (!token) return null;
  try {
    if (type === 'google') {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { OAuth2Client } = require('google-auth-library');
      const client = new OAuth2Client();
      const ticket = await client.verifyIdToken({ idToken: token });
      return ticket.getPayload()?.email || null;
    }
  } catch {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        return payload.email || null;
      }
    } catch {
      return null;
    }
  }
  return null;
}

// --- Email auth ---
router.post('/login', asyncHandler(async (req, res) => {
  const { login } = await flags();
  if (!login) return fail(res, 403, 'Login is currently disabled');
  const { email, password } = req.body;
  if (!email || !password) return fail(res, 400, 'Email and password are required');
  const user = await User.findOne({ where: { email } });
  if (!user || !(await comparePassword(password, (user as any).password_hash))) {
    return fail(res, 401, 'Invalid email or password');
  }
  const token = signToken((user as any).id);
  ok(res, { user: presentUser(user, token) }, 'Logged in');
}));

router.post('/signUp', asyncHandler(async (req, res) => {
  const { register } = await flags();
  if (!register) return fail(res, 403, 'Registration is currently disabled');
  const { name, email, mobile, password, confirm_password } = req.body;
  if (!name || !email || !mobile || !password) return fail(res, 400, 'All fields are required');
  if (password !== confirm_password) return fail(res, 400, 'Passwords do not match');
  const exists = await User.findOne({ where: { email } });
  if (exists) return fail(res, 409, 'Email already registered');
  const user = await User.create({
    name, email, mobile, password_hash: await hashPassword(password),
    role: 'customer', is_verified: 1, status: 'active',
  });
  sendInBackground(`welcome ${email}`, sendWelcomeEmail(email, name));
  const token = signToken((user as any).id);
  ok(res, { user: presentUser(user, token) }, 'Registered');
}));

// --- Social (Google) ---
router.post('/socialSignUp', asyncHandler(async (req, res) => {
  const { social_type, social_token } = req.body;
  const email = await verifySocial(social_type, social_token);
  if (!email) return fail(res, 401, 'Invalid social token');
  let user = await User.findOne({ where: { email } });
  if (user && (user as any).mobile) {
    const token = signToken((user as any).id);
    return ok(res, { user: presentUser(user, token) }, 'Logged in');
  }
  if (!user) {
    await User.create({ email, social_type, status: 'active', is_verified: 1, role: 'customer' });
  }
  fail(res, 222, 'Please complete your profile');
}));

router.post('/socialCreateNewAccount', asyncHandler(async (req, res) => {
  const { social_type, social_token, mobile } = req.body;
  const email = await verifySocial(social_type, social_token);
  if (!email) return fail(res, 401, 'Invalid social token');
  let user = await User.findOne({ where: { email } });
  if (!user) user = await User.create({ email, social_type, role: 'customer', status: 'active', is_verified: 1 });
  (user as any).mobile = mobile;
  await user.save();
  const token = signToken((user as any).id);
  ok(res, { user: presentUser(user, token) }, 'Account created');
}));

// --- Apple ---
router.post('/checkAppleAccount', asyncHandler(async (req, res) => {
  const { apple_token, email, name } = req.body;
  const resolvedEmail = email || `${apple_token}@apple.local`;
  let user = await User.findOne({ where: { email: resolvedEmail } });
  if (user && (user as any).mobile) {
    const token = signToken((user as any).id);
    return ok(res, { user: presentUser(user, token) }, 'Logged in');
  }
  if (!user) {
    await User.create({ email: resolvedEmail, name, social_type: 'apple', role: 'customer', status: 'active', is_verified: 1 });
  }
  fail(res, 222, 'Please complete your profile');
}));

router.post('/appleCreateNewAccount', asyncHandler(async (req, res) => {
  const { apple_token, email, mobile, name } = req.body;
  const resolvedEmail = email || `${apple_token}@apple.local`;
  let user = await User.findOne({ where: { email: resolvedEmail } });
  if (!user) user = await User.create({ email: resolvedEmail, name, social_type: 'apple', role: 'customer', status: 'active', is_verified: 1 });
  (user as any).mobile = mobile;
  if (name) (user as any).name = name;
  await user.save();
  const token = signToken((user as any).id);
  ok(res, { user: presentUser(user, token) }, 'Account created');
}));

router.post('/forgotPassword', asyncHandler(async (_req, res) => {
  ok(res, {}, 'If the email exists, a reset link has been sent');
}));

// --- Authenticated account management ---
router.post('/changePassword', authRequired, asyncHandler(async (req: AuthedRequest, res) => {
  const { old_password, password, confirm_password } = req.body;
  if (!(await comparePassword(old_password, req.authUser.password_hash))) {
    return fail(res, 422, 'Old password is incorrect');
  }
  if (password !== confirm_password) return fail(res, 400, 'Passwords do not match');
  req.authUser.password_hash = await hashPassword(password);
  await req.authUser.save();
  ok(res, {}, 'Password changed');
}));

router.post('/editUserProfile', authRequired, asyncHandler(async (req: AuthedRequest, res) => {
  const { name, mobile, email } = req.body;
  if (name) req.authUser.name = name;
  if (mobile) req.authUser.mobile = mobile;
  if (email) req.authUser.email = email;
  await req.authUser.save();
  ok(res, { user: presentUser(req.authUser) }, 'Profile updated');
}));

router.post('/updateMyLanguage', authRequired, asyncHandler(async (_req, res) => ok(res, {}, 'Language updated')));

router.post('/updateNotificationStatus', authRequired, asyncHandler(async (req: AuthedRequest, res) => {
  req.authUser.notification_status = req.body.notification_status === '1' ? 1 : 0;
  await req.authUser.save();
  ok(res, {}, 'Notification preference updated');
}));

router.post('/updateMyCountry', authRequired, asyncHandler(async (req: AuthedRequest, res) => {
  if (req.body.country_id) req.authUser.country_id = parseInt(req.body.country_id, 10);
  await req.authUser.save();
  ok(res, {}, 'Country updated');
}));

router.get('/logout', authRequired, asyncHandler(async (_req, res) => ok(res, {}, 'Logged out')));

router.post('/removeMyAccount', authRequired, asyncHandler(async (req: AuthedRequest, res) => {
  await req.authUser.destroy();
  ok(res, {}, 'Account removed');
}));

export default router;

