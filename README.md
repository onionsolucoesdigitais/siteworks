# Site Works
Gerador de mini-sites para empresas a partir do CNPJ (dados via BrasilAPI). Sem dependências.

    cp .env.example .env   # defina ADMIN_PASSWORD e BASE_DOMAIN
    npm start              # http://localhost:3000

- `/` landing · `/painel` dashboard (login por senha)
- Sites publicados: `/s/<slug>`, `<slug>.BASE_DOMAIN` (DNS wildcard apontando ao servidor) ou domínio próprio
- Campo de meta tag `facebook-domain-verification` e Pixel Meta por site
- Dados em `data/sites.json`

## Deploy com HTTPS (Docker + Caddy, certificados Let's Encrypt automáticos)

1. VPS com Docker e portas 80/443 liberadas.
2. DNS: registro `A` de `BASE_DOMAIN` **e** `*.BASE_DOMAIN` (wildcard) apontando para o IP do servidor.
   Para domínio próprio de um site: `A` do domínio para o mesmo IP e preencher "Domínio próprio" no painel.
3. `cp .env.example .env` e preencha `ADMIN_PASSWORD`, `BASE_DOMAIN`, `ACME_EMAIL`.
4. `docker compose up -d --build`

O certificado de cada domínio/subdomínio é emitido na primeira visita, e só para sites **publicados**
(o Caddy consulta `/api/domain-check`). Painel: `https://BASE_DOMAIN/painel`.
Backup: copie a pasta `data/`.
