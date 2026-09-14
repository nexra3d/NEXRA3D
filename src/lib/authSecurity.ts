import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { CookieOptions } from 'express';

// ==========================================
// 1. JWT & SECRETS MANAGEMENT
// ==========================================

const KNOWN_INSECURE_SECRETS = new Set([
  'super-secret-jwt-key-change-in-production',
  'change_this_secret_in_production',
  'change-this-secret-in-production',
  'secret',
  'changeme',
  'jwt_secret',
  '123456',
  'default_secret',
  'supersecret',
  'your-secret-key',
  'development-secret'
]);

const RAW_JWT_SECRET = process.env.JWT_SECRET;

export function validateJwtSecretInProduction(secret?: string): boolean {
  const target = secret !== undefined ? secret : RAW_JWT_SECRET;
  const lower = target ? target.trim().toLowerCase() : '';
  const hasPlaceholder = lower.includes('change_in_production') || lower.includes('change-in-production') || lower.includes('changeme') || lower.includes('your-secret');
  const isWeak = !target || target.trim().length < 32 || KNOWN_INSECURE_SECRETS.has(lower) || hasPlaceholder;
  if (isWeak) {
    const errorMsg = '[FATAL SECURITY ERROR] A cryptographically strong JWT_SECRET (minimum 32 characters, not using a known insecure default) must be configured in production.';
    throw new Error(errorMsg);
  }
  return true;
}

function resolveJwtSecret(): string {
  const isProduction = process.env.NODE_ENV === 'production';
  const isWeak = !RAW_JWT_SECRET || RAW_JWT_SECRET.trim().length < 32 || KNOWN_INSECURE_SECRETS.has(RAW_JWT_SECRET.trim().toLowerCase());

  if (isProduction) {
    validateJwtSecretInProduction(RAW_JWT_SECRET);
    return RAW_JWT_SECRET!.trim();
  }

  // In development and test environments:
  // If no secret or an insecure default is provided, generate a cryptographically strong ephemeral secret
  // This guarantees that any token forged or signed with previous insecure defaults will fail validation.
  if (isWeak) {
    return crypto.randomBytes(32).toString('hex');
  }

  return RAW_JWT_SECRET!.trim();
}

export const JWT_SECRET = resolveJwtSecret();
export const ACCESS_TOKEN_EXPIRY = '24h'; // 24-hour expiration for active access tokens

// In-memory token revocation blacklist (persists during process lifetime)
const revokedTokens = new Map<string, number>();

// Cleanup expired entries every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, expiry] of revokedTokens.entries()) {
    if (expiry < now) {
      revokedTokens.delete(token);
    }
  }
}, 30 * 60 * 1000);

export function revokeToken(token: string, expiryMs = 24 * 60 * 60 * 1000): void {
  if (!token) return;
  const hash = hashToken(token);
  revokedTokens.set(hash, Date.now() + expiryMs);
}

export function isTokenRevoked(token: string): boolean {
  if (!token) return true;
  const hash = hashToken(token);
  const expiry = revokedTokens.get(hash);
  if (!expiry) return false;
  if (expiry < Date.now()) {
    revokedTokens.delete(hash);
    return false;
  }
  return true;
}

export function signUserToken(
  payload: { userId: string; email: string; role: string },
  expiresIn = ACCESS_TOKEN_EXPIRY
): string {
  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email.toLowerCase().trim(),
      role: payload.role
    },
    JWT_SECRET,
    { expiresIn: expiresIn as any }
  );
}

export function verifyUserToken(token: string): { userId: string; email: string; role: string } | null {
  if (!token || isTokenRevoked(token)) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string; role: string };
    if (!decoded || (!decoded.userId && !decoded.email)) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function getAuthCookieOptions(isProd: boolean): CookieOptions {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  };
}

// ==========================================
// 2. PASSWORD HASHING & STRENGTH
// ==========================================

const BCRYPT_SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;
  return bcrypt.compare(password, hash);
}

