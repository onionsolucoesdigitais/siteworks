// Renderiza o mini-site publico de uma empresa.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const THEMES = {
  azul:    { name: 'Azul Corporativo', primary: '#1d4ed8', dark: '#0f172a', soft: '#eff6ff' },
  verde:   { name: 'Verde Natureza',   primary: '#15803d', dark: '#052e16', soft: '#f0fdf4' },
  laranja: { name: 'Laranja Energia',  primary: '#ea580c', dark: '#431407', soft: '#fff7ed' },
  roxo:    { name: 'Roxo Moderno',     primary: '#7c3aed', dark: '#2e1065', soft: '#f5f3ff' },
  grafite: { name: 'Grafite Elegante', primary: '#111827', dark: '#030712', soft: '#f3f4f6' },
};
const PAGES = ['politica-de-privacidade', 'termos-de-uso'];

function fmtCnpj(c) {
  const d = String(c || '').replace(/\D/g, '');
  return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : c;
}

const CSS = (t) => `:root{--p:${t.primary};--d:${t.dark};--s:${t.soft}}
*{box-sizing:border-box;margin:0}
html{scroll-behavior:smooth;color-scheme:light}
body{background:#fff;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#1f2937;line-height:1.65;-webkit-font-smoothing:antialiased}
a{color:var(--p)}
.wrap{max-width:1080px;margin:0 auto;padding:0 20px}
.skip{position:absolute;left:-999px}.skip:focus{left:10px;top:10px;background:#fff;padding:8px 12px;z-index:99}
header{position:sticky;top:0;background:rgba(255,255,255,.95);backdrop-filter:blur(8px);border-bottom:1px solid #e5e7eb;z-index:20}
header .wrap{display:flex;align-items:center;justify-content:space-between;height:64px}
.brand{display:flex;align-items:center;gap:10px;font-weight:800;color:var(--d);text-decoration:none;font-size:1.05rem}
.mark{width:36px;height:36px;border-radius:10px;background:var(--p);color:#fff;display:grid;place-items:center;font-weight:800}
nav a{margin-left:22px;text-decoration:none;font-size:.95rem;color:#4b5563}nav a:hover{color:var(--p)}
.btn{display:inline-block;background:var(--p);color:#fff;padding:13px 26px;border-radius:10px;font-weight:700;text-decoration:none;border:0;font:inherit;font-weight:700;cursor:pointer}
.btn.light{background:#fff;color:var(--p)}.btn.line{background:transparent;border:2px solid rgba(255,255,255,.7);color:#fff}
.hero{background:linear-gradient(135deg,var(--d),var(--p));color:#fff;padding:96px 0 84px}
.hero .wrap{max-width:820px;text-align:center}
.hero h1{font-size:clamp(2rem,5vw,3.2rem);line-height:1.15;margin-bottom:16px}
.hero p{font-size:1.2rem;opacity:.92;max-width:640px;margin:0 auto 30px}
.hero .cta{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.trust{background:#fff;border-bottom:1px solid #e5e7eb}
.trust .wrap{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px 24px;padding:18px 20px;font-size:.9rem;color:#4b5563}
.trust b{color:var(--d);display:block}
section{padding:72px 0}
.eyebrow{color:var(--p);font-weight:700;font-size:.85rem;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px}
h2{font-size:clamp(1.5rem,3vw,2rem);color:var(--d);margin-bottom:20px;line-height:1.25}
.alt{background:var(--s)}
.two{display:grid;grid-template-columns:1.4fr 1fr;gap:40px;align-items:start}
.facts{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:24px;font-size:.95rem}
.facts dt{font-size:.78rem;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin-top:12px}.facts dt:first-child{margin-top:0}
.facts dd{margin:0;color:var(--d);font-weight:600}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px}
.card{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:24px}
.card .ic{width:40px;height:40px;border-radius:10px;background:var(--s);color:var(--p);display:grid;place-items:center;margin-bottom:12px;font-weight:800}
.card h3{font-size:1.05rem;color:var(--d);margin-bottom:6px}.card p{font-size:.95rem;color:#4b5563}
.steps .card .ic{background:var(--p);color:#fff}
details{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px 20px;margin-bottom:10px}
summary{cursor:pointer;font-weight:700;color:var(--d)}details p{margin-top:10px;color:#4b5563}
form label{display:block;font-size:.85rem;font-weight:600;color:#374151;margin-bottom:12px}
form input,form textarea{width:100%;padding:11px 13px;border:1px solid #cbd5e1;border-radius:9px;font:inherit;margin-top:4px}
form input:focus,form textarea:focus{outline:2px solid var(--p);border-color:transparent}
.hp{position:absolute;left:-9999px}
.info{list-style:none;padding:0}.info li{margin-bottom:14px}.info b{display:block;color:var(--d)}
#fmsg{margin-top:10px;font-weight:600}
footer{background:var(--d);color:#cbd5e1;padding:44px 0 28px;font-size:.9rem}
footer .cols{display:grid;grid-template-columns:2fr 1fr 1fr;gap:28px}
footer a{color:#e2e8f0}footer h4{color:#fff;margin-bottom:10px}
footer .copy{border-top:1px solid rgba(255,255,255,.12);margin-top:28px;padding-top:18px;font-size:.82rem}
.wa{position:fixed;right:18px;bottom:18px;background:#25d366;color:#fff;border-radius:999px;padding:13px 20px;font-weight:700;text-decoration:none;box-shadow:0 4px 14px rgba(0,0,0,.25);z-index:30}
#ck{position:fixed;left:16px;right:16px;bottom:16px;max-width:620px;margin:auto;background:#fff;border:1px solid #e5e7eb;border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,.2);padding:16px 18px;font-size:.88rem;z-index:40;display:none}
#ck button{margin-top:10px;padding:9px 18px}
@media(max-width:760px){nav{display:none}.two,footer .cols{grid-template-columns:1fr}.hero{padding:64px 0}section{padding:52px 0}.wa{bottom:90px}}`;

