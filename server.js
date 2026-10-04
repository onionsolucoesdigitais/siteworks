// Site Works - gerador de mini-sites a partir do CNPJ. Sem dependencias externas.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { renderSite, THEMES, PAGES, robots, sitemap } = require('./render');

// .env simples
try {
  for (const line of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
} catch {}

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
const BASE_DOMAIN = (process.env.BASE_DOMAIN || 'localhost').toLowerCase();
const DB_FILE = path.join(__dirname, 'data', 'sites.json');
const PUBLIC = path.join(__dirname, 'public');
const sessions = new Set();

// ---------- armazenamento ----------
function load() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch { return []; }
}
function save(sites) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(sites, null, 2));
}
const slugify = (s) =>
  String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'empresa';
function uniqueSlug(base, sites, ignoreId) {
  let slug = base, i = 2;
  while (sites.some((s) => s.slug === slug && s.id !== ignoreId)) slug = `${base}-${i++}`;
  return slug;
}

// ---------- CNPJ ----------
function validCnpj(c) {
  c = c.replace(/\D/g, '');
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
  const calc = (len) => {
    let sum = 0, pos = len - 7;
    for (let i = len; i >= 1; i--) { sum += c[len - i] * pos--; if (pos < 2) pos = 9; }
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === +c[12] && calc(13) === +c[13];
}
async function lookupCnpj(cnpj) {
  const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, { headers: { accept: 'application/json', 'user-agent': 'Mozilla/5.0 SiteWorks' } });
  if (!r.ok) throw new Error(r.status === 404 ? 'CNPJ não encontrado' : 'Falha ao consultar o CNPJ, tente novamente');
  const d = await r.json();
  const title = (s) => String(s || '').toLowerCase().replace(/(^|\s)\S/g, (x) => x.toUpperCase());
  const name = title(d.nome_fantasia || d.razao_social);
  const addr = [
    [d.descricao_tipo_de_logradouro, d.logradouro].filter(Boolean).join(' '),
    d.numero, d.complemento, d.bairro,
    [d.municipio, d.uf].filter(Boolean).join('/'),
    d.cep && `CEP ${d.cep}`,
  ].filter(Boolean).map(title).join(', ').replace(/\/([a-z]{2}),/, (m, u) => '/' + u.toUpperCase() + ',');
  const activity = title(d.cnae_fiscal_descricao);
  const services = [activity, ...(d.cnaes_secundarios || []).slice(0, 5).map((c) => title(c.descricao))].filter(Boolean);
  const phone = d.ddd_telefone_1 ? d.ddd_telefone_1.replace(/^(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3') : '';
  return {
    cnpj, name, legalName: title(d.razao_social), address: addr,
    phone, email: (d.email || '').toLowerCase(),
    headline: name, tagline: activity,
    about: `A ${name} atua no segmento de ${activity.toLowerCase() || 'serviços'}, em ${title(d.municipio)}/${d.uf}, oferecendo atendimento de qualidade e compromisso com cada cliente.`,
    services,
  };
}

// ---------- HTTP helpers ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const json = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
const readBody = (req) => new Promise((resolve, reject) => {
  let b = '';
  req.on('data', (c) => { b += c; if (b.length > 1e6) { reject(new Error('Corpo muito grande')); req.destroy(); } });
  req.on('end', () => { try { resolve(b ? JSON.parse(b) : {}); } catch { reject(new Error('JSON inválido')); } });
});
const cookie = (req, name) => (req.headers.cookie || '').split(';').map((c) => c.trim().split('=')).find(([k]) => k === name)?.[1];
const authed = (req) => sessions.has(cookie(req, 'sw_session'));
const safeEq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

const EDITABLE = ['name', 'legalName', 'headline', 'tagline', 'about', 'services', 'phone', 'whatsapp', 'email', 'address', 'hours', 'theme', 'metaVerification', 'headCode', 'pixelId', 'customDomain', 'slug'];

function findSiteByHost(host, sites) {
  host = (host || '').split(':')[0].toLowerCase();
  const custom = sites.find((s) => s.customDomain && s.customDomain.toLowerCase() === host);
  if (custom) return custom;
  if (host.endsWith('.' + BASE_DOMAIN)) {
    const slug = host.slice(0, -BASE_DOMAIN.length - 1);
    return sites.find((s) => s.slug === slug);
  }
}

const MSG_FILE = path.join(__dirname, 'data', 'messages.json');
const loadMsgs = () => { try { return JSON.parse(fs.readFileSync(MSG_FILE, 'utf8')); } catch { return []; } };
const hits = new Map(); // limite simples por IP
function rateLimited(ip) {
  const now = Date.now(), arr = (hits.get(ip) || []).filter((t) => now - t < 3600e3);
  arr.push(now); hits.set(ip, arr);
  return arr.length > 5;
}

// sub: '' | pagina legal | robots.txt | sitemap.xml | contato
async function servePublicSite(req, res, site, sub, base) {
  if (!site || !site.published) {
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
    return res.end('<h1>Site não encontrado ou não publicado</h1>');
  }
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const origin = `${proto}://${req.headers.host}`;
  if (sub === 'robots.txt') { res.writeHead(200, { 'content-type': 'text/plain' }); return res.end(robots(origin, base)); }
  if (sub === 'sitemap.xml') { res.writeHead(200, { 'content-type': 'application/xml' }); return res.end(sitemap(origin, base)); }
  if (sub === 'contato' && req.method === 'POST') {
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    const b = await readBody(req);
    if (b.website) return json(res, 200, { ok: true }); // honeypot
    if (rateLimited(ip)) return json(res, 429, { error: 'Muitas mensagens, tente mais tarde' });
    const clean = (v, n) => String(v || '').trim().slice(0, n);
    const msg = { id: crypto.randomUUID(), siteId: site.id, siteName: site.name, name: clean(b.name, 100), email: clean(b.email, 120), phone: clean(b.phone, 30), message: clean(b.message, 2000), at: new Date().toISOString() };
    if (!msg.name || !/^\S+@\S+\.\S+$/.test(msg.email) || !msg.message) return json(res, 400, { error: 'Dados inválidos' });
    const all = loadMsgs(); all.push(msg);
    fs.mkdirSync(path.dirname(MSG_FILE), { recursive: true });
    fs.writeFileSync(MSG_FILE, JSON.stringify(all, null, 2));
    return json(res, 200, { ok: true });
  }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(renderSite(site, PAGES.includes(sub) ? sub : 'home', base, origin));
}

// ---------- API ----------
async function api(req, res, url) {
  const p = url.pathname;
  if (p === '/api/domain-check') {
    // Consultado pelo Caddy antes de emitir certificado (on-demand TLS)
    const d = (url.searchParams.get('domain') || '').toLowerCase();
    const ok = d === BASE_DOMAIN || findSiteByHost(d, load())?.published;
    res.writeHead(ok ? 200 : 404); return res.end();
  }
  if (p === '/api/login' && req.method === 'POST') {
    const { password } = await readBody(req);
    if (!safeEq(password || '', ADMIN_PASSWORD)) return json(res, 401, { error: 'Senha incorreta' });
    const t = crypto.randomBytes(24).toString('hex');
    sessions.add(t);
    res.setHeader('set-cookie', `sw_session=${t}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : ''}`);
    return json(res, 200, { ok: true });
  }
  if (p === '/api/logout' && req.method === 'POST') {
    sessions.delete(cookie(req, 'sw_session'));
    res.setHeader('set-cookie', 'sw_session=; Path=/; Max-Age=0');
    return json(res, 200, { ok: true });
  }
  if (!authed(req)) return json(res, 401, { error: 'Não autenticado' });

  if (p === '/api/config') return json(res, 200, { baseDomain: BASE_DOMAIN, port: PORT, themes: THEMES });

  if (p === '/api/messages' && req.method === 'GET') return json(res, 200, loadMsgs().reverse());
  const dm = p.match(/^\/api\/messages\/([\w-]+)$/);
  if (dm && req.method === 'DELETE') { fs.writeFileSync(MSG_FILE, JSON.stringify(loadMsgs().filter((m) => m.id !== dm[1]), null, 2)); return json(res, 200, { ok: true }); }

  const sites = load();
  if (p === '/api/sites' && req.method === 'GET') return json(res, 200, sites);

  if (p === '/api/sites' && req.method === 'POST') {
    const { cnpj: raw, metaVerification } = await readBody(req);
    const cnpj = String(raw || '').replace(/\D/g, '');
    if (!validCnpj(cnpj)) return json(res, 400, { error: 'CNPJ inválido' });
    if (sites.some((s) => s.cnpj === cnpj)) return json(res, 409, { error: 'Já existe um site para este CNPJ' });
    const data = await lookupCnpj(cnpj);
    const site = {
      id: crypto.randomUUID(), ...data,
      slug: uniqueSlug(slugify(data.name), sites),
      theme: 'azul', whatsapp: data.phone, hours: '', pixelId: '', customDomain: '',
      metaVerification: String(metaVerification || '').trim(),
      published: false, createdAt: new Date().toISOString(),
    };
    sites.push(site);
    save(sites);
    return json(res, 201, site);
  }

  const m = p.match(/^\/api\/sites\/([\w-]+)(\/publish|\/unpublish)?$/);
  if (m) {
    const idx = sites.findIndex((s) => s.id === m[1]);
    if (idx < 0) return json(res, 404, { error: 'Site não encontrado' });
    const site = sites[idx];
    if (m[2] && req.method === 'POST') {
      site.published = m[2] === '/publish';
      save(sites);
      return json(res, 200, site);
    }
    if (req.method === 'PUT') {
      const body = await readBody(req);
      for (const k of EDITABLE) if (k in body) site[k] = body[k];
      if (!Array.isArray(site.services)) site.services = String(site.services || '').split('\n').map((s) => s.trim()).filter(Boolean);
      site.slug = uniqueSlug(slugify(site.slug || site.name), sites, site.id);
      if (!THEMES[site.theme]) site.theme = 'azul';
      save(sites);
      return json(res, 200, site);
    }
    if (req.method === 'DELETE') {
      sites.splice(idx, 1);
      save(sites);
      return json(res, 200, { ok: true });
    }
  }
  json(res, 404, { error: 'Rota não encontrada' });
}

// ---------- servidor ----------
http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    const p = url.pathname;

    // Sites publicados em subdominio/dominio proprio
    const hostSite = findSiteByHost(req.headers.host, load());
    if (hostSite && !p.startsWith('/api/')) return await servePublicSite(req, res, hostSite, p.slice(1).replace(/\/$/, ''), '');

    if (p.startsWith('/api/')) return await api(req, res, url);

    const s = p.match(/^\/s\/([\w-]+)(?:\/([\w.-]+))?\/?$/);
    if (s) return await servePublicSite(req, res, load().find((x) => x.slug === s[1]), s[2] || '', '/s/' + s[1]);

    const file = p === '/' ? 'index.html' : p === '/painel' ? 'painel.html' : p.slice(1);
    const full = path.join(PUBLIC, file);
    if (full.startsWith(PUBLIC + path.sep) && fs.existsSync(full) && fs.statSync(full).isFile()) {
      res.writeHead(200, { 'content-type': MIME[path.extname(full)] || 'application/octet-stream' });
      return fs.createReadStream(full).pipe(res);
    }
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Não encontrado');
  } catch (e) {
    if (!res.headersSent) json(res, 500, { error: e.message });
  }
}).listen(PORT, () => {
  console.log(`Site Works rodando em http://localhost:${PORT}`);
  if (ADMIN_PASSWORD === 'admin') console.log('Aviso: defina ADMIN_PASSWORD no .env');
});
