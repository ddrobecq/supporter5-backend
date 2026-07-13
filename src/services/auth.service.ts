import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppError, JwtPayload } from '../types';

function env(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing env variable: ${key}`);
  return val;
}

export function login(username: string, password: string): string {
  const adminUser = env('ADMIN_USERNAME');
  const adminHash = env('ADMIN_PASSWORD_HASH');
  const secret    = env('JWT_SECRET');
  const expiresIn = process.env.JWT_EXPIRES_IN ?? '8h';

  if (username !== adminUser) {
    throw new AppError(401, 'Invalid credentials');
  }

  const valid = bcrypt.compareSync(password, adminHash);
  if (!valid) {
    throw new AppError(401, 'Invalid credentials');
  }

  const payload: JwtPayload = { sub: 'admin', role: 'admin' };
  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
}
