import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const KEY_LENGTH = 64;

export function hashPassword(plainPassword: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(plainPassword, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${derivedKey}`;
}

export function verifyPassword(plainPassword: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;

  const derivedKey = scryptSync(plainPassword, salt, KEY_LENGTH);
  const hashBuffer = Buffer.from(hash, "hex");

  if (derivedKey.length !== hashBuffer.length) return false;
  return timingSafeEqual(derivedKey, hashBuffer);
}
