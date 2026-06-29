import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(
  cors({
    origin: [process.env.CLIENT_URL ?? 'http://localhost:5173'],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'butterbloombatter-api' });
});

// TODO (Phase 2): mount auth, products, categories, customers, orders, finance, dashboard routes

app.listen(PORT, () => {
  console.log(`🍪 ButterBloomBatter API listening on http://localhost:${PORT}`);
});
