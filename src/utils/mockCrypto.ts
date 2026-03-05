/**
 * Browser-side mock AES-256-GCM for testing the encrypt → decrypt pipeline
 * before feeding data into the Three.js Skins Gallery. Not for production secrets.
 */

const ALGO = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function getMockKey(): Promise<CryptoKey> {
  const keyMaterial = new Uint8Array(32);
  for (let i = 0; i < 32; i++) keyMaterial[i] = 0x5a;
  return crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { name: ALGO, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function mockEncrypt(plaintext: string): Promise<string> {
  const key = await getMockKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGO, iv, tagLength: 128 },
    key,
    encoded
  );
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return bufferToBase64(combined.buffer);
}

export async function mockDecrypt(payloadBase64: string): Promise<string> {
  const key = await getMockKey();
  const combined = new Uint8Array(base64ToBuffer(payloadBase64));
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);
  const decrypted = await crypto.subtle.decrypt(
    { name: ALGO, iv, tagLength: 128 },
    key,
    ciphertext
  );
  return new TextDecoder().decode(decrypted);
}
