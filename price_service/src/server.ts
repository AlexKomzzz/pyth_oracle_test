import express, { NextFunction, Request, Response } from 'express';
import config from './config.js';
import { oracleService } from './oracleService.js';

const app = express();
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.post('/price/update', async (req: Request, res: Response) => {
  try {
    const { priceId, maxAgeSec, coinType } = req.body ?? {};
    const result = await oracleService.updatePriceAndFetch({ priceId, maxAgeSec, coinType });

    res.json({
      message: 'Price updated successfully',
      priceId: priceId ?? config.priceFeedId,
      maxAgeSec: maxAgeSec ?? config.defaultMaxPriceAgeSec,
      coinType: coinType ?? '',
      ...result,
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      message: 'Failed to update price or get value from contract',
      error: err.message,
    });
  }
});

app.post('/price/update-two', async (req: Request, res: Response) => {
  try {
    const { token1, token2, createPort } = req.body ?? {};

    if (!token1 || !token1.priceId || !token1.coinType) {
      return res.status(400).json({
        message: 'Missing required fields for token1: priceId and coinType',
      });
    }

    if (!token2 || !token2.priceId || !token2.coinType) {
      return res.status(400).json({
        message: 'Missing required fields for token2: priceId and coinType',
      });
    }

    const result = await oracleService.updateTwoPricesAndFetch({
      token1: {
        priceId: token1.priceId,
        coinType: token1.coinType,
      },
      token2: {
        priceId: token2.priceId,
        coinType: token2.coinType,
      },
      createPort: createPort ? {
        startCoinAId: createPort.startCoinAId,
        startCoinBId: createPort.startCoinBId,
        vaultConfig: createPort.vaultConfig,
        portRegistry: createPort.portRegistry,
        portOracle: createPort.portOracle,
        clmmGlobalConfig: createPort.clmmGlobalConfig,
        clmmVault: createPort.clmmVault,
        distributionConfig: createPort.distributionConfig,
        portPackageId: createPort.portPackageId,
        pool: createPort.pool,
        gauge: createPort.gauge,
        lowerOffset: createPort.lowerOffset,
        upperOffset: createPort.upperOffset,
        rebalanceThreshold: createPort.rebalanceThreshold,
        quoteTypeA: createPort.quoteTypeA,
        hardCap: createPort.hardCap,
      } : undefined,
    });

    res.json({
      message: createPort 
        ? 'Prices updated and port created successfully in one transaction'
        : 'Both prices updated successfully in one transaction',
      ...result,
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      message: 'Failed to update prices or get values from contract',
      error: err.message,
    });
  }
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({
    message: 'Unhandled server error',
    error: err.message,
  });
});

app.listen(config.port, () => {
  console.log(`Pyth price service running on port ${config.port}`);
});