function head(site, t, { title, desc, canonical, extra = '' }) {
  const meta = site.metaVerification ? `<meta name="facebook-domain-verification" content="${esc(site.metaVerification)}">` : '';
  const initial = esc((site.name || 'S').trim().charAt(0).toUpperCase());
  const icon = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${t.primary}"/><text x="32" y="44" font-size="36" font-family="Arial" font-weight="700" text-anchor="middle" fill="#fff">${initial}</text></svg>`)}`;
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="${t.primary}">
<meta name="robots" content="index,follow">
${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ''}
<link rel="icon" href="${icon}">
<meta property="og:locale" content="pt_BR">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
${canonical ? `<meta property="og:url" content="${esc(canonical)}">` : ''}
${meta}
${site.headCode || ''}
${site.pixelId ? `<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${esc(site.pixelId)}');fbq('track','PageView');</script>` : ''}
${extra}
<style>${CSS(t)}</style>`;
}

function footer(site, base, waDigits) {
  return `<footer><div class="wrap"><div class="cols">
<div><h4>${esc(site.name)}</h4><p>${esc(site.legalName || site.name)}<br>CNPJ ${esc(fmtCnpj(site.cnpj))}<br>${esc(site.address)}</p></div>
<div><h4>Navegação</h4><p><a href="${base}/#sobre">Sobre</a><br><a href="${base}/#servicos">Serviços</a><br><a href="${base}/#faq">Perguntas frequentes</a><br><a href="${base}/#contato">Contato</a></p></div>
<div><h4>Legal</h4><p><a href="${base}/politica-de-privacidade">Política de Privacidade</a><br><a href="${base}/termos-de-uso">Termos de Uso</a></p></div>
</div><div class="copy">© ${new Date().getFullYear()} ${esc(site.legalName || site.name)}. Todos os direitos reservados.</div></div></footer>
<div id="ck" role="dialog" aria-label="Aviso de cookies">Usamos cookies para melhorar sua experiência e medir resultados, conforme nossa <a href="${base}/politica-de-privacidade">Política de Privacidade</a>.<br><button class="btn" onclick="try{localStorage.setItem('ck','1')}catch(e){};this.parentNode.style.display='none'">Entendi</button></div>
<script>try{if(!localStorage.getItem('ck'))document.getElementById('ck').style.display='block'}catch(e){document.getElementById('ck').style.display='block'}</script>`;
}

function renderSite(site, page = 'home', base = '', origin = '') {
  if (page !== 'home') return renderLegal(site, page, base, origin);
  const t = THEMES[site.theme] || THEMES.azul;
  const waDigits = String(site.whatsapp || '').replace(/\D/g, '');
  const wa = waDigits ? `https://wa.me/${waDigits.startsWith('55') ? waDigits : '55' + waDigits}` : '';
  const services = (site.services || []).filter(Boolean);
  const title = `${site.name}${site.tagline ? ' | ' + site.tagline : ''}`;
  const desc = String(site.about || '').slice(0, 160);
  const canonical = origin ? origin + (base || '/') : '';
  const initial = esc((site.name || 'S').trim().charAt(0).toUpperCase());
  const maps = site.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.address)}` : '';
  const ld = {
    '@context': 'https://schema.org', '@type': 'Organization',
    name: site.name, legalName: site.legalName || site.name, taxID: fmtCnpj(site.cnpj),
    description: desc, url: canonical || undefined, telephone: site.phone || undefined, email: site.email || undefined,
    address: site.address ? { '@type': 'PostalAddress', streetAddress: site.address, addressCountry: 'BR' } : undefined,
  };
  const faq = [
    [`O que a ${site.name} faz?`, site.about],
    ['Como posso entrar em contato?', `Pelo formulário nesta página${site.phone ? `, pelo telefone ${site.phone}` : ''}${site.email ? ` ou pelo e-mail ${site.email}` : ''}.`],
    ['Onde fica a empresa?', site.address ? `Estamos em ${site.address}.` : 'Os dados de localização estão no rodapé do site.'],
    ['Como meus dados são tratados?', 'Seguimos a LGPD. Veja os detalhes na nossa Política de Privacidade.'],
  ];
  const steps = [
    ['1', 'Entre em contato', 'Conte o que você precisa pelo formulário, telefone ou WhatsApp.'],
    ['2', 'Entendemos sua necessidade', 'Nossa equipe analisa o seu caso e esclarece todas as dúvidas.'],
    ['3', 'Atendimento acompanhado', 'Você é atendido de ponta a ponta, com transparência em cada etapa.'],
  ];

  return `<!doctype html>
