const API_BASE_URL = window.APP_CONFIG?.API_BASE_URL || "http://localhost:3000";

const form = document.querySelector('#card-form');
const input = document.querySelector('#card-number');
const button = document.querySelector('#submit-button');
const emptyState = document.querySelector('#state-empty');
const resultGrid = document.querySelector('#result-grid');
const maskedBox = document.querySelector('#masked-box');
const message = document.querySelector('#message');

const fields = {
  luhn: document.querySelector('#res-luhn'),
  brand: document.querySelector('#res-brand'),
  bank: document.querySelector('#res-bank'),
  country: document.querySelector('#res-country'),
  type: document.querySelector('#res-type'),
  source: document.querySelector('#res-source'),
  masked: document.querySelector('#res-masked')
};

function formatCard(value) {
  return value
    .replace(/\D/g, '')
    .slice(0, 19)
    .replace(/(.{4})/g, '$1 ')
    .trim();
}

function setMessage(text, variant = '') {
  message.textContent = text || '';
  message.className = `message ${variant}`.trim();
}

function renderResult(data) {
  emptyState.classList.add('hidden');
  resultGrid.classList.remove('hidden');
  maskedBox.classList.remove('hidden');

  fields.luhn.textContent = data.luhn ? 'Válido' : 'Inválido';
  fields.brand.textContent = data.bandeira || '-';
  fields.bank.textContent = data.banco || 'Não retornado';
  fields.country.textContent = data.pais || 'Não retornado';
  fields.type.textContent = data.tipo || 'Não retornado';
  fields.source.textContent = data.origem || '-';
  fields.masked.textContent = data.mascarado || '-';

  if (data.origem === 'local_only') {
    setMessage('Resultado parcial: nenhuma fonte externa autorizada retornou dados para este BIN.', 'warning');
  } else {
    setMessage(data.aviso || 'Consulta concluída.');
  }
}

input.addEventListener('input', event => {
  event.target.value = formatCard(event.target.value);
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  const cardNumber = input.value;

  button.disabled = true;
  button.textContent = 'Consultando...';
  setMessage('');

  try {
    const response = await fetch(`${API_BASE_URL}/api/validar-cartao`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardNumber })
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      setMessage(data.error || 'Não foi possível validar agora.', 'error');
      return;
    }

    renderResult(data);
  } catch (error) {
    setMessage('Não foi possível conectar com a API. Confira se o back-end está online.', 'error');
  } finally {
    button.disabled = false;
    button.textContent = 'Consultar';
  }
});
