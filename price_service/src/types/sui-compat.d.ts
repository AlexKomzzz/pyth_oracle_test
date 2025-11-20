declare module '@pythnetwork/pyth-sui-js/node_modules/@mysten/sui.js' {
  export { Connection } from '@pythnetwork/pyth-sui-js/node_modules/@mysten/sui.js/dist/cjs/rpc/connection.js';
  export { JsonRpcProvider } from '@pythnetwork/pyth-sui-js/node_modules/@mysten/sui.js/dist/cjs/providers/json-rpc-provider.js';
  export { TransactionBlock } from '@pythnetwork/pyth-sui-js/node_modules/@mysten/sui.js/dist/cjs/builder/index.js';
  export { RawSigner } from '@pythnetwork/pyth-sui-js/node_modules/@mysten/sui.js/dist/cjs/signers/raw-signer.js';
  export { SUI_CLOCK_OBJECT_ID } from '@pythnetwork/pyth-sui-js/node_modules/@mysten/sui.js/dist/cjs/framework/framework.js';
  export * from '@pythnetwork/pyth-sui-js/node_modules/@mysten/sui.js/dist/cjs/index.js';
}

declare module '@pythnetwork/pyth-sui-js/node_modules/@mysten/sui.js/keypairs/ed25519' {
  export * from '@pythnetwork/pyth-sui-js/node_modules/@mysten/sui.js/dist/cjs/keypairs/ed25519/index.js';
}
