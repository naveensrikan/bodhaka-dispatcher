import { safeStorage } from 'electron';

/**
 * Secret-at-rest encryption for API keys and passwords.
 *
 * Uses Electron's safeStorage, which encrypts via the OS keychain:
 *   - Windows: DPAPI (tied to the user's Windows login)
 *   - macOS:   Keychain
 *   - Linux:   the system secret service where available
 *
 * Design goals (bulletproof):
 *  - NEVER throw. Encryption/decryption failures must not break saving or
 *    loading config — they fall back gracefully.
 *  - Be backward compatible: existing PLAINTEXT keys are read as-is and
 *    transparently re-encrypted the next time config is saved (migration).
 *  - Be idempotent: encrypting an already-encrypted value is a no-op; decrypting
 *    a plaintext value returns it unchanged.
 *
 * Encrypted values are stored as a string with a recognizable prefix so we can
 * distinguish them from legacy plaintext:
 *    enc:v1:<base64 ciphertext>
 */

const PREFIX = 'enc:v1:';

/** The exact secret field paths inside the config blobs, as "configKey.field". */
export const SECRET_FIELDS: Record<string, string[]> = {
  llm: ['apiKey'],
  smtp: ['pass'],
  twilio: ['authToken'],
  search: ['tavilyKey', 'braveKey'],
};

function canEncrypt(): boolean {
  try {
    return safeStorage.isEncryptionAvailable();
  } catch {
    return false;
  }
}

/** Encrypt a single string value. Returns prefixed ciphertext, or the original on any failure. */
export function encryptValue(plain: string): string {
  if (typeof plain !== 'string' || plain.length === 0) return plain;
  if (plain.startsWith(PREFIX)) return plain; // already encrypted
  if (!canEncrypt()) return plain;            // encryption unavailable — store as-is
  try {
    const buf = safeStorage.encryptString(plain);
    return PREFIX + buf.toString('base64');
  } catch {
    return plain; // never block a save
  }
}

/** Decrypt a single value. Returns plaintext. Plaintext input is returned unchanged. */
export function decryptValue(stored: string): string {
  if (typeof stored !== 'string' || stored.length === 0) return stored;
  if (!stored.startsWith(PREFIX)) return stored; // legacy plaintext — return as-is
  if (!canEncrypt()) return '';                  // can't decrypt without keychain; avoid leaking ciphertext
  try {
    const b64 = stored.slice(PREFIX.length);
    const buf = Buffer.from(b64, 'base64');
    return safeStorage.decryptString(buf);
  } catch {
    return ''; // corrupt/undecryptable — return empty rather than garbage
  }
}

/**
 * Given a config key (e.g. "llm") and its value object, return a COPY with its
 * secret fields encrypted. Non-secret keys/values are returned unchanged.
 */
export function encryptConfigValue(key: string, value: unknown): unknown {
  const fields = SECRET_FIELDS[key];
  if (!fields || value === null || typeof value !== 'object') return value;
  const copy: Record<string, any> = { ...(value as Record<string, any>) };
  for (const f of fields) {
    if (typeof copy[f] === 'string' && copy[f].length > 0) {
      copy[f] = encryptValue(copy[f]);
    }
  }
  return copy;
}

/**
 * Given a config key and its stored value object, return a COPY with its secret
 * fields decrypted to plaintext for use in the app.
 */
export function decryptConfigValue(key: string, value: unknown): unknown {
  const fields = SECRET_FIELDS[key];
  if (!fields || value === null || typeof value !== 'object') return value;
  const copy: Record<string, any> = { ...(value as Record<string, any>) };
  for (const f of fields) {
    if (typeof copy[f] === 'string' && copy[f].length > 0) {
      copy[f] = decryptValue(copy[f]);
    }
  }
  return copy;
}

/** Whether OS-backed encryption is active (for showing the user an honest status). */
export function encryptionAvailable(): boolean {
  return canEncrypt();
}
