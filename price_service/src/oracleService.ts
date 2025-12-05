import { SuiPriceServiceConnection, SuiPythClient } from '@pythnetwork/pyth-sui-js';
import { Buffer } from 'buffer';
import config from './config.js';
import { keypair } from './keys.js';
// New API
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { SUI_CLOCK_OBJECT_ID } from '@mysten/sui/utils';

type HexString = string;
type SuiAddress = string;

const portOracleId = '0x8d976e6a90b8c2e7a6c4a8b6578bbda947196ebcf07e108a3c845b4550a97a31';
const globalVaultConfigId = '0xc8984e9580918369ced17dcb2077949ffa64208abdac5b073fbbb4e04ae149c6';

// Create port parameters from create_port.sh
const DEFAULT_PORT_PACKAGE_ID = '0x9a7f6bb7cdad3343846381f4a0b43552adee23fd051fd450532bbd5981f0ac96';
const DEFAULT_VAULT_CONFIG = '0xc8984e9580918369ced17dcb2077949ffa64208abdac5b073fbbb4e04ae149c6';
const DEFAULT_PORT_ORACLE = '0x8d976e6a90b8c2e7a6c4a8b6578bbda947196ebcf07e108a3c845b4550a97a31';
const DEFAULT_PORT_REGISTRY = '0x5eca08f08095a52de3dc2877ae635ba19080df266fe3752e897420fb246750d6';
const DEFAULT_CLMM_GLOBAL_CONFIG = '0x03b9c9a7889bb4c1144c079d5074432fc9a58d67c062f27cf6390967f3095843';
const DEFAULT_CLMM_VAULT = '0x96eeac7f51cd7697c68d3026c782750f178e7e477d51c0f9e4a9972a80889a51';
const DEFAULT_DISTRIBUTION_CONFIG = '0xdfb3cafdc799abf00dc5a05e91b5fc6197cd87c48556d26e00612a6abce3c14a';
const DEFAULT_POOL = '0xe455d2ce2e83bbe3b47615ee2727dc6c9ffbf022c98fd1c1bfc43535b79c13a2';
const DEFAULT_GAUGE = '0x5c0326e7c8c0aa53afc8a81443b454c8ae46f9d0a29b20b7355d0e32b39a424a';
const DEFAULT_LOWER_OFFSET = 5000;
const DEFAULT_UPPER_OFFSET = 5000;
const DEFAULT_REBALANCE_THRESHOLD = 4000;
const DEFAULT_QUOTE_TYPE_A = true;
const DEFAULT_HARD_CAP = '1000000000';

export interface UpdatePriceParams {
  coinType?: string;
  priceId?: HexString;
  maxAgeSec?: number;
}

export interface UpdatePriceResult {
  price: string;
  priceInfoObjectId: string;
  updateTxDigest: string;
}

export interface CreatePortParams {
  startCoinAId: string;
  startCoinBId: string;
  vaultConfig?: string;
  portRegistry?: string;
  portOracle?: string;
  clmmGlobalConfig?: string;
  clmmVault?: string;
  distributionConfig?: string;
  portPackageId?: string;
  pool?: string;
  gauge?: string;
  lowerOffset?: number;
  upperOffset?: number;
  rebalanceThreshold?: number;
  quoteTypeA?: boolean;
  hardCap?: string;
}

export interface UpdateTwoPricesParams {
  token1: {
    priceId: HexString;
    coinType: string;
  };
  token2: {
    priceId: HexString;
    coinType: string;
  };
  createPort?: CreatePortParams;
}

export interface UpdateTwoPricesResult {
  token1: {
    priceInfoObjectId: string;
  };
  token2: {
    priceInfoObjectId: string;
  };
  updateTxDigest: string;
}


export class OracleService {
  private readonly suiClient: SuiClient;
  private readonly signerAddress: SuiAddress;
  private readonly priceServiceConnection: SuiPriceServiceConnection;
  private readonly pythClient: SuiPythClient;