export function validatePasswordStrength(password: string): { isValid: boolean; message?: string } {
  if (!password || typeof password !== 'string') {
    return { isValid: false, message: 'Password is required.' };
  }
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long.' };
  }
  if (password.length > 128) {
    return { isValid: false, message: 'Password cannot exceed 128 characters.' };
  }
  // Must contain at least one letter and one number
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  if (!hasLetter || !hasNumber) {
    return {
      isValid: false,
      message: 'Password must contain at least one letter and one number.'
    };
  }

  // Prevent common weak trivial passwords
  const commonWeak = ['password123', 'admin1234', '12345678', 'qwerty123', 'pass1234'];
  if (commonWeak.includes(password.toLowerCase())) {
    return {
      isValid: false,
      message: 'Password is too common. Please choose a more secure password.'
    };
  }

  return { isValid: true };
}

// ==========================================
// 3. CRYPTOGRAPHIC TOKENS (SHA-256 HASHED)
// ==========================================

export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ==========================================
// 4. RATE LIMITING & BRUTE FORCE DEFENSE
// ==========================================

interface RateLimitRecord {
  count: number;
  firstAttemptTime: number;
  lockoutUntil?: number;
}

class InMemoryRateLimiter {
  private records = new Map<string, RateLimitRecord>();
  private windowMs: number;
  private maxAttempts: number;
  private lockoutDurationMs: number;

  constructor(options: { windowMs: number; maxAttempts: number; lockoutDurationMs?: number }) {
    this.windowMs = options.windowMs;
    this.maxAttempts = options.maxAttempts;
    this.lockoutDurationMs = options.lockoutDurationMs || options.windowMs;

    // Periodic sweep
    setInterval(() => this.cleanup(), 10 * 60 * 1000);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, record] of this.records.entries()) {
      if (record.lockoutUntil && record.lockoutUntil > now) continue;
      if (now - record.firstAttemptTime > this.windowMs) {
        this.records.delete(key);
      }
    }
  }

  /**
   * Check if a key is currently blocked
   */
  public check(key: string): { isAllowed: boolean; retryAfterSeconds: number; remainingAttempts: number } {
    const now = Date.now();
    const record = this.records.get(key);

    if (!record) {
      return { isAllowed: true, retryAfterSeconds: 0, remainingAttempts: this.maxAttempts };
    }

    // Check lockout
    if (record.lockoutUntil && record.lockoutUntil > now) {
      const retryAfter = Math.ceil((record.lockoutUntil - now) / 1000);
      return { isAllowed: false, retryAfterSeconds: retryAfter, remainingAttempts: 0 };
    }

    // Check window expiration
    if (now - record.firstAttemptTime > this.windowMs) {
      this.records.delete(key);
      return { isAllowed: true, retryAfterSeconds: 0, remainingAttempts: this.maxAttempts };
    }

    if (record.count >= this.maxAttempts) {
      // Trigger lockout
      record.lockoutUntil = now + this.lockoutDurationMs;
      const retryAfter = Math.ceil(this.lockoutDurationMs / 1000);
      return { isAllowed: false, retryAfterSeconds: retryAfter, remainingAttempts: 0 };
    }

    return {
      isAllowed: true,
      retryAfterSeconds: 0,
      remainingAttempts: Math.max(0, this.maxAttempts - record.count)
    };
  }

  /**
   * Record a failed attempt
   */
  public recordFailure(key: string): { isAllowed: boolean; retryAfterSeconds: number; remainingAttempts: number } {
    const now = Date.now();
    let record = this.records.get(key);

    if (!record || now - record.firstAttemptTime > this.windowMs) {
      record = { count: 1, firstAttemptTime: now };
      this.records.set(key, record);
    } else {
      record.count += 1;
    }

    if (record.count >= this.maxAttempts) {
      record.lockoutUntil = now + this.lockoutDurationMs;
      const retryAfter = Math.ceil(this.lockoutDurationMs / 1000);
      return { isAllowed: false, retryAfterSeconds: retryAfter, remainingAttempts: 0 };
    }

    return {
      isAllowed: true,
      retryAfterSeconds: 0,
      remainingAttempts: this.maxAttempts - record.count
    };
  }

  /**
   * Reset on successful authentication
   */
  public reset(key: string) {
    this.records.delete(key);
  }
}

