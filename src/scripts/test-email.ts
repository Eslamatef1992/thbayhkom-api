import 'dotenv/config';
import { sendWelcomeEmail } from '../services/email.service';

/**
 * Sends one real welcome email through Mailgun to check the key/domain.
 *   npm run test-email -- you@example.com
 */
async function main() {
  const to = process.argv[2];
  if (!to) { console.error('Usage: npm run test-email -- <email>'); process.exit(1); }
  if (!process.env.MAILGUN_API_KEY) { console.error('MAILGUN_API_KEY is not set in .env'); process.exit(1); }
  try {
    const ok = await sendWelcomeEmail(to, 'Test');
    console.log(ok ? `Sent to ${to} via ${process.env.MAILGUN_DOMAIN || 'mg.thabayehkom.app'} - check the inbox (and spam).` : 'Not sent (invalid address?)');
  } catch (e: any) {
    console.error('Mailgun error:', e?.status || '', e?.details || e?.message || e);
    if (e?.status === 401) console.error('-> The API key is wrong, or the domain is in the EU region (set MAILGUN_EU_REGION=true).');
    if (e?.status === 403 || e?.status === 404) console.error('-> Domain not verified / not on this account, or sandbox domain with unauthorized recipient.');
    process.exit(1);
  }
}
main();
