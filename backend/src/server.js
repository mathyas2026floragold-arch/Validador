import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { safeCardPayload } from './utils/card.js';
import { getCache, setCache, purgeCache, cacheStats } from './services/cache.js';
import { addQueryLog, dashboardMetrics, getLogs } from './services/logs.js';
import { queryProviders, listProviders, updateProvider } from './services/providers.js';
import { corsMiddleware, helmetMiddleware, publicRateLimit, requireAdmin } from './middleware/security.js';

const app = express();
const startedAt = new Date();

app.set('trust proxy', 1);
app.use(helmetMiddleware());
app.use(corsMiddleware());
app.use(express.json({ limit: '16kb' }));

app.get('/api/status', async (_req, res) => {
  const cache = await cacheStats();
  res.json({
    ok: true,
    service: 'validador-cartao-api',
    uptime_seconds: Math.round((Date.now() - startedAt.getTime()) / 1000),
    cache,
    aviso: 'API técnica; não confirma saldo, titularidade ou autorização.'
  });
});

app.post('/api/validar-cartao', publicRateLimit(), async (req, res) => {
  const started = Date.now();
  let logSource = 'local_only';
  let status = 'ok';

  try {
    const payload = safeCardPayload(req.body?.cardNumber);

    if (!payload.digits) {
      status = 'invalid_input';
      return res.status(400).json({ ok: false, error: 'Informe o número do cartão.' });
    }

    if (!payload.isLengthValid) {
      status = 'invalid_length';
      return res.status(422).json({
        ok: false,
        error: 'Comprimento inválido. Use entre 12 e 19 dígitos.',
        bandeira: payload.brand,
        mascarado: payload.masked || null,
        aviso: 'Validação técnica; não confirma saldo, titularidade ou autorização.'
      });
    }

    const binsToTry = [payload.bin8, payload.bin6].filter(Boolean);
    let binInfo = null;
    let usedBin = payload.bin8 || payload.bin6;

    for (const bin of binsToTry) {
      binInfo = await getCache(bin);
      if (binInfo) {
        usedBin = bin;
        logSource = 'cache';
        break;
      }
    }

    if (!binInfo) {
      for (const bin of binsToTry) {
        const providerData = await queryProviders(bin);
        if (providerData) {
          usedBin = bin;
          binInfo = await setCache(bin, providerData);
          logSource = providerData.source || 'provider';
          break;
        }
      }
    }

    const response = {
      ok: true,
      luhn: payload.luhn,
      bandeira: binInfo?.brand || payload.brand,
      bin: usedBin,
      final: payload.last4,
      mascarado: payload.masked,
      tipo: binInfo?.type || null,
      categoria: binInfo?.category || null,
      pais: binInfo?.country || null,
      banco: binInfo?.bank || null,
      origem: binInfo ? logSource : 'local_only',
      atualizado_em: binInfo?.updated_at || null,
      aviso: 'Validação técnica; não confirma saldo, titularidade ou autorização.'
    };

    await addQueryLog({
      bin: usedBin,
      last4: payload.last4,
      masked: payload.masked,
      luhnValid: payload.luhn,
      brandDetected: payload.brand,
      source: response.origem,
      responseMs: Date.now() - started,
      ip: req.ip,
      userAgent: req.header('user-agent'),
      status
    });

    return res.json(response);
  } catch (error) {
    status = 'server_error';
    await addQueryLog({
      source: logSource,
      responseMs: Date.now() - started,
      ip: req.ip,
      userAgent: req.header('user-agent'),
      status
    });
    return res.status(500).json({ ok: false, error: 'Erro controlado ao validar consulta.' });
  }
});

app.get('/api/admin/dashboard', requireAdmin, async (_req, res) => {
  const metrics = await dashboardMetrics();
  const cache = await cacheStats();
  res.json({ ok: true, metrics, cache, providers: listProviders() });
});

app.get('/api/admin/logs', requireAdmin, async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 100), 500);
  res.json({ ok: true, logs: await getLogs(limit) });
});

app.get('/api/admin/providers', requireAdmin, (_req, res) => {
  res.json({ ok: true, providers: listProviders() });
});

app.patch('/api/admin/providers/:id', requireAdmin, (req, res) => {
  const provider = updateProvider(req.params.id, req.body || {});
  if (!provider) return res.status(404).json({ ok: false, error: 'Provedor não encontrado.' });
  return res.json({ ok: true, provider });
});

app.post('/api/admin/cache/purge', requireAdmin, async (req, res) => {
  const result = await purgeCache(req.body?.bin);
  return res.json(result);
});

app.use((_req, res) => {
  res.status(404).json({ ok: false, error: 'Rota não encontrada.' });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`Validador de Cartão API rodando na porta ${port}`);
});
