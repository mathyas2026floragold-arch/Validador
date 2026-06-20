const DEFAULT_API = 'https://ai-trader-backend-mgwt.onrender.com';
const API = localStorage.getItem('API_URL') || DEFAULT_API;
const $ = (id) => document.getElementById(id);
const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
let charts = {};

async function api(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: {'Content-Type':'application/json'},
    ...opts
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function setText(id, value) { const el = $(id); if (el) el.textContent = value; }
function setClass(id, cls) { const el = $(id); if (el) el.className = cls; }
function addLog(text, type='info') {
  const logs = $('logs'); if (!logs) return;
  const row = document.createElement('div');
  row.className = `log ${type}`;
  row.innerHTML = `<span>${new Date().toLocaleTimeString('pt-BR')}</span><b>${text}</b>`;
  logs.prepend(row);
  while (logs.children.length > 20) logs.removeChild(logs.lastChild);
}
function chart(id, type, data, options={}) {
  const el = $(id); if (!el || typeof Chart === 'undefined') return;
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(el, {
    type,
    data,
    options: {
      responsive:true,
      maintainAspectRatio:false,
      plugins:{legend:{labels:{color:'#cbd6e6'}}},
      scales: type === 'doughnut' ? {} : {
        x:{ticks:{color:'#8da0b8'}, grid:{color:'#17263b'}},
        y:{ticks:{color:'#8da0b8'}, grid:{color:'#17263b'}}
      },
      ...options
    }
  });
}

function statusLabel(robot) {
  if (robot === 'running') return 'Executando';
  if (robot === 'paused') return 'Pausado';
  return 'Parado';
}
function connectionLabel(connected) {
  return connected ? 'IQ Option conectada · DEMO/PRACTICE' : 'IQ Option desconectada';
}

async function loadConfig() {
  try {
    const c = await api('/api/config');
    if ($('cfgDailyGoal')) $('cfgDailyGoal').value = c.daily_goal ?? 300;
    if ($('cfgEntry')) $('cfgEntry').value = c.entry_value ?? 2;
    if ($('cfgStopLoss')) $('cfgStopLoss').value = c.stop_loss ?? 50;
    if ($('cfgStopGain')) $('cfgStopGain').value = c.stop_gain ?? 100;
    if ($('cfgConf')) $('cfgConf').value = c.min_confidence ?? 75;
    if ($('cfgHours')) $('cfgHours').value = `${c.start_time || '08:00'} - ${c.end_time || '18:00'}`;
  } catch (e) { addLog('Não consegui carregar configurações da API', 'error'); }
}

async function refresh() {
  try {
    const d = await api('/api/dashboard');
    const c = d.cards || {};
    const stats = d.stats || {};
    const weekly = d.weekly || {};
    const opportunities = d.opportunities || [];
    const trades = d.trades || [];
    const best = opportunities[0] || {};

    setText('connText', connectionLabel(c.connected));
    setText('iqStatus', c.connected ? 'Online' : 'Offline');
    setText('accountMode', c.connected ? 'DEMO/PRACTICE' : 'Aguardando login');
    setText('robotStatus', statusLabel(c.robot));
    setText('sideRobotStatus', statusLabel(c.robot));
    setText('currentBalance', fmt(c.current_balance));
    setText('initialBalance', fmt(c.initial_balance));
    setText('dailyProfit', fmt(c.daily_profit));
    setText('winRate', `${c.win_rate || 0}%`);
    setText('opsToday', stats.operations || 0);
    setText('dailyGoal', fmt(c.daily_goal));
    setText('goalPctBig', `${c.goal_pct || 0}%`);
    setText('weeklyProfit', fmt(weekly.profit));
    setText('weeklyMissing', fmt(Math.max(0, (weekly.goal || 0) - (weekly.profit || 0))));
    setText('totalWins', fmt(weekly.total_wins));
    setText('totalLosses', fmt(weekly.total_losses));
    setText('netProfit', fmt((weekly.profit || 0)));
    setText('nextAsset', best.asset || 'Aguardando');
    setText('nextAction', best.action || 'AGUARDAR');
    setText('nextTime', best.best_time || '--:--');
    setText('nextConfidence', `${best.probability || 0}%`);
    setText('robotMessage', c.robot === 'running' ? 'Robô analisando oportunidades em tempo real.' : 'Robô parado/pausado. Clique em iniciar após login demo.');
    const goalBar = $('goalBar'); if (goalBar) goalBar.style.width = `${c.goal_pct || 0}%`;
    setClass('dailyProfit', (c.daily_profit || 0) >= 0 ? 'green' : 'red');
    const anim = $('robotAnim'); if (anim) anim.classList.toggle('running', c.robot === 'running');

    chart('performanceChart','line',{
      labels:d.performance?.labels || [],
      datasets:[
        {label:'Lucro líquido', data:d.performance?.net || [], borderColor:'#27d865', backgroundColor:'rgba(39,216,101,.12)', fill:true, tension:.35},
        {label:'Perdas', data:d.performance?.losses || [], borderColor:'#ff4d55', backgroundColor:'rgba(255,77,85,.08)', fill:true, tension:.35}
      ]
    });
    chart('goalChart','doughnut',{
      labels:['Alcançado','Faltando'],
      datasets:[{data:[weekly.profit || 0, Math.max(0,(weekly.goal || 0)-(weekly.profit || 0))], backgroundColor:['#27d865','#26364e'], borderWidth:0}]
    });
    chart('barChart','bar',{
      labels: weekly.days || [],
      datasets:[
        {label:'Ganhos', data:weekly.wins || [], backgroundColor:'#27d865'},
        {label:'Perdas', data:(weekly.losses || []).map(x => -x), backgroundColor:'#ff4d55'}
      ]
    });
    chart('hoursChart','bar',{
      labels:d.hours?.labels || [],
      datasets:[{label:'Acerto %', data:d.hours?.values || [], backgroundColor:'#27d865'}]
    });

    const oppBox = $('opportunities');
    if (oppBox) oppBox.innerHTML = opportunities.map(o => `
      <div class="opp">
        <div><strong>${o.flag || ''} ${o.asset}</strong><small>${o.level} · ${o.trend || 'Analisando'} · melhor ${o.best_time}</small></div>
        <div><b class="${o.probability>=75?'green':o.probability>=62?'':'red'}">${o.probability}%</b> <span class="tag ${o.action}">${o.action}</span></div>
      </div>`).join('') || '<p>Nenhuma oportunidade no momento.</p>';

    const tradesBox = $('trades');
    if (tradesBox) tradesBox.innerHTML = trades.map(t => `
      <tr><td>${t.time}</td><td>${t.asset}</td><td>${t.direction}</td><td>${fmt(t.amount)}</td><td class="${t.result==='WIN'?'green':'red'}">${t.result}</td><td class="${t.profit>=0?'green':'red'}">${fmt(t.profit)}</td><td>${t.strategy || '-'}</td></tr>`).join('') || '<tr><td colspan="7">Nenhuma operação ainda.</td></tr>';

    const aiBox = $('aiBox');
    if (aiBox) aiBox.innerHTML = `<b>Próxima análise:</b> ${best.asset || 'aguardando'}<br><b>Sinal:</b> <span class="tag ${best.action || 'AGUARDAR'}">${best.action || 'AGUARDAR'}</span><br><b>Confiança:</b> ${best.probability || 0}%<br><b>Janela:</b> ${best.best_time || '--:--'}<br><small>A IA só libera entrada se passar pela confiança mínima e regras de risco.</small>`;
  } catch(e) {
    setText('connText', 'API offline ou bloqueada');
    const aiBox = $('aiBox'); if (aiBox) aiBox.innerHTML = '<span class="red">API offline. Verifique o Render ou a URL da API.</span>';
    addLog('Falha ao buscar dashboard: ' + e.message, 'error');
  }
}

function setupUI() {
  document.querySelectorAll('[data-section]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-section]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('[data-page]').forEach(p => p.style.display = p.dataset.page === btn.dataset.section ? '' : 'none');
    });
  });
  document.querySelectorAll('[data-page]').forEach(p => { if (p.dataset.page !== 'dashboard') p.style.display = 'none'; });

  const loginOpen = $('loginOpen'), loginClose = $('loginClose'), loginModal = $('loginModal');
  if (loginOpen) loginOpen.onclick = () => loginModal?.classList.remove('hidden');
  if (loginClose) loginClose.onclick = () => loginModal?.classList.add('hidden');
  if ($('loginBtn')) $('loginBtn').onclick = async () => {
    try {
      const res = await api('/api/iq/login', {method:'POST', body:JSON.stringify({email:$('iqEmail')?.value || 'demo@teste.com', password:$('iqPassword')?.value || 'demo', account_type:$('iqType')?.value || 'PRACTICE'})});
      setText('loginMsg', res.message || 'Conectado.'); addLog('Login demo conectado', 'success'); await refresh(); setTimeout(()=>loginModal?.classList.add('hidden'), 700);
    } catch(e) { setText('loginMsg', 'Erro no login: use DEMO/PRACTICE.'); addLog('Login falhou', 'error'); }
  };
  if ($('startBtn')) $('startBtn').onclick = async () => { try { await api('/api/robot/start',{method:'POST'}); addLog('Robô iniciado', 'success'); refresh(); } catch(e){ alert('Faça login DEMO antes de iniciar.'); } };
  if ($('pauseBtn')) $('pauseBtn').onclick = async () => { await api('/api/robot/pause',{method:'POST'}); addLog('Robô pausado', 'info'); refresh(); };
  if ($('stopBtn')) $('stopBtn').onclick = async () => { await api('/api/robot/stop',{method:'POST'}); addLog('Robô parado', 'info'); refresh(); };
  if ($('saveConfig')) $('saveConfig').onclick = async () => {
    const [start='08:00', end='18:00'] = ($('cfgHours')?.value || '08:00 - 18:00').split('-').map(s => s.trim());
    await api('/api/config',{method:'POST',body:JSON.stringify({daily_goal:+$('cfgDailyGoal').value, weekly_goal:+$('cfgDailyGoal').value*5, entry_value:+$('cfgEntry').value, stop_loss:+$('cfgStopLoss').value, stop_gain:+$('cfgStopGain').value, max_operations:20, max_losses:3, start_time:start, end_time:end, min_confidence:+$('cfgConf').value, mode:'Balanceado'})});
    addLog('Configurações salvas', 'success'); alert('Configurações salvas'); refresh();
  };
}

setInterval(() => setText('clock', new Date().toLocaleTimeString('pt-BR')), 1000);
setupUI();
loadConfig();
refresh();
setInterval(refresh, 5000);
