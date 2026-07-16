// ============================================================
// ADNTmarket.app — JWT Auth Utility
// ============================================================

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET ?? "fallback-secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "7d";

export interface JwtPayload {
  userId: string;
  role: string;
  tenantId?: string;
  iat: number;
  exp: number;
}

/** Hash password dengan bcrypt (12 rounds) */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/** Bandingkan password dengan hash */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Sign JWT token */
export function signToken(payload: {
  userId: string;
  role: string;
  tenantId?: string;
}): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] });
}

/** Verify JWT token — throw jika invalid/kedaluwarsa */
export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
