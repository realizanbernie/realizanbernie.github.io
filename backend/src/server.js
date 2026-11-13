'use strict';

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');

const app = express();
const port = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',').map(value => value.trim()).filter(Boolean);

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required. See backend/.env.example.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

pool.on('error', error => {
  console.error('Unexpected idle PostgreSQL client error:', error.message);
});

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    // No Origin is allowed for health checks and server-to-server requests.
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
  maxAge: 600
}));
app.use(express.json({ limit: '100kb' }));
app.use('/api/', rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false
}));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'fiber-power-computing-api' });
});

app.get('/api/v1/ready', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ready', database: 'connected' });
  } catch (error) {
    console.error('Readiness check failed:', error.message);
    res.status(503).json({ status: 'not_ready', database: 'unavailable' });
  }
});

// Deliberately no unauthenticated router/OLT commands or credential endpoints.
// Device integrations will be added behind authenticated, role-checked routes.
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

app.use((error, _req, res, _next) => {
  if (error.message === 'Origin is not allowed by CORS') {
    return res.status(403).json({ error: 'Origin not allowed' });
  }
  console.error('Unhandled request error:', error.message);
  return res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(port, () => {
  console.log(`Fiber Power Computing API listening on port ${port}`);
});

async function shutdown(signal) {
  console.log(`${signal} received; shutting down`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
