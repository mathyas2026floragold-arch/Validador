import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

export function helmetMiddleware() {
  return helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  });
}

export function corsMiddleware() {
  const allowedOrigin = process.env.FRONTEND_ORIGIN || '*';
  return cors({
    origin(origin, callback) {
      if (!origin || allowedOrigin === '*' || origin === allowedOrigin) {
        return callback(null, true);
      }
      return callback(new Error('Origem não permitida pelo CORS'));
    },
    methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-admin-token'],
    credentials: false
  });
}

export function publicRateLimit() {
  return rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
    limit: Number(process.env.RATE_LIMIT_MAX || 30),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      ok: false,
      error: 'Muitas consultas. Tente novamente em instantes.'
    }
  });
}

export function requireAdmin(req, res, next) {
  const expected = process.env.ADMIN_TOKEN;
  const received = req.header('x-admin-token');

  if (!expected || expected === 'troque-este-token-admin') {
    return res.status(500).json({
      ok: false,
      error: 'ADMIN_TOKEN não configurado de forma segura no servidor.'
    });
  }

  if (!received || received !== expected) {
    return res.status(401).json({ ok: false, error: 'Acesso admin não autorizado.' });
  }

  return next();
}
