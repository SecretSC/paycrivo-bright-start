// AES-256-GCM encryption for secrets stored in the settings row (SMTP password).
// The key is derived from env.settingsEncryptionKey via scrypt so any passphrase
// length works. Format: enc:v1:<ivHex>:<tagHex>:<cipherHex>.
import crypto from "crypto";
import { env } from "./env.js";

const PREFIX = "enc:v1:";
let keyCache: Buffer | null = null;

function key(): Buffer {
  if (!keyCache) {
    keyCache = crypto.scryptSync(env.settingsEncryptionKey, "paycrivo-settings-salt", 32);
  }
  return keyCache;
}

export function encryptSecret(plain: string): string {
  if (!plain) return "";
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

export function isEncrypted(value?: string | null): boolean {
  return typeof value === "string" && value.startsWith(PREFIX);
}

export function decryptSecret(value?: string | null): string {
  if (!value) return "";
  if (!isEncrypted(value)) return value; // tolerate legacy plaintext
  try {
    const [, , ivHex, tagHex, dataHex] = value.split(":");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}