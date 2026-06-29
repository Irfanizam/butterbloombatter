import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

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

// Routes
app.use('/api/auth', authRoutes);
// TODO (PR #2+): products, categories, customers, orders, finance, dashboard

// 404 + error handling (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🍪 ButterBloomBatter API listening on http://localhost:${PORT}`);
});
