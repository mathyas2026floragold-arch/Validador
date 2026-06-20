const API_BASE_URL = window.APP_CONFIG?.API_BASE_URL || "http://localhost:3000";

const tokenInput = document.querySelector('#admin-token');
const loadButton = document.querySelector('#load-dashboard');
const dashboard = document.querySelector('#dashboard');
const adminMessage = document.querySelector('#admin-message');

function setAdminMessage(text, variant = '') {
  adminMessage.textContent = text || '';
  adminMessage.className = `message ${variant}`.trim();
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-admin-token': tokenInput.value.trim()
  };
}

function fmtDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR');
}

function renderDashboard(payload) {
  document.querySelector('#metric-today').textContent = payload.metrics?.consultas_hoje ?? 0;
  document.querySelector('#metric-cache-hit').textContent = `${payload.metrics?.cache_hit_percent ?? 0}%`;
  document.querySelector('#metric-avg').textContent = `${payload.metrics?.tempo_medio_ms ?? 0}ms`;
  document.querySelector('#metric-api-fail').textContent = payload.metrics?.api_falhas ?? 0;

  const providersBody = document.querySelector('#providers-body');
  providersBody.innerHTML = '';
  for (const provider of payload.providers || []) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${provider.name}</td>
      <td>${provider.enabled ? 'Ativo' : 'Inativo'}</td>
      <td>${provider.priority}</td>
      <td>${provider.timeout_ms}ms</td>
      <td>${provider.fail_count || 0}</td>
      <td>${provider.last_error_at ? fmtDate(provider.last_error_at) : '-'}</td>
    `;
    providersBody.appendChild(row);
  }
}

function renderLogs(payload) {
  const logsBody = document.querySelector('#logs-body');
  logsBody.innerHTML = '';

  for (const log of payload.logs || []) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${fmtDate(log.created_at)}</td>
      <td>${log.bin || '-'}</td>
      <td>${log.last4 || '-'}</td>
      <td>${log.brand_detected || '-'}</td>
      <td>${log.source || '-'}</td>
      <td>${log.status || '-'}</td>
      <td>${log.response_ms || 0}ms</td>
    `;
    logsBody.appendChild(row);
  }
}

loadButton.addEventListener('click', async () => {
  if (!tokenInput.value.trim()) {
    setAdminMessage('Informe o token admin.', 'error');
    return;
  }

  loadButton.disabled = true;
  loadButton.textContent = 'Carregando...';
  setAdminMessage('');

  try {
    const [dashboardRes, logsRes] = await Promise.all([
      fetch(`${API_BASE_URL}/api/admin/dashboard`, { headers: authHeaders() }),
      fetch(`${API_BASE_URL}/api/admin/logs?limit=100`, { headers: authHeaders() })
    ]);

    const dashboardData = await dashboardRes.json();
    const logsData = await logsRes.json();

    if (!dashboardRes.ok || !logsRes.ok) {
      setAdminMessage(dashboardData.error || logsData.error || 'Acesso negado ou API indisponível.', 'error');
      return;
    }

    renderDashboard(dashboardData);
    renderLogs(logsData);
    dashboard.classList.remove('hidden');
    setAdminMessage('Painel carregado com dados mascarados.');
  } catch (error) {
    setAdminMessage('Falha ao conectar com o back-end.', 'error');
  } finally {
    loadButton.disabled = false;
    loadButton.textContent = 'Carregar painel';
  }
});
