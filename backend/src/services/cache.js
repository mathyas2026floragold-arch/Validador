import path from 'node:path';
import { readJson, writeJson } from '../utils/files.js';

const DATA_DIR = process.env.DATA_DIR || './data';
const CACHE_FILE = path.resolve(DATA_DIR, 'bin-cache.json');

function nowIso() {
  return new Date().toISOString();
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + Number(days || 60));
  return copy;
}

export async function getCache(bin) {
  if (!bin) return null;
  const cache = await readJson(CACHE_FILE, {});
  const item = cache[bin];
  if (!item) return null;

  if (item.expires_at && new Date(item.expires_at).getTime() < Date.now()) {
    delete cache[bin];
    await writeJson(CACHE_FILE, cache);
    return null;
  }

  return { ...item, source: item.source || 'cache', origin: 'cache' };
}

export async function setCache(bin, data) {
  if (!bin || !data) return null;
  const cache = await readJson(CACHE_FILE, {});
  const ttlDays = Number(process.env.CACHE_TTL_DAYS || 60);
  const existing = cache[bin];
  const timestamp = nowIso();

  const record = {
    id: existing?.id || `bin_${bin}`,
    bin,
    bin_length: bin.length,
    scheme: data.scheme || data.brand || null,
    brand: data.brand || data.scheme || null,
    type: data.type || null,
    category: data.category || data.level || null,
    country: data.country || null,
    bank: data.bank || null,
    source: data.source || 'provider',
    confidence: data.confidence || 'provider',
    raw_hash: data.raw_hash || null,
    created_at: existing?.created_at || timestamp,
    updated_at: timestamp,
    expires_at: addDays(new Date(), ttlDays).toISOString()
  };

  cache[bin] = record;
  await writeJson(CACHE_FILE, cache);
  return record;
}

export async function purgeCache(bin) {
  const cache = await readJson(CACHE_FILE, {});
  if (bin) {
    delete cache[bin];
  } else {
    const now = Date.now();
    for (const key of Object.keys(cache)) {
      if (!cache[key].expires_at || new Date(cache[key].expires_at).getTime() < now) {
        delete cache[key];
      }
    }
  }
  await writeJson(CACHE_FILE, cache);
  return { ok: true, remaining: Object.keys(cache).length };
}

export async function cacheStats() {
  const cache = await readJson(CACHE_FILE, {});
  const entries = Object.values(cache);
  return {
    total: entries.length,
    valid: entries.filter(item => !item.expires_at || new Date(item.expires_at).getTime() >= Date.now()).length,
    expired: entries.filter(item => item.expires_at && new Date(item.expires_at).getTime() < Date.now()).length
  };
}
