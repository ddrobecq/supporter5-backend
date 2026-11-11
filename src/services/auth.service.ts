import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppError, JwtPayload } from '../types';

function env(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing env variable: ${key}`);
  return val;
}

/** Hash factice par cout bcrypt, calcule une seule fois : un utilisateur inconnu coute autant qu'un mauvais mot de passe. */
const dummyHashes = new Map<number, Promise<string>>();

function dummyHash(rounds: number): Promise<string> {
  let hash = dummyHashes.get(rounds);
  if (!hash) {
    hash = bcrypt.hash('timing-equalizer', rounds);
    dummyHashes.set(rounds, hash);
  }
  return hash;
}

export async function login(username: string, password: string): Promise<string> {
  const adminUser = env('ADMIN_USERNAME');
  const adminHash = env('ADMIN_PASSWORD_HASH');
  const secret    = env('JWT_SECRET');
  const expiresIn = process.env.JWT_EXPIRES_IN ?? '8h';

  // Always run one bcrypt comparison of the admin hash's cost, whether the username matches or not.
  const knownUser = username === adminUser;
  const hashToCompare = knownUser ? adminHash : await dummyHash(bcrypt.getRounds(adminHash));
  const valid = await bcrypt.compare(password, hashToCompare);
  if (!knownUser || !valid) {
    throw new AppError(401, 'Invalid credentials');
  }

  const payload: JwtPayload = { sub: 'admin', role: 'admin' };
  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
}
