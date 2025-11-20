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
    const { priceId, maxAgeSec } = req.body ?? {};
    const result = await oracleService.updatePriceAndFetch({ priceId, maxAgeSec });

    res.json({
      message: 'Price updated successfully',
      priceId: priceId ?? config.priceFeedId,
      maxAgeSec: maxAgeSec ?? config.defaultMaxPriceAgeSec,
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

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({
    message: 'Unhandled server error',
    error: err.message,
  });
});

app.listen(config.port, () => {
  console.log(`Pyth price service running on port ${config.port}`);
});
