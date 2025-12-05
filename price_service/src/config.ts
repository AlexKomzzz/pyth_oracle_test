import dotenv from 'dotenv';

dotenv.config();

export interface OracleConfig {
  port: number;
  fullnodeUrl: string;
  priceServiceUrl: string;
  pythStateId: string;
  wormholeStateId: string;
  oraclePackageId: string;
  oracleModuleName: string;
  priceFeedId: string;
  suiPrivateKey: string;
  defaultMaxPriceAgeSec: number;
}

const requireEnv = (key: string, fallback?: string): string => {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const config: OracleConfig = {
  port: Number.parseInt(process.env.PORT ?? '3000', 10),
  fullnodeUrl: process.env.SUI_FULLNODE_URL ?? 'https://fullnode.mainnet.sui.io:443',
  priceServiceUrl: process.env.PYTH_PRICE_SERVICE_URL ?? 'https://hermes.pyth.network',
  pythStateId: requireEnv('PYTH_STATE_ID', '0x1f9310238ee9298fb703c3419030b35b22bb1cc37113e3bb5007c99aec79e5b8'),
  wormholeStateId: requireEnv('WORMHOLE_STATE_ID', '0xaeab97f96cf9877fee2883315d459552b2b921edc16d7ceac6eab944dd88919c'),
  oraclePackageId: requireEnv('ORACLE_PACKAGE_ID', '0x9a7f6bb7cdad3343846381f4a0b43552adee23fd051fd450532bbd5981f0ac96'),
  oracleModuleName: process.env.PYTH_ORACLE_MODULE ?? 'port_oracle',
  priceFeedId: requireEnv('PYTH_PRICE_ID', '0x23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744'),
  suiPrivateKey: requireEnv('SUI_PRIVATE_KEY', process.env.SUI_KEY),
  defaultMaxPriceAgeSec: Number.parseInt(process.env.DEFAULT_PRICE_MAX_AGE ?? '60', 10),
};

export default config;
