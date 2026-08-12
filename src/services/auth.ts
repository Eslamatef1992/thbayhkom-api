import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config';

export function signToken(userId: number): string {
  return jwt.sign({ sub: userId }, config.jwt.secret, { expiresIn: config.jwt.expiresIn } as any);
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, config.bcryptRounds);
}

export function comparePassword(plain: string, hash?: string | null): Promise<boolean> {
  if (!hash) return Promise.resolve(false);
  return bcrypt.compare(plain, hash);
}
