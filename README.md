# Site Works (Cloudflare Workers)

Gerador de mini-sites a partir do CNPJ. `/` landing · `/painel` dashboard (login por senha).

## Deploy
1. Conecte o repositório em Workers & Pages (build: `npx wrangler deploy`) ou rode `npm run deploy`.
   O KV `DB` é criado automaticamente no primeiro deploy.
2. Em **Settings → Variables and Secrets** do Worker, crie o secret `ADMIN_PASSWORD`
   (ou `npx wrangler secret put ADMIN_PASSWORD`).
3. Ajuste `BASE_DOMAIN` em `wrangler.jsonc` para o seu domínio (ex. `seudominio.com.br`).
4. Para sites em subdomínio: adicione a rota `*.seudominio.com.br/*` ao Worker e um DNS `*` proxied.

## Desenvolvimento
Crie `.dev.vars` com `ADMIN_PASSWORD=...` e rode `npm run dev`.
