import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import { config } from './config/config.js';
import { healthCheck } from './controllers/healthController.js';
import apiRoutes from './routes/apiRoutes.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// ─── Security ────────────────────────────────────────────────────────────────
app.use(helmet());

// ─── Rate Limiting (global) ───────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { success: false, message: 'Too many requests, please try again later.', errors: [] },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// ─── CORS ─────────────────────────────────────────────────────────────────────
// app.use(cors({
//   origin: [
//     "http://localhost:5173",
//     "http://localhost:5174"
//   ],
//   credentials: true,
// }));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:3000",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
      "https://near-hire-ai.vercel.app",
    ];

    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith(".vercel.app") ||
      origin.startsWith("http://localhost:") ||
      origin.startsWith("http://127.0.0.1:")
    ) {
      return callback(null, true);
    }

    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  optionsSuccessStatus: 200,
}));
// ─── Body Parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// ─── Root Health Check ────────────────────────────────────────────────────────
// GET /health
app.get('/health', healthCheck);

// ─── API Routes ───────────────────────────────────────────────────────────────
// GET /api/health  |  POST /api/auth/*  |  …
app.use('/api', apiRoutes);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use(notFoundHandler);

// ─── Centralised Error Handler ────────────────────────────────────────────────
app.use(errorHandler);

export default app;
