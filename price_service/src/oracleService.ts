import { SuiPriceServiceConnection, SuiPythClient } from '@pythnetwork/pyth-sui-js';
import { Buffer } from 'buffer';
import config from './config.js';
import { deriveKeypair } from './keys.js';
// New API
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { SUI_CLOCK_OBJECT_ID } from '@mysten/sui/utils';

type HexString = string;
type SuiAddress = string;

export interface UpdatePriceParams {
  priceId?: HexString;
  maxAgeSec?: number;
}

export interface UpdatePriceResult {
  price: string;
  priceInfoObjectId: string;
  updateTxDigest: string;
}


export class OracleService {
  private readonly suiClient: SuiClient;
  private readonly keypair: ReturnType<typeof deriveKeypair>;
  private readonly signerAddress: SuiAddress;
  private readonly priceServiceConnection: SuiPriceServiceConnection;
  private readonly pythClient: SuiPythClient;

  constructor(private readonly cfg = config) {
    // New API
    this.suiClient = new SuiClient({ url: cfg.fullnodeUrl });
    this.keypair = deriveKeypair(cfg.suiPrivateKey);
    this.signerAddress = this.keypair.getPublicKey().toSuiAddress();

    // SuiPriceServiceConnection automatically returns binary data
    this.priceServiceConnection = new SuiPriceServiceConnection(cfg.priceServiceUrl);

    // SuiPythClient now uses the new API with SuiClient
    this.pythClient = new SuiPythClient(
      this.suiClient,
      cfg.pythStateId,
      cfg.wormholeStateId,
    );
  }

  async updatePriceAndFetch(params: UpdatePriceParams = {}): Promise<UpdatePriceResult> {
    const priceId = params.priceId ?? this.cfg.priceFeedId;
    const maxAgeSec = params.maxAgeSec ?? this.cfg.defaultMaxPriceAgeSec;

    const updates = await this.priceServiceConnection.getPriceFeedsUpdateData([priceId]);
    
    // Logging for diagnostics
    console.log(`Received ${updates.length} updates, first size: ${updates[0]?.length ?? 0} bytes`);
    if (updates[0]) {
      console.log(`First 20 bytes: ${updates[0].subarray(0, Math.min(20, updates[0].length)).toString('hex')}`);
    }

    // Create one transaction for everything, as in the example
    const transaction = new Transaction();
    transaction.setSender(this.signerAddress);

    // updatePriceFeeds will automatically create a price feed if it does not exist
    const priceInfoObjectIds = await this.pythClient.updatePriceFeeds(
      transaction,
      updates,
      [priceId],
    );

    const priceInfoObjectId = priceInfoObjectIds[0];
    if (!priceInfoObjectId) {
      throw new Error('Failed to get PriceInfoObject after update');
    }

    // Add call to get_price_from_pyth_oracle in the same transaction
    transaction.moveCall({
      target: `${this.cfg.oraclePackageId}::${this.cfg.oracleModuleName}::get_price_from_pyth_oracle`,
      arguments: [
        transaction.object(priceInfoObjectId),
        transaction.pure.u64(maxAgeSec),
        transaction.object(SUI_CLOCK_OBJECT_ID),
      ],
    });

    transaction.setGasBudget(100000000); // 0.1 SUI

    // Execute the single transaction
    const result = await this.suiClient.signAndExecuteTransaction({
      transaction,
      signer: this.keypair,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });

    // // Read price from return values of the transaction
    // // The last moveCall (get_price_from_pyth_oracle) should return the value
    // const returnValues = result.result?.effects?.returnValues;
    // if (!returnValues || returnValues.length === 0) {
    //   // If there are no return values, use devInspect to read the price
    //   const inspection = await this.suiClient.devInspectTransactionBlock({
    //     sender: this.signerAddress,
    //     transactionBlock: await transaction.build({ client: this.suiClient }),
    //   });

    //   const returnValue = inspection.results?.[0]?.returnValues?.[0];
    //   if (!returnValue) {
    //     throw new Error('Contract did not return a price value');
    //   }

    //   const [bytes] = returnValue;
    //   const buffer = Buffer.from(bytes);
    //   if (buffer.length !== 8) {
    //     throw new Error('Expected u64 value when reading price from contract');
    //   }

    //   const value = buffer.readBigUInt64LE(0);
    //   return {
    //     price: value.toString(),
    //     priceInfoObjectId,
    //     updateTxDigest: result.digest,
    //   };
    // }

    // Extract price from return values
    // const lastReturnValue = returnValues[returnValues.length - 1];
    // const [bytes, type] = lastReturnValue;
    // const buffer = Buffer.from(bytes);
    // if (buffer.length !== 8) {
    //   throw new Error('Expected u64 value when reading price from contract');
    // }

    // const value = buffer.readBigUInt64LE(0);

    return {
      price: '1111111', // TODO: replace with actual price
      priceInfoObjectId,
      updateTxDigest: result.digest,
    };
  }
}

export const oracleService = new OracleService();