<html lang="pt-BR">
<head>
${head(site, t, { title, desc, canonical, extra: `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>` })}
</head>
<body>
<a class="skip" href="#main">Pular para o conteúdo</a>
<header><div class="wrap"><a class="brand" href="${base}/"><span class="mark">${initial}</span>${esc(site.name)}</a>
<nav aria-label="Principal"><a href="#sobre">Sobre</a>${services.length ? '<a href="#servicos">Serviços</a>' : ''}<a href="#como-funciona">Como funciona</a><a href="#faq">Dúvidas</a><a href="#contato">Contato</a></nav></div></header>
<main id="main">
<div class="hero"><div class="wrap">
<h1>${esc(site.headline || site.name)}</h1>
<p>${esc(site.tagline)}</p>
<div class="cta"><a class="btn light" href="#contato">Fale conosco</a>${wa ? `<a class="btn line" href="${wa}" target="_blank" rel="noopener">Chamar no WhatsApp</a>` : ''}</div>
</div></div>
<div class="trust"><div class="wrap">
<div><b>Empresa registrada</b>CNPJ ${esc(fmtCnpj(site.cnpj))}</div>
${site.address ? `<div><b>Localização</b>${esc(site.address.split(',').slice(-3, -1).join(',').trim() || site.address)}</div>` : ''}
${site.hours ? `<div><b>Atendimento</b>${esc(site.hours)}</div>` : ''}
${site.phone ? `<div><b>Telefone</b>${esc(site.phone)}</div>` : ''}
</div></div>
<section id="sobre"><div class="wrap two">
<div><div class="eyebrow">Sobre nós</div><h2>Conheça a ${esc(site.name)}</h2><p>${esc(site.about)}</p></div>
<dl class="facts"><dt>Razão social</dt><dd>${esc(site.legalName || site.name)}</dd><dt>CNPJ</dt><dd>${esc(fmtCnpj(site.cnpj))}</dd>${site.address ? `<dt>Endereço</dt><dd>${esc(site.address)}</dd>` : ''}${site.tagline ? `<dt>Atividade</dt><dd>${esc(site.tagline)}</dd>` : ''}</dl>
</div></section>
${services.length ? `<section id="servicos" class="alt"><div class="wrap"><div class="eyebrow">O que fazemos</div><h2>Nossos serviços</h2><div class="grid">${services.map((s) => `<div class="card"><div class="ic">✓</div><h3>${esc(s)}</h3></div>`).join('')}</div></div></section>` : ''}
<section id="como-funciona"><div class="wrap"><div class="eyebrow">Passo a passo</div><h2>Como funciona</h2><div class="grid steps">${steps.map(([n, h, p]) => `<div class="card"><div class="ic">${n}</div><h3>${h}</h3><p>${p}</p></div>`).join('')}</div></div></section>
<section id="faq" class="alt"><div class="wrap" style="max-width:780px"><div class="eyebrow">Dúvidas</div><h2>Perguntas frequentes</h2>${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div></section>
<section id="contato"><div class="wrap two">
<div><div class="eyebrow">Contato</div><h2>Fale com a gente</h2>
<form id="cf" novalidate>
<label>Nome<input name="name" required maxlength="100" autocomplete="name"></label>
<label>E-mail<input name="email" type="email" required maxlength="120" autocomplete="email"></label>
<label>Telefone (opcional)<input name="phone" maxlength="30" autocomplete="tel"></label>
<label>Mensagem<textarea name="message" rows="4" required maxlength="2000"></textarea></label>
<input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
<label style="font-weight:400"><input type="checkbox" name="consent" required style="width:auto;margin-right:6px">Concordo com a <a href="${base}/politica-de-privacidade">Política de Privacidade</a>.</label>
<button class="btn" type="submit">Enviar mensagem</button><div id="fmsg" role="status"></div></form></div>
<ul class="info">
${site.phone ? `<li><b>Telefone</b>${esc(site.phone)}</li>` : ''}
${site.email ? `<li><b>E-mail</b><a href="mailto:${esc(site.email)}">${esc(site.email)}</a></li>` : ''}
${site.address ? `<li><b>Endereço</b>${esc(site.address)}${maps ? `<br><a href="${maps}" target="_blank" rel="noopener">Ver no mapa</a>` : ''}</li>` : ''}
${site.hours ? `<li><b>Horário</b>${esc(site.hours)}</li>` : ''}
</ul></div></section>
</main>
${footer(site, base, waDigits)}
${wa ? `<a class="wa" href="${wa}" target="_blank" rel="noopener" aria-label="Falar no WhatsApp">WhatsApp</a>` : ''}
<script>
document.getElementById('cf').addEventListener('submit',async function(e){
  e.preventDefault();var f=this,m=document.getElementById('fmsg'),d=Object.fromEntries(new FormData(f));
  if(!d.name||!d.email||!d.message||!f.consent.checked){m.style.color='#b91c1c';m.textContent='Preencha os campos obrigatórios e aceite a política.';return}
  m.style.color='#374151';m.textContent='Enviando...';
  try{var r=await fetch('${base}/contato',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(d)});
  if(!r.ok)throw 0;f.reset();m.style.color='#15803d';m.textContent='Mensagem enviada! Retornaremos em breve.';
  if(window.fbq)fbq('track','Lead')}catch(x){m.style.color='#b91c1c';m.textContent='Não foi possível enviar. Tente novamente ou use outro canal de contato.'}
});
</script>
</body></html>`;
}

function renderLegal(site, page, base, origin) {
  const t = THEMES[site.theme] || THEMES.azul;
  const who = `${esc(site.legalName || site.name)}, CNPJ ${esc(fmtCnpj(site.cnpj))}, com sede em ${esc(site.address)}`;
  const contact = [site.email && `e-mail ${esc(site.email)}`, site.phone && `telefone ${esc(site.phone)}`].filter(Boolean).join(' ou ');
  const upd = `<p><small>Última atualização: ${new Date().toLocaleDateString('pt-BR')}</small></p>`;
  const privacy = `<h1>Política de Privacidade</h1>
