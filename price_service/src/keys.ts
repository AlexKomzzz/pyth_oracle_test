import { fromB64 } from '@mysten/sui/utils';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

const HEX_REGEX = /^[0-9a-fA-F]+$/;

export const deriveKeypair = (secret: string) => {
  const normalized = secret.trim();
  let bytes: Uint8Array;

  if (normalized.startsWith('0x')) {
    const hex = normalized.slice(2);
    if (!HEX_REGEX.test(hex)) {
      throw new Error('Invalid hex format for SUI_PRIVATE_KEY');
    }
    bytes = Uint8Array.from(Buffer.from(hex, 'hex'));
  } else if (HEX_REGEX.test(normalized) && normalized.length % 2 === 0) {
    bytes = Uint8Array.from(Buffer.from(normalized, 'hex'));
  } else {
    bytes = fromB64(normalized);
  }

  // Sui keystore format: flag (1 byte) || private key (32 bytes) = 33 bytes
  // Flag 0x00 indicates Ed25519 scheme
  if (bytes.length === 33) {
    if (bytes[0] !== 0) {
      throw new Error('Unsupported signature scheme. Expected Ed25519 (flag 0x00)');
    }
    bytes = bytes.subarray(1); // Remove flag, keep only the private key
  }

  // Standard format: 32 bytes (seed)
  if (bytes.length === 32) {
    return Ed25519Keypair.fromSecretKey(bytes);
  }

  // Extended format: 64 bytes (seed + extra data)
  // Take first 32 bytes as seed
  if (bytes.length === 64) {
    return Ed25519Keypair.fromSecretKey(bytes.slice(0, 32));
  }

  throw new Error(
    `Invalid private key length: ${bytes.length} bytes. ` +
    `Expected: 32 bytes (seed), 33 bytes (Sui keystore: flag + key), or 64 bytes (extended format)`
  );
};