// 1. Strict Login Limiter: Max 5 failed attempts per 15 minutes, with 15-minute account/IP lockout
export const loginRateLimiter = new InMemoryRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxAttempts: 5,
  lockoutDurationMs: 15 * 60 * 1000
});

// 2. Registration Limiter: Max 5 registrations per IP per hour
export const registerRateLimiter = new InMemoryRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxAttempts: 5,
  lockoutDurationMs: 30 * 60 * 1000
});

// 3. Password Reset Request Limiter: Max 3 requests per 15 minutes per IP / email
export const forgotPasswordRateLimiter = new InMemoryRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxAttempts: 3,
  lockoutDurationMs: 15 * 60 * 1000
});

// 4. Reset Password Action Limiter: Max 5 attempts per 15 minutes
export const resetPasswordActionRateLimiter = new InMemoryRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxAttempts: 5,
  lockoutDurationMs: 15 * 60 * 1000
});

// 5. Resend Email Verification Limiter: Max 3 requests per 15 minutes
export const emailVerificationRateLimiter = new InMemoryRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxAttempts: 3,
  lockoutDurationMs: 15 * 60 * 1000
});

/**
 * Helper to extract client IP safely without blind header spoofing
 */
export function getClientIp(req: any): string {
  if (req.ip) {
    return req.ip.replace(/^::ffff:/, '');
  }
  const socketAddress = req.socket?.remoteAddress;
  if (socketAddress) {
    return socketAddress.replace(/^::ffff:/, '');
  }
  return '127.0.0.1';
}

/**
 * Validates raster image buffer contents via magic bytes / file signatures
 * Strictly rejects vector formats (SVG) or polyglot files containing script/xml tags
 */
export function validateRasterImageBuffer(buffer: Buffer): { valid: boolean; reason?: string } {
  if (!buffer || buffer.length < 12) {
    return { valid: false, reason: 'Uploaded file is empty or too small to be a valid image.' };
  }

  // Scan the beginning for SVG, XML, HTML, or JavaScript tags (XSS defense)
  const headerSample = buffer.subarray(0, Math.min(buffer.length, 2048)).toString('utf-8').toLowerCase();
  if (
    headerSample.includes('<svg') ||
    headerSample.includes('<?xml') ||
    headerSample.includes('<html') ||
    headerSample.includes('<script') ||
    headerSample.includes('javascript:') ||
    headerSample.includes('onload=') ||
    headerSample.includes('onerror=')
  ) {
    return { valid: false, reason: 'Vector images (SVG) and active scripts are strictly forbidden.' };
  }

  // Magic bytes checks:
  // JPEG: 0xFF, 0xD8, 0xFF
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  // PNG: 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  // GIF: GIF87a or GIF89a
  const isGif = buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38;
  // WEBP: "RIFF" .... "WEBP"
  const isWebp =
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  // AVIF / HEIC / HEIF: starts with ftyp box at offset 4
  const isIsoBmff =
    buffer.subarray(4, 8).toString('ascii') === 'ftyp' &&
    ['avif', 'mif1', 'msf1', 'heic', 'heix', 'heim', 'heis'].some((brand) =>
      buffer.subarray(8, 12).toString('ascii').toLowerCase().includes(brand)
    );

  if (isJpeg || isPng || isGif || isWebp || isIsoBmff) {
    return { valid: true };
  }

  return { valid: false, reason: 'File content signature does not match any allowed raster image format (JPEG, PNG, WEBP, GIF, AVIF).' };
}
