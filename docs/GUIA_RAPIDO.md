# Guia rápido

## Fluxo da consulta

1. Usuário digita o número no front-end.
2. Front-end envia via POST para `/api/validar-cartao`.
3. Back-end sanitiza e valida Luhn.
4. Back-end detecta bandeira provável.
5. Back-end extrai BIN 8 e BIN 6.
6. Back-end consulta cache.
7. Se não tiver cache, consulta provedor autorizado.
8. Back-end salva apenas metadados do BIN.
9. Front-end recebe JSON seguro e mostra cards.

## Segurança aplicada

- POST em vez de GET.
- Máscara visual no front-end.
- Logs sem PAN completo.
- Chaves de API somente no back-end.
- Rate limit.
- CORS restrito.
- Admin token para painel.

## Próximos passos

- Conectar Supabase/PostgreSQL se quiser persistência real em banco.
- Adicionar Redis para cache de alto volume.
- Adicionar provedor premium autorizado em `CUSTOM_BIN_API_URL_TEMPLATE`.
- Ativar autenticação admin completa com usuário/senha e 2FA.
