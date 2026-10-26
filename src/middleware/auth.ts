import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { User } from '../db/models';
import { fail } from '../utils/response';
import { runWithLang } from '../utils/requestContext';

export interface AuthedRequest extends Request {
  ctx?: { fcmToken?: string; countryId?: string; lang: 'en' | 'ar' };
  authUser?: any;
}

/** Reads custom headers the Flutter app sends into req.ctx. */
export function contextMiddleware(req: AuthedRequest, _res: Response, next: NextFunction): void {
  const lang = (req.header('Accept-Language') || 'en').toLowerCase().startsWith('ar') ? 'ar' : 'en';
  req.ctx = {
    fcmToken: (req.header('fcmToken') || (req.query.fcmToken as string) || (req.body?.fcmToken as string)) as string,
    countryId: req.header('countryId') as string,
    lang,
  };
  runWithLang(lang, () => next());
}

function extractToken(req: Request): string | null {
  const h = req.header('Authorization') || '';
  if (h.startsWith('Bearer ')) {
    const t = h.slice(7).trim();
    return t.length ? t : null;
  }
  return null;
}

async function loadUser(token: string): Promise<any | null> {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as any;
    const user = await User.findByPk(decoded.sub);
    return user || null;
  } catch {
    return null;
  }
}

/** Rejects the request (envelope code 401) when no valid token is present. */
export async function authRequired(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  const token = extractToken(req);
  if (!token) return fail(res, 401, 'Unauthenticated');
  const user = await loadUser(token);
  if (!user) return fail(res, 401, 'Unauthenticated');
  req.authUser = user;
  next();
}

/** Attaches user if a valid token exists, otherwise continues as guest. */
export async function authOptional(req: AuthedRequest, _res: Response, next: NextFunction): Promise<void> {
  const token = extractToken(req);
  if (token) {
    const user = await loadUser(token);
    if (user) req.authUser = user;
  }
  next();
}
