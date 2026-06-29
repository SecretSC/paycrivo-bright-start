import bcrypt from "bcryptjs";

// bcryptjs is pure JS (no native build) — keeps self-hosting friction-free.
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

// Mirror of the frontend policy: 8+, upper, lower, number, symbol.
export function isStrongPassword(v: string): boolean {
  return (
    v.length >= 8 &&
    /[A-Z]/.test(v) &&
    /[a-z]/.test(v) &&
    /[0-9]/.test(v) &&
    /[^A-Za-z0-9]/.test(v)
  );
}