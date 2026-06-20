import crypto from 'node:crypto';

const providerState = {
  binlist: {
    id: 'binlist',
    name: 'Binlist',
    enabled: String(process.env.BINLIST_ENABLED || 'true') === 'true',
    priority: 20,
    timeout_ms: Number(process.env.BINLIST_TIMEOUT_MS || 4500),
    fail_count: 0,
    last_error_at: null
  },
  custom: {
    id: 'custom',
    name: process.env.CUSTOM_BIN_API_NAME || 'custom',
    enabled: String(process.env.CUSTOM_BIN_API_ENABLED || 'false') === 'true',
    priority: 10,
    timeout_ms: Number(process.env.CUSTOM_BIN_API_TIMEOUT_MS || 5000),
    fail_count: 0,
    last_error_at: null
  }
};

function hashRaw(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value || {})).digest('hex').slice(0, 32);
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeBinlist(data, source = 'binlist') {
  return {
    scheme: data.scheme || null,
    brand: data.scheme ? String(data.scheme).replace(/^./, c => c.toUpperCase()) : null,
    type: data.type || null,
    category: data.brand || null,
    country: data.country?.alpha2 || data.country?.name || null,
    bank: data.bank?.name || null,
    source,
    confidence: 'provider',
    raw_hash: hashRaw(data)
  };
}

function normalizeCustom(data, source = 'custom') {
  // Aceita diversos formatos comuns de APIs de BIN/IIN autorizadas.
  const country = data.country || data.country_code || data.countryCode || data.country_name || data.countryName || null;
  const bank = data.bank || data.bank_name || data.issuer || data.issuer_name || data.institution || null;
  const brand = data.brand || data.scheme || data.network || data.card_brand || null;
  const type = data.type || data.card_type || data.cardType || null;
  const category = data.category || data.level || data.card_level || null;

  return {
    scheme: data.scheme || brand || null,
    brand: brand || null,
    type: type || null,
    category: category || null,
    country: typeof country === 'object' ? country.alpha2 || country.name || null : country,
    bank: typeof bank === 'object' ? bank.name || null : bank,
    source,
    confidence: 'provider',
    raw_hash: hashRaw(data)
  };
}

async function queryBinlist(bin) {
  const state = providerState.binlist;
  if (!state.enabled) return null;
  const response = await fetchWithTimeout(`https://lookup.binlist.net/${encodeURIComponent(bin)}`, {
    headers: {
      'Accept-Version': '3',
      'User-Agent': 'validador-cartao/1.0 (+authorized-bin-lookup)'
    }
  }, state.timeout_ms);

  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Binlist HTTP ${response.status}`);
  const data = await response.json();
  return normalizeBinlist(data, 'binlist');
}

async function queryCustom(bin) {
  const state = providerState.custom;
  if (!state.enabled) return null;

  const template = process.env.CUSTOM_BIN_API_URL_TEMPLATE;
  if (!template) return null;

  const url = template.replace('{bin}', encodeURIComponent(bin));
  const headers = {
    'Accept': 'application/json',
    'User-Agent': 'validador-cartao/1.0 (+authorized-bin-lookup)'
  };

  const apiKey = process.env.CUSTOM_BIN_API_KEY;
  const apiHeader = process.env.CUSTOM_BIN_API_KEY_HEADER || 'Authorization';
  if (apiKey) {
    headers[apiHeader] = apiHeader.toLowerCase() === 'authorization' ? `Bearer ${apiKey}` : apiKey;
  }

  const response = await fetchWithTimeout(url, { headers }, state.timeout_ms);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Custom provider HTTP ${response.status}`);
  const data = await response.json();
  return normalizeCustom(data, state.name || 'custom');
}

async function safeProviderCall(providerId, bin) {
  try {
    const result = providerId === 'custom' ? await queryCustom(bin) : await queryBinlist(bin);
    return result;
  } catch (error) {
    providerState[providerId].fail_count += 1;
    providerState[providerId].last_error_at = new Date().toISOString();
    providerState[providerId].last_error = error.message;
    return null;
  }
}

export async function queryProviders(bin) {
  const order = Object.values(providerState)
    .filter(provider => provider.enabled)
    .sort((a, b) => a.priority - b.priority);

  for (const provider of order) {
    const result = await safeProviderCall(provider.id, bin);
    if (result && (result.bank || result.country || result.type || result.brand)) {
      return result;
    }
  }

  return null;
}

export function listProviders() {
  return Object.values(providerState).map(provider => ({ ...provider }));
}

export function updateProvider(id, payload = {}) {
  if (!providerState[id]) return null;
  if (typeof payload.enabled === 'boolean') providerState[id].enabled = payload.enabled;
  if (Number.isFinite(Number(payload.priority))) providerState[id].priority = Number(payload.priority);
  if (Number.isFinite(Number(payload.timeout_ms))) providerState[id].timeout_ms = Number(payload.timeout_ms);
  return { ...providerState[id] };
}