  constructor(private readonly cfg = config) {
    // New API
    this.suiClient = new SuiClient({ url: cfg.fullnodeUrl });
    this.signerAddress = keypair.toSuiAddress();

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
    // transaction.moveCall({
    //   target: `${this.cfg.oraclePackageId}::${this.cfg.oracleModuleName}::get_price_from_pyth_oracle`,
    //   arguments: [
    //     transaction.object(priceInfoObjectId),
    //     transaction.pure.u64(maxAgeSec),
    //     transaction.object(SUI_CLOCK_OBJECT_ID),
    //   ],
    // });

    transaction.moveCall({
      target: `${this.cfg.oraclePackageId}::${this.cfg.oracleModuleName}::external_update_price_from_pyth`,
      typeArguments: [params.coinType ?? '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI'],
      arguments: [
        transaction.object(portOracleId),
        transaction.object(globalVaultConfigId),
        transaction.object(priceInfoObjectId),
        transaction.object(SUI_CLOCK_OBJECT_ID),
      ],
    })

    transaction.setGasBudget(100000000); // 0.1 SUI

    // Execute the single transaction
    const result = await this.suiClient.signAndExecuteTransaction({
      transaction,
      signer: keypair,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });

    // Check transaction status
    const status = result.effects?.status;
    if (!status || (typeof status === 'object' && 'status' in status && status.status !== 'success')) {
      const errorMessage = typeof status === 'object' && 'error' in status 
        ? status.error 
        : 'Transaction failed';
      const errorDetails = typeof status === 'object' 
        ? JSON.stringify(status, null, 2)
        : `Status: ${status}`;
      throw new Error(`Transaction failed: ${errorMessage}. Details: ${errorDetails}. Transaction digest: ${result.digest}`);
    }

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

  async updateTwoPricesAndFetch(params: UpdateTwoPricesParams): Promise<UpdateTwoPricesResult> {
    const { token1, token2 } = params;

    // Get price feed updates for both tokens
    const updates = await this.priceServiceConnection.getPriceFeedsUpdateData([
      token1.priceId,
      token2.priceId,
    ]);

    console.log(`Received ${updates.length} updates for two tokens`);

    // Create one transaction for everything
    const transaction = new Transaction();
    transaction.setSender(this.signerAddress);

    // Update both price feeds in the same transaction
    const priceInfoObjectIds = await this.pythClient.updatePriceFeeds(
      transaction,
      updates,
      [token1.priceId, token2.priceId],
    );

    const priceInfoObjectId1 = priceInfoObjectIds[0];
    const priceInfoObjectId2 = priceInfoObjectIds[1];

    if (!priceInfoObjectId1 || !priceInfoObjectId2) {
      throw new Error('Failed to get PriceInfoObjects after update');
    }

    // Call external_update_price_from_pyth for token1
    transaction.moveCall({
      target: `${this.cfg.oraclePackageId}::${this.cfg.oracleModuleName}::external_update_price_from_pyth`,
      typeArguments: [token1.coinType],
      arguments: [
        transaction.object(portOracleId),
        transaction.object(globalVaultConfigId),
        transaction.object(priceInfoObjectId1),
        transaction.object(SUI_CLOCK_OBJECT_ID),
      ],
    });

    // Call external_update_price_from_pyth for token2
    transaction.moveCall({
      target: `${this.cfg.oraclePackageId}::${this.cfg.oracleModuleName}::external_update_price_from_pyth`,
      typeArguments: [token2.coinType],
      arguments: [
        transaction.object(portOracleId),
        transaction.object(globalVaultConfigId),
        transaction.object(priceInfoObjectId2),
        transaction.object(SUI_CLOCK_OBJECT_ID),
      ],
    });

    // If createPort parameters are provided, add create_port call
    if (params.createPort) {
      const {
        startCoinAId,
        startCoinBId,
        vaultConfig = DEFAULT_VAULT_CONFIG,
        portRegistry = DEFAULT_PORT_REGISTRY,
        portOracle = DEFAULT_PORT_ORACLE,
        clmmGlobalConfig = DEFAULT_CLMM_GLOBAL_CONFIG,
        clmmVault = DEFAULT_CLMM_VAULT,
        distributionConfig = DEFAULT_DISTRIBUTION_CONFIG,
        portPackageId = DEFAULT_PORT_PACKAGE_ID,
        pool = DEFAULT_POOL,
        gauge = DEFAULT_GAUGE,
        lowerOffset = DEFAULT_LOWER_OFFSET,
        upperOffset = DEFAULT_UPPER_OFFSET,
        rebalanceThreshold = DEFAULT_REBALANCE_THRESHOLD,
        quoteTypeA = DEFAULT_QUOTE_TYPE_A,
        hardCap = DEFAULT_HARD_CAP,
      } = params.createPort;

      // Convert coins to balances
      const balanceA = transaction.moveCall({
        target: '0x2::coin::into_balance',
        typeArguments: [token1.coinType],
        arguments: [transaction.object(startCoinAId)],
      });

      const balanceB = transaction.moveCall({
        target: '0x2::coin::into_balance',
        typeArguments: [token2.coinType],
        arguments: [transaction.object(startCoinBId)],
      });

      // Call create_port
      transaction.moveCall({
        target: `${portPackageId}::port::create_port`,
        typeArguments: [token1.coinType, token2.coinType],
        arguments: [
          transaction.object(vaultConfig),
          transaction.object(portRegistry),
          transaction.object(portOracle),
          transaction.object(clmmGlobalConfig),
          transaction.object(clmmVault),
          transaction.object(distributionConfig),
          transaction.object(gauge),
          transaction.object(pool),
          transaction.pure.u32(lowerOffset),
          transaction.pure.u32(upperOffset),
          transaction.pure.u32(rebalanceThreshold),
          transaction.pure.bool(quoteTypeA),
          transaction.pure.u128(hardCap),
          balanceA,
          balanceB,
          transaction.object(SUI_CLOCK_OBJECT_ID),
        ],
      });
    }

    const gasBudget = 200000000; // 0.5 SUI if create_port, 0.2 SUI otherwise
    transaction.setGasBudget(gasBudget);

    // Execute the single transaction
    const result = await this.suiClient.signAndExecuteTransaction({
      transaction,
      signer: keypair,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });

    // Check transaction status
    const status = result.effects?.status;
    if (!status || (typeof status === 'object' && 'status' in status && status.status !== 'success')) {
      const errorMessage = typeof status === 'object' && 'error' in status 
        ? status.error 
        : 'Transaction failed';
      const errorDetails = typeof status === 'object' 
        ? JSON.stringify(status, null, 2)
        : `Status: ${status}`;
      throw new Error(`Transaction failed: ${errorMessage}. Details: ${errorDetails}. Transaction digest: ${result.digest}`);
    }

    return {
      token1: {
        priceInfoObjectId: priceInfoObjectId1,
      },
      token2: {
        priceInfoObjectId: priceInfoObjectId2,
      },
      updateTxDigest: result.digest,
    };
  }
}

export const oracleService = new OracleService();
