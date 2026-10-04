// Renderiza o mini-site publico de uma empresa.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const THEMES = {
  azul:    { name: 'Azul Corporativo', primary: '#1d4ed8', dark: '#0f172a', soft: '#eff6ff' },
  verde:   { name: 'Verde Natureza',   primary: '#15803d', dark: '#052e16', soft: '#f0fdf4' },
  laranja: { name: 'Laranja Energia',  primary: '#ea580c', dark: '#431407', soft: '#fff7ed' },
  roxo:    { name: 'Roxo Moderno',     primary: '#7c3aed', dark: '#2e1065', soft: '#f5f3ff' },
  grafite: { name: 'Grafite Elegante', primary: '#111827', dark: '#030712', soft: '#f3f4f6' },
};

function fmtCnpj(c) {
  const d = String(c || '').replace(/\D/g, '');
  return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : c;
}

function renderSite(site, page = 'home', base = '') {
  if (page !== 'home') return renderLegal(site, page, base);
  const t = THEMES[site.theme] || THEMES.azul;
  const waDigits = String(site.whatsapp || '').replace(/\D/g, '');
  const wa = waDigits ? `https://wa.me/${waDigits.startsWith('55') ? waDigits : '55' + waDigits}` : '';
  const services = (site.services || []).filter(Boolean);
  const meta = site.metaVerification
    ? `<meta name="facebook-domain-verification" content="${esc(site.metaVerification)}">`
    : '';
  const title = `${site.name}${site.tagline ? ' - ' + site.tagline : ''}`;

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(site.about).slice(0, 160)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(site.about).slice(0, 160)}">
<meta property="og:type" content="website">
${meta}
${site.headCode || ''}
${site.pixelId ? `<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${esc(site.pixelId)}');fbq('track','PageView');</script>` : ''}
<style>
:root{--p:${t.primary};--d:${t.dark};--s:${t.soft}}
*{box-sizing:border-box;margin:0}
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1f2937;line-height:1.6}
a{color:inherit}
.wrap{max-width:1040px;margin:0 auto;padding:0 20px}
header{position:sticky;top:0;background:#fff;border-bottom:1px solid #e5e7eb;z-index:5}
header .wrap{display:flex;align-items:center;justify-content:space-between;height:60px}
.logo{font-weight:800;color:var(--p);text-decoration:none;font-size:1.1rem}
nav a{margin-left:20px;text-decoration:none;font-size:.95rem;color:#4b5563}
.hero{background:linear-gradient(135deg,var(--d),var(--p));color:#fff;padding:90px 0;text-align:center}
.hero h1{font-size:clamp(2rem,5vw,3.2rem);line-height:1.15;margin-bottom:16px}
.hero p{font-size:1.2rem;opacity:.9;max-width:640px;margin:0 auto 28px}
.btn{display:inline-block;background:#fff;color:var(--p);padding:14px 28px;border-radius:999px;font-weight:700;text-decoration:none}
section{padding:64px 0}
section h2{font-size:1.8rem;margin-bottom:24px;color:var(--d)}
.alt{background:var(--s)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}
.card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:22px;font-weight:600}
.card::before{content:"✓";color:var(--p);margin-right:8px}
.info li{list-style:none;margin-bottom:10px}
footer{background:var(--d);color:#cbd5e1;padding:32px 0;font-size:.9rem;text-align:center}
.wa{position:fixed;right:20px;bottom:20px;background:#25d366;color:#fff;border-radius:999px;padding:14px 20px;font-weight:700;text-decoration:none;box-shadow:0 4px 14px rgba(0,0,0,.25)}
</style>
</head>
<body>
<header><div class="wrap"><a class="logo" href="#">${esc(site.name)}</a>
<nav><a href="#sobre">Sobre</a>${services.length ? '<a href="#servicos">Serviços</a>' : ''}<a href="#diferenciais">Diferenciais</a><a href="#contato">Contato</a></nav></div></header>
<div class="hero"><div class="wrap">
<h1>${esc(site.headline || site.name)}</h1>
<p>${esc(site.tagline)}</p>
<a class="btn" href="${wa || '#contato'}">Fale conosco</a>
</div></div>
<section id="sobre"><div class="wrap"><h2>Sobre a ${esc(site.name)}</h2><p>${esc(site.about)}</p></div></section>
${services.length ? `<section id="servicos" class="alt"><div class="wrap"><h2>Nossos serviços</h2><div class="grid">${services.map((s) => `<div class="card">${esc(s)}</div>`).join('')}</div></div></section>` : ''}
<section id="diferenciais" class="alt"><div class="wrap"><h2>Por que escolher a ${esc(site.name)}</h2><div class="grid">
<div class="card">Atendimento personalizado</div><div class="card">Equipe qualificada</div><div class="card">Transparência e compromisso</div><div class="card">Qualidade comprovada</div></div></div></section>
<section id="contato"><div class="wrap"><h2>Contato</h2><ul class="info">
${site.phone ? `<li><strong>Telefone:</strong> ${esc(site.phone)}</li>` : ''}
${site.email ? `<li><strong>E-mail:</strong> <a href="mailto:${esc(site.email)}">${esc(site.email)}</a></li>` : ''}
${site.address ? `<li><strong>Endereço:</strong> ${esc(site.address)}</li>` : ''}
${site.hours ? `<li><strong>Horário:</strong> ${esc(site.hours)}</li>` : ''}
</ul></div></section>
<footer><div class="wrap">${esc(site.legalName || site.name)} · CNPJ ${esc(fmtCnpj(site.cnpj))}<br>${esc(site.address)}<br><a href="${base}/politica-de-privacidade">Política de Privacidade</a> · <a href="${base}/termos-de-uso">Termos de Uso</a></div></footer>
${wa ? `<a class="wa" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
</body></html>`;
}

const PAGES = ['politica-de-privacidade', 'termos-de-uso'];

function renderLegal(site, page, base) {
  const t = THEMES[site.theme] || THEMES.azul;
  const who = `${esc(site.legalName || site.name)}, CNPJ ${esc(fmtCnpj(site.cnpj))}, com sede em ${esc(site.address)}`;
  const contact = [site.email && `e-mail ${esc(site.email)}`, site.phone && `telefone ${esc(site.phone)}`].filter(Boolean).join(' ou ');
  const privacy = `<h1>Política de Privacidade</h1>
<p>${who} ("nós") respeita a sua privacidade e trata dados pessoais conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).</p>
<h2>Dados coletados</h2><p>Coletamos apenas os dados que você nos fornece voluntariamente ao entrar em contato (nome, e-mail, telefone e mensagem) e dados de navegação, como endereço IP e cookies, para fins estatísticos e de melhoria do site.</p>
<h2>Finalidade</h2><p>Utilizamos os dados para responder solicitações, prestar nossos serviços, cumprir obrigações legais e aprimorar a experiência de navegação.</p>
<h2>Compartilhamento</h2><p>Não vendemos dados pessoais. Podemos compartilhá-los com prestadores de serviço necessários à operação, como hospedagem e ferramentas de análise e publicidade, e quando exigido por lei.</p>
<h2>Cookies e publicidade</h2><p>Este site pode usar cookies e tecnologias de terceiros, como o Pixel da Meta, para mensurar resultados e exibir anúncios. Você pode gerenciar cookies nas configurações do seu navegador.</p>
<h2>Seus direitos</h2><p>Você pode solicitar acesso, correção, exclusão ou portabilidade dos seus dados, bem como revogar consentimentos${contact ? `, entrando em contato por ${contact}` : ''}.</p>
<p><small>Última atualização: ${new Date().toLocaleDateString('pt-BR')}</small></p>`;
  const terms = `<h1>Termos de Uso</h1>
<p>Ao acessar este site, mantido por ${who}, você concorda com os termos abaixo.</p>
<h2>Uso do site</h2><p>O conteúdo tem caráter informativo. É proibido utilizar o site para fins ilícitos ou que prejudiquem terceiros ou o seu funcionamento.</p>
<h2>Propriedade intelectual</h2><p>Textos, marcas e demais materiais pertencem a ${esc(site.legalName || site.name)} ou a seus licenciantes e não podem ser reproduzidos sem autorização.</p>
<h2>Limitação de responsabilidade</h2><p>Buscamos manter as informações corretas e atualizadas, mas não garantimos ausência de erros ou disponibilidade ininterrupta.</p>
<h2>Privacidade</h2><p>O tratamento de dados segue a nossa <a href="${base}/politica-de-privacidade">Política de Privacidade</a>.</p>
<h2>Contato</h2><p>Dúvidas${contact ? `: ${contact}` : ' podem ser enviadas pelos canais informados no site'}.</p>
<p><small>Última atualização: ${new Date().toLocaleDateString('pt-BR')}</small></p>`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${page === 'termos-de-uso' ? 'Termos de Uso' : 'Política de Privacidade'} - ${esc(site.name)}</title>
${site.metaVerification ? `<meta name="facebook-domain-verification" content="${esc(site.metaVerification)}">` : ''}
${site.headCode || ''}
<style>body{font-family:system-ui,sans-serif;line-height:1.7;color:#1f2937;margin:0}main{max-width:760px;margin:0 auto;padding:40px 20px}h1{color:${t.primary}}h2{margin-top:28px;color:${t.dark}}a{color:${t.primary}}header{background:${t.dark};padding:16px 20px}header a{color:#fff;font-weight:800;text-decoration:none}</style></head>
<body><header><a href="${base}/">${esc(site.name)}</a></header><main>${page === 'termos-de-uso' ? terms : privacy}</main></body></html>`;
}

module.exports = { renderSite, THEMES, esc, PAGES };
