// Site Works - versao Cloudflare Workers (KV para dados, assets estaticos em public/)
import { renderSite, THEMES, PAGES, robots, sitemap } from './render.js';

const enc = new TextEncoder();
const slugify = (s) =>
  String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'empresa';
function uniqueSlug(base, sites, ignoreId) {
  let slug = base, i = 2;
  while (sites.some((s) => s.slug === slug && s.id !== ignoreId)) slug = `${base}-${i++}`;
  return slug;
}

// ---------- armazenamento (KV) ----------
const load = async (env, key) => (await env.DB.get(key, 'json')) || [];
const save = (env, key, v) => env.DB.put(key, JSON.stringify(v));

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

// ---------- helpers HTTP ----------
const json = (code, obj, headers = {}) => new Response(JSON.stringify(obj), { status: code, headers: { 'content-type': 'application/json', ...headers } });
const html = (body, code = 200) => new Response(body, { status: code, headers: { 'content-type': 'text/html; charset=utf-8' } });
const readBody = async (req) => { try { return await req.json(); } catch { return {}; } };
const getCookie = (req, name) => (req.headers.get('cookie') || '').split(';').map((c) => c.trim().split('=')).find(([k]) => k === name)?.[1];

// ---------- sessao: token assinado (HMAC), sem estado ----------
const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
async function sign(env, payload) {
  const key = await crypto.subtle.importKey('raw', enc.encode(env.ADMIN_PASSWORD), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toHex(await crypto.subtle.sign('HMAC', key, enc.encode(payload)));
}
async function safeEq(a, b) {
  const [x, y] = await Promise.all([a, b].map((v) => crypto.subtle.digest('SHA-256', enc.encode(String(v)))));
  const xa = new Uint8Array(x), ya = new Uint8Array(y);
  let d = 0; for (let i = 0; i < xa.length; i++) d |= xa[i] ^ ya[i];
  return d === 0;
}
async function authed(req, env) {
  if (!env.ADMIN_PASSWORD) return false;
  const [exp, sig] = (getCookie(req, 'sw_session') || '').split('.');
  if (!exp || !sig || +exp < Date.now()) return false;
  return safeEq(sig, await sign(env, exp));
}

const EDITABLE = ['name', 'legalName', 'headline', 'tagline', 'about', 'services', 'phone', 'whatsapp', 'email', 'address', 'hours', 'theme', 'metaVerification', 'headCode', 'pixelId', 'customDomain', 'slug'];
const baseDomain = (env) => (env.BASE_DOMAIN || 'localhost').toLowerCase();

function findSiteByHost(host, sites, base) {
  host = (host || '').split(':')[0].toLowerCase();
  const custom = sites.find((s) => s.customDomain && s.customDomain.toLowerCase() === host);
  if (custom) return custom;
  if (host.endsWith('.' + base)) {
    const slug = host.slice(0, -base.length - 1);
    return sites.find((s) => s.slug === slug);
  }
}

const hits = new Map(); // limite simples por IP (por isolate)
function rateLimited(ip) {
  const now = Date.now(), arr = (hits.get(ip) || []).filter((t) => now - t < 3600e3);
  arr.push(now); hits.set(ip, arr);
  return arr.length > 5;
}

// sub: '' | pagina legal | robots.txt | sitemap.xml | contato
async function servePublicSite(req, env, url, site, sub, base) {
  if (!site || !site.published) return html('<h1>Site não encontrado ou não publicado</h1>', 404);
  const origin = url.origin;
  if (sub === 'robots.txt') return new Response(robots(origin, base), { headers: { 'content-type': 'text/plain' } });
  if (sub === 'sitemap.xml') return new Response(sitemap(origin, base), { headers: { 'content-type': 'application/xml' } });
  if (sub === 'contato' && req.method === 'POST') {
    const ip = req.headers.get('cf-connecting-ip') || '';
    const b = await readBody(req);
    if (b.website) return json(200, { ok: true }); // honeypot
    if (rateLimited(ip)) return json(429, { error: 'Muitas mensagens, tente mais tarde' });
    const clean = (v, n) => String(v || '').trim().slice(0, n);
    const msg = { id: crypto.randomUUID(), siteId: site.id, siteName: site.name, name: clean(b.name, 100), email: clean(b.email, 120), phone: clean(b.phone, 30), message: clean(b.message, 2000), at: new Date().toISOString() };
    if (!msg.name || !/^\S+@\S+\.\S+$/.test(msg.email) || !msg.message) return json(400, { error: 'Dados inválidos' });
    const all = await load(env, 'messages'); all.push(msg);
    await save(env, 'messages', all);
    return json(200, { ok: true });
  }
  return html(renderSite(site, PAGES.includes(sub) ? sub : 'home', base, origin));
}

// ---------- API ----------
async function api(req, env, url) {
  const p = url.pathname;
  if (p === '/api/login' && req.method === 'POST') {
    if (!env.ADMIN_PASSWORD) return json(500, { error: 'ADMIN_PASSWORD não configurada no Worker' });
    const { password } = await readBody(req);
    if (!(await safeEq(password || '', env.ADMIN_PASSWORD))) return json(401, { error: 'Senha incorreta' });
    const exp = String(Date.now() + 7 * 864e5);
    return json(200, { ok: true }, { 'set-cookie': `sw_session=${exp}.${await sign(env, exp)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800; Secure` });
  }
  if (p === '/api/logout' && req.method === 'POST') return json(200, { ok: true }, { 'set-cookie': 'sw_session=; Path=/; Max-Age=0' });
  if (!(await authed(req, env))) return json(401, { error: 'Não autenticado' });

  if (p === '/api/config') return json(200, { baseDomain: baseDomain(env), port: '', themes: THEMES });

  if (p === '/api/messages' && req.method === 'GET') return json(200, (await load(env, 'messages')).reverse());
  const dm = p.match(/^\/api\/messages\/([\w-]+)$/);
  if (dm && req.method === 'DELETE') { await save(env, 'messages', (await load(env, 'messages')).filter((m) => m.id !== dm[1])); return json(200, { ok: true }); }

  const sites = await load(env, 'sites');
  if (p === '/api/sites' && req.method === 'GET') return json(200, sites);

  if (p === '/api/sites' && req.method === 'POST') {
    const { cnpj: raw, metaVerification } = await readBody(req);
    const cnpj = String(raw || '').replace(/\D/g, '');
    if (!validCnpj(cnpj)) return json(400, { error: 'CNPJ inválido' });
    if (sites.some((s) => s.cnpj === cnpj)) return json(409, { error: 'Já existe um site para este CNPJ' });
    const data = await lookupCnpj(cnpj);
    const site = {
      id: crypto.randomUUID(), ...data,
      slug: uniqueSlug(slugify(data.name), sites),
      theme: 'azul', whatsapp: data.phone, hours: '', pixelId: '', customDomain: '',
      metaVerification: String(metaVerification || '').trim(),
      published: false, createdAt: new Date().toISOString(),
    };
    sites.push(site);
    await save(env, 'sites', sites);
    return json(201, site);
  }

  const m = p.match(/^\/api\/sites\/([\w-]+)(\/publish|\/unpublish)?$/);
  if (m) {
    const idx = sites.findIndex((s) => s.id === m[1]);
    if (idx < 0) return json(404, { error: 'Site não encontrado' });
    const site = sites[idx];
    if (m[2] && req.method === 'POST') {
      site.published = m[2] === '/publish';
      await save(env, 'sites', sites);
      return json(200, site);
    }
    if (req.method === 'PUT') {
      const body = await readBody(req);
      for (const k of EDITABLE) if (k in body) site[k] = body[k];
      const fb = String(site.metaVerification || '').match(/content\s*=\s*["']([^"']+)["']/i);
      if (fb) site.metaVerification = fb[1];
      const tag = String(site.headCode || '').match(/<meta[^>]*facebook-domain-verification[^>]*content\s*=\s*["']([^"']+)["'][^>]*>/i);
      if (tag) { site.metaVerification = tag[1]; site.headCode = site.headCode.replace(tag[0], '').trim(); }
      if (!Array.isArray(site.services)) site.services = String(site.services || '').split('\n').map((s) => s.trim()).filter(Boolean);
      site.slug = uniqueSlug(slugify(site.slug || site.name), sites, site.id);
      if (!THEMES[site.theme]) site.theme = 'azul';
      await save(env, 'sites', sites);
      return json(200, site);
    }
    if (req.method === 'DELETE') {
      sites.splice(idx, 1);
      await save(env, 'sites', sites);
      return json(200, { ok: true });
    }
  }
  return json(404, { error: 'Rota não encontrada' });
}

// ---------- entrada ----------
export default {
  async fetch(req, env) {
    try {
      const url = new URL(req.url);
      const p = url.pathname;
      const base = baseDomain(env);

      // Sites publicados em subdominio/dominio proprio
      if (url.hostname !== base && url.hostname !== 'www.' + base && !url.hostname.endsWith('.workers.dev') && !p.startsWith('/api/')) {
        const hostSite = findSiteByHost(url.hostname, await load(env, 'sites'), base);
        if (hostSite) return await servePublicSite(req, env, url, hostSite, p.slice(1).replace(/\/$/, ''), '');
      }

      if (p.startsWith('/api/')) return await api(req, env, url);

      const s = p.match(/^\/s\/([\w-]+)(?:\/([\w.-]+))?\/?$/);
      if (s) {
        const site = (await load(env, 'sites')).find((x) => x.slug === s[1]);
        // no dominio oficial, o endereco canonico e o subdominio
        if (site?.published && (url.hostname === base || url.hostname === 'www.' + base))
          return Response.redirect(`https://${site.slug}.${base}/${s[2] || ''}`, 301);
        return await servePublicSite(req, env, url, site, s[2] || '', '/s/' + s[1]);
      }

      return env.ASSETS.fetch(req); // landing e /painel
    } catch (e) {
      return json(500, { error: e.message });
    }
  },
};
