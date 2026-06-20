import path from 'node:path';
import { readJson, writeJson } from '../utils/files.js';
import { hashValue } from '../utils/hash.js';

const DATA_DIR = process.env.DATA_DIR || './data';
const LOG_FILE = path.resolve(DATA_DIR, 'query-logs.json');
const MAX_LOGS = 1000;

export async function addQueryLog({ bin, last4, masked, luhnValid, brandDetected, source, responseMs, ip, userAgent, status }) {
  const logs = await readJson(LOG_FILE, []);
  const safeLog = {
    id: `log_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    bin: bin || null,
    last4: last4 || null,
    masked: masked || null,
    luhn_valid: Boolean(luhnValid),
    brand_detected: brandDetected || null,
    source: source || 'local_only',
    response_ms: Number(responseMs || 0),
    ip_hash: hashValue(ip || ''),
    user_agent_hash: hashValue(userAgent || ''),
    status: status || 'ok',
    created_at: new Date().toISOString()
  };

  logs.unshift(safeLog);
  await writeJson(LOG_FILE, logs.slice(0, MAX_LOGS));
  return safeLog;
}

export async function getLogs(limit = 100) {
  const logs = await readJson(LOG_FILE, []);
  return logs.slice(0, Number(limit || 100));
}

export async function dashboardMetrics() {
  const logs = await readJson(LOG_FILE, []);
  const today = new Date().toISOString().slice(0, 10);
  const todayLogs = logs.filter(log => String(log.created_at || '').startsWith(today));
  const cacheHits = logs.filter(log => log.source === 'cache').length;
  const errors = logs.filter(log => log.status !== 'ok').length;
  const avgMs = logs.length ? Math.round(logs.reduce((acc, log) => acc + Number(log.response_ms || 0), 0) / logs.length) : 0;
  const providerFailures = logs.filter(log => log.status === 'provider_error').length;

  return {
    total_consultas: logs.length,
    consultas_hoje: todayLogs.length,
    cache_hit_percent: logs.length ? Math.round((cacheHits / logs.length) * 100) : 0,
    tempo_medio_ms: avgMs,
    erros: errors,
    api_falhas: providerFailures
  };
}