<p>${who} ("nós") respeita a sua privacidade e trata dados pessoais conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD).</p>
<h2>1. Controlador</h2><p>O controlador dos dados é ${who}.${contact ? ` Contato: ${contact}.` : ''}</p>
<h2>2. Dados que coletamos</h2><p>Dados fornecidos por você ao usar o formulário de contato (nome, e-mail, telefone e mensagem) e dados de navegação, como endereço IP, tipo de dispositivo e páginas acessadas, coletados por cookies e tecnologias semelhantes.</p>
<h2>3. Finalidades e bases legais</h2><p>Responder às suas solicitações (execução de procedimentos preliminares a pedido do titular), cumprir obrigações legais e regulatórias, e aprimorar o site e medir a eficácia de nossa comunicação (legítimo interesse e consentimento, quando aplicável).</p>
<h2>4. Compartilhamento</h2><p>Não vendemos dados pessoais. Podemos compartilhá-los com prestadores que viabilizam a operação (hospedagem, e-mail, análise e publicidade, incluindo a Meta Platforms) e com autoridades, quando exigido por lei.</p>
<h2>5. Cookies e Pixel da Meta</h2><p>Este site pode utilizar cookies e o Pixel da Meta para mensurar resultados e exibir anúncios relevantes. Você pode bloquear ou apagar cookies nas configurações do navegador e gerenciar preferências de anúncios na sua conta da Meta.</p>
<h2>6. Retenção e segurança</h2><p>Mantemos os dados pelo tempo necessário às finalidades descritas e adotamos medidas técnicas e administrativas para protegê-los, incluindo conexão criptografada (HTTPS).</p>
<h2>7. Seus direitos</h2><p>Você pode solicitar confirmação de tratamento, acesso, correção, anonimização, portabilidade, eliminação dos dados, informação sobre compartilhamentos e revogação do consentimento${contact ? `, por ${contact}` : ''}. Também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).</p>
<h2>8. Alterações</h2><p>Podemos atualizar esta política; a data da última revisão consta ao final.</p>${upd}`;
  const terms = `<h1>Termos de Uso</h1>
