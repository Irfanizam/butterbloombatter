import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import categoryRoutes from './routes/category.routes';
import customerRoutes from './routes/customer.routes';
import orderRoutes from './routes/order.routes';
import financeRoutes from './routes/finance.routes';
import dashboardRoutes from './routes/dashboard.routes';
import inquiryRoutes from './routes/inquiry.routes';
import reviewRoutes from './routes/review.routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

const app = express();
const PORT = Number(process.env.PORT) || 4000;

// CLIENT_URL may be a comma-separated allowlist, e.g.
// "https://butterbloombatter.vercel.app,http://localhost:5173"
const allowedOrigins = (process.env.CLIENT_URL ?? 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
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
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/reviews', reviewRoutes);

// 404 + error handling (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🍪 ButterBloomBatter API listening on http://localhost:${PORT}`);
});
