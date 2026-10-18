import dotenv from 'dotenv';

dotenv.config();

const bool = (v: string | undefined, def = false): boolean =>
  v === undefined ? def : ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiBasePath: process.env.API_BASE_PATH || '/api',

  db: {
    dialect: (process.env.DB_DIALECT || 'sqlite') as 'sqlite' | 'postgres',
    storage: process.env.DB_STORAGE || './data/dev.sqlite',
    url: process.env.DATABASE_URL || '',
    sync: bool(process.env.DB_SYNC, true),
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '90d',
  },

  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),

  assetBaseUrl: process.env.PUBLIC_ASSET_BASE_URL || '',

  payment: {
    successUrl: process.env.PAYMENT_SUCCESS_URL || 'https://thabayehkom.com/{lang}/successpayment',
    failUrl: process.env.PAYMENT_FAIL_URL || 'https://thabayehkom.com/{lang}/failpayment',
  },

  corsOrigins: (process.env.WEB_CORS_ORIGINS || '*')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  googleClientIds: (process.env.GOOGLE_OAUTH_CLIENT_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@thabayehkom.app',
    password: process.env.ADMIN_PASSWORD || 'Admin@12345',
    name: process.env.ADMIN_NAME || 'Super Admin',
    mobile: process.env.ADMIN_MOBILE || '96500000000',
  },

  mail: {
    apiKey: process.env.MAILGUN_API_KEY || '',
    domain: process.env.MAILGUN_DOMAIN || '',
    from: process.env.MAILGUN_FROM || '',
    euRegion: bool(process.env.MAILGUN_EU_REGION, false),
  },

  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSizeMb: parseInt(process.env.UPLOAD_MAX_FILE_MB || '5', 10),
    // Public base URL used to build returned file URLs. Falls back to request host at runtime.
    publicBaseUrl: process.env.UPLOAD_PUBLIC_BASE_URL || '',
  },
};