<p>Ao acessar este site, mantido por ${who}, você concorda com os termos abaixo.</p>
<h2>1. Uso do site</h2><p>O conteúdo tem caráter informativo. É proibido usar o site para fins ilícitos, tentar violar sua segurança ou prejudicar terceiros.</p>
<h2>2. Propriedade intelectual</h2><p>Textos, marcas, logotipos e demais materiais pertencem a ${esc(site.legalName || site.name)} ou a seus licenciantes e não podem ser reproduzidos sem autorização.</p>
<h2>3. Responsabilidade</h2><p>Buscamos manter as informações corretas e atualizadas, mas não garantimos ausência de erros ou disponibilidade ininterrupta. Links para sites de terceiros não implicam endosso.</p>
<h2>4. Privacidade</h2><p>O tratamento de dados segue a nossa <a href="${base}/politica-de-privacidade">Política de Privacidade</a>.</p>
<h2>5. Lei aplicável</h2><p>Estes termos são regidos pelas leis brasileiras, ficando eleito o foro do domicílio do consumidor para dirimir controvérsias.</p>
<h2>6. Contato</h2><p>Dúvidas${contact ? `: ${contact}` : ' podem ser enviadas pelos canais informados no site'}.</p>${upd}`;
  const isTerms = page === 'termos-de-uso';
  const ttl = `${isTerms ? 'Termos de Uso' : 'Política de Privacidade'} | ${site.name}`;
  const initial = esc((site.name || 'S').trim().charAt(0).toUpperCase());
  return `<!doctype html><html lang="pt-BR"><head>
${head(site, t, { title: ttl, desc: `${isTerms ? 'Termos de uso' : 'Política de privacidade'} de ${site.name}.`, canonical: origin ? `${origin}${base}/${page}` : '' })}
<style>.legal{max-width:780px;margin:0 auto;padding:44px 20px 70px}.legal h1{color:var(--p);margin-bottom:14px}.legal h2{font-size:1.15rem;margin:26px 0 8px}</style></head>
<body><header><div class="wrap"><a class="brand" href="${base}/"><span class="mark">${initial}</span>${esc(site.name)}</a><nav><a href="${base}/">Voltar ao site</a></nav></div></header>
<main class="legal">${isTerms ? terms : privacy}</main>${footer(site, base, '')}</body></html>`;
}

function robots(origin, base) {
  return `User-agent: *\nAllow: /\nSitemap: ${origin}${base}/sitemap.xml\n`;
}
function sitemap(origin, base) {
  const urls = ['', ...PAGES.map((p) => '/' + p)].map((u) => `<url><loc>${origin}${base}${u || '/'}</loc></url>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
}

module.exports = { renderSite, THEMES, esc, PAGES, robots, sitemap };
