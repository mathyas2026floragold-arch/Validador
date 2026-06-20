# Validador de Cartão — Consulta BIN/IIN com Cache e Painel Admin

Projeto gerado conforme o laudo técnico: front-end no Netlify, back-end no Render, validação local, cache por BIN, fallback por provedores autorizados e painel administrativo sem armazenar PAN completo.

## O que este sistema faz

- Valida o número pelo algoritmo Luhn.
- Detecta bandeira provável por prefixo e tamanho.
- Consulta metadados de BIN/IIN por fontes autorizadas.
- Usa cache local para reduzir chamadas externas.
- Retorna resultado mascarado, com BIN e final 4.
- Exibe painel admin com métricas, logs sem PAN completo e status dos provedores.

## O que este sistema NÃO faz

- Não testa saldo.
- Não confirma titularidade.
- Não confirma se o cartão está ativo.
- Não processa pagamento.
- Não coleta CVV, senha, token 3DS ou dados de autenticação.
- Não usa scraping para burlar limites de sites de terceiros.
- Não salva número completo do cartão em banco, logs ou URL.

## Estrutura

```txt
validador-cartao-projeto/
├── backend/               # API Node.js/Express para Render
├── frontend/              # Site estático para Netlify
├── database/              # Schema SQL sugerido
├── docs/                  # Documentação rápida do projeto
├── render.yaml            # Configuração opcional para Render
└── README.md
```

## Rodar localmente

### 1. Back-end

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

API local:

```txt
http://localhost:3000
```

### 2. Front-end

Abra `frontend/index.html` no navegador ou use um servidor estático:

```bash
cd frontend
python -m http.server 8080
```

Depois acesse:

```txt
http://localhost:8080
```

No arquivo `frontend/assets/config.js`, ajuste a URL da API se necessário.

## Variáveis de ambiente do back-end

Veja `backend/.env.example`.

Principais:

```env
PORT=3000
NODE_ENV=production
FRONTEND_ORIGIN=https://seu-site.netlify.app
ADMIN_TOKEN=troque-este-token-admin
CACHE_TTL_DAYS=60
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=30
BINLIST_ENABLED=true
CUSTOM_BIN_API_ENABLED=false
CUSTOM_BIN_API_URL_TEMPLATE=
CUSTOM_BIN_API_KEY=
```

## Deploy no Render

1. Crie um repositório no GitHub com estes arquivos.
2. No Render, crie um **Web Service**.
3. Root directory: `backend`
4. Build command:

```bash
npm install
```

5. Start command:

```bash
npm start
```

6. Configure as variáveis de ambiente do `.env.example` no painel do Render.

## Deploy no Netlify

1. Suba o projeto para GitHub.
2. No Netlify, crie um novo site apontando para a pasta `frontend`.
3. Atualize `frontend/assets/config.js` com a URL pública do Render:

```js
window.APP_CONFIG = {
  API_BASE_URL: "https://seu-backend.onrender.com"
};
```

## Endpoints

### Público controlado

```txt
POST /api/validar-cartao
GET  /api/status
```

### Admin

Usam header:

```txt
x-admin-token: seu-token-admin
```

Endpoints:

```txt
GET    /api/admin/dashboard
GET    /api/admin/logs
GET    /api/admin/providers
POST   /api/admin/cache/purge
PATCH  /api/admin/providers/:id
```

## Exemplo de consulta

```bash
curl -X POST http://localhost:3000/api/validar-cartao \
  -H "Content-Type: application/json" \
  -d '{"cardNumber":"4111 1111 1111 1111"}'
```

Resposta esperada:

```json
{
  "ok": true,
  "luhn": true,
  "bandeira": "Visa",
  "bin": "41111111",
  "final": "1111",
  "mascarado": "41111111****1111",
  "tipo": null,
  "pais": null,
  "banco": null,
  "origem": "local_only",
  "aviso": "Validação técnica; não confirma saldo, titularidade ou autorização."
}
```

## Observações de segurança

- Use sempre HTTPS em produção.
- Não envie cartão por GET/query string.
- Não adicione logs com `cardNumber` completo.
- Não salve CVV em nenhum lugar.
- Deixe chaves de API somente no back-end.
- Configure `FRONTEND_ORIGIN` para o domínio real do Netlify.
- Troque `ADMIN_TOKEN` antes do deploy.

