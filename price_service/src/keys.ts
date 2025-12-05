import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

// Create keypair from private key
const getKeypair = (): Ed25519Keypair => {
  const privateKey = process.env.SUI_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('SUI_PRIVATE_KEY is not set in environment variables');
  }

  // Support for suiprivkey format or hex string
  if (privateKey.startsWith('suiprivkey')) {
    return Ed25519Keypair.fromSecretKey(privateKey);
  } else {
    // If hex string, convert to Uint8Array
    const hexKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
    const keyBytes = Uint8Array.from(Buffer.from(hexKey, 'hex'));
    return Ed25519Keypair.fromSecretKey(keyBytes);
  }
};

export const keypair = getKeypair();
