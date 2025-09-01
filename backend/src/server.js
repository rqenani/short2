import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const prisma = new PrismaClient();
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('tiny'));

// CORS: allow all in demo; restrict in prod (e.g., origin: ['https://short.al'])
app.use(cors());

// Env
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const INTERSTITIAL_SECONDS = Number(process.env.INTERSTITIAL_SECONDS || 0);

// Helpers
function requestBase(req){
  const proto = (req.headers['x-forwarded-proto'] || '').toString().split(',')[0] || (process.env.NODE_ENV === 'production' ? 'https' : 'http');
  const host = (req.headers['x-forwarded-host'] || req.headers['host'] || '').toString().split(',')[0];
  return `${proto}://${host}`;
}
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}
function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    return u.toString();
  } catch {
    // try add http://
    try {
      const u = new URL('http://' + url);
      return u.toString();
    } catch {
      return null;
    }
  }
}

function randomSlug(len = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

// Ensure first admin & ad config exist on boot
async function ensureBootstrap() {
  const email = process.env.ADMIN_EMAIL;
  const pass = process.env.ADMIN_PASSWORD;
  if (email && pass) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) {
      const passwordHash = await bcrypt.hash(pass, 10);
      await prisma.user.create({ data: { email, passwordHash } });
      console.log('✅ Admin user created:', email);
    } else {
      console.log('ℹ️ Admin user exists:', email);
    }
  } else {
    console.log('⚠️ Set ADMIN_EMAIL and ADMIN_PASSWORD to auto-create the first admin.');
  }

  const adCount = await prisma.adConfig.count();
  if (adCount === 0) {
    await prisma.adConfig.create({
      data: {
        enabled: INTERSTITIAL_SECONDS > 0,
        seconds: INTERSTITIAL_SECONDS,
        html: "<div style='font-family:Inter,sans-serif;padding:24px;text-align:center'><h3>Redirecting…</h3><p>Powered by short.al</p></div>"
      }
    });
    console.log('✅ Default AdConfig created');
  }
}

// --- Auth ---
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email & password required' });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = signToken({ uid: user.id, email: user.email });
  res.json({ token });
});

// --- Shorten ---
const shortenSchema = z.object({
  url: z.string().min(1),
  slug: z.string().regex(/^[a-zA-Z0-9-_]{1,64}$/).optional()
});

app.post('/api/shorten', async (req, res) => {
  const parsed = shortenSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const { url, slug, domain } = { ...parsed.data, domain: req.body?.domain };

  const normalized = normalizeUrl(url);
  if (!normalized) return res.status(400).json({ error: 'Invalid URL' });

  let finalSlug = slug || randomSlug(6);
  // ensure unique
  let exists = await prisma.link.findUnique({ where: { slug: finalSlug } });
  if (exists) {
    if (slug) return res.status(409).json({ error: 'Slug already exists' });
    let attempts = 0;
    while (exists && attempts < 5) {
      finalSlug = randomSlug(6);
      exists = await prisma.link.findUnique({ where: { slug: finalSlug } });
      attempts++;
    }
    if (exists) return res.status(500).json({ error: 'Could not allocate slug' });
  }

  // choose domain: override if valid, else from request host, else from BASE_URL
  let chosenHost = null;
  if (domain) {
    const okDomain = await prisma.domain.findFirst({ where: { host: domain, active: true } });
    if (!okDomain) return res.status(400).json({ error: 'Domain not allowed' });
    chosenHost = okDomain.host;
  } else {
    const base = requestBase(req);
    try { chosenHost = new URL(base).host; } catch { chosenHost = null; }
  }
  if (!chosenHost) {
    try { chosenHost = new URL(BASE_URL).host; } catch { chosenHost = 'localhost:4000'; }
  }

  const link = await prisma.link.create({
    data: {
      slug: finalSlug,
      longUrl: normalized,
      domain: chosenHost
    }
  });

  const proto = (req.headers['x-forwarded-proto'] || '').toString().split(',')[0] || (process.env.NODE_ENV === 'production' ? 'https' : 'http');
  const shortUrl = `${proto}://${chosenHost}/${link.slug}`;
  return res.json({ slug: link.slug, shortUrl });
});

// --- Links listing (admin) ---
app.get('/api/links', auth, async (req, res) => {
  const links = await prisma.link.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200
  });
  res.json(links);
});

// --- Stats per slug (admin) ---
app.get('/api/stats/:slug', auth, async (req, res) => {
  const { slug } = req.params;
  const link = await prisma.link.findUnique({ where: { slug } });
  if (!link) return res.status(404).json({ error: 'Not found' });

  // clicks by date (UTC date)
  const clicks = await prisma.$queryRawUnsafe(`
    SELECT date_trunc('day', "createdAt")::date as d, count(*) as c
    FROM "Click"
    JOIN "Link" ON "Click"."linkId" = "Link"."id"
    WHERE "Link"."slug" = $1
    GROUP BY 1
    ORDER BY 1 ASC
  `, slug);

  res.json({ slug, total: link.clicks, series: clicks });
});


// --- Domains (public) ---
app.get('/api/domains/public', async (req, res) => {
  const domains = await prisma.domain.findMany({ where: { active: true }, orderBy: { createdAt: 'asc' } });
  res.json(domains);
});
// --- Domains (admin) ---
app.post('/api/domains', auth, async (req, res) => {
  const { host } = req.body || {};
  if (!host) return res.status(400).json({ error: 'host required' });
  try {
    const d = await prisma.domain.create({ data: { host } });
    res.json(d);
  } catch (e) {
    res.status(409).json({ error: 'Domain exists or invalid' });
  }
});

// --- Ad Config (admin) ---
app.get('/api/config/ads', auth, async (req, res) => {
  const cfg = await prisma.adConfig.findFirst();
  res.json(cfg);
});
app.post('/api/config/ads', auth, async (req, res) => {
  const { enabled, html, seconds } = req.body || {};
  const cfg = await prisma.adConfig.findFirst();
  const updated = await prisma.adConfig.update({
    where: { id: cfg.id },
    data: {
      enabled: !!enabled,
      html: html ?? cfg.html,
      seconds: Number.isFinite(Number(seconds)) ? Number(seconds) : cfg.seconds
    }
  });
  res.json(updated);
});

// --- Resolve (redirect or interstitial) ---
app.get('/:slug', async (req, res, next) => {
  const { slug } = req.params;
  // Ignore favicon and assets
  if (slug === 'favicon.ico' || slug.startsWith('assets') || slug.includes('.')) return next();

  const link = await prisma.link.findUnique({ where: { slug } });
  if (!link) return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));

  // record click async
  const ip = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.socket.remoteAddress;
  const ua = req.headers['user-agent'];
  const referer = req.headers['referer'];

  prisma.link.update({ where: { id: link.id }, data: { clicks: { increment: 1 } } }).catch(()=>{});
  prisma.click.create({ data: { linkId: link.id, ip, ua, referer } }).catch(()=>{});

  const cfg = await prisma.adConfig.findFirst();
  if (cfg?.enabled && (cfg.seconds || 0) > 0) {
    // interstitial page with countdown + redirect
    const seconds = cfg.seconds;
    const html = cfg.html || '';
    const safeHtml = html; // trust admin input
    const target = link.longUrl;
    return res.send(`<!doctype html>
<html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Redirecting…</title>
<style>body{font-family:Inter,system-ui,-apple-system,Segoe UI,Robotto,Arial,sans-serif;background:#0b1220;color:#fff;margin:0;display:flex;align-items:center;justify-content:center;height:100vh} .card{background:#0f172a;border:1px solid #1f2937;border-radius:16px;max-width:680px;width:92%;padding:24px;box-shadow:0 10px 30px rgba(0,0,0,.3)} .row{display:flex;gap:12px;align-items:center;justify-content:space-between;margin-top:12px} .btn{background:#2563eb;color:#fff;border:none;padding:10px 16px;border-radius:10px;cursor:pointer} .muted{opacity:.8} </style>
</head>
<body>
  <div class="card">
    <div>${safeHtml}</div>
    <div class="row">
      <div class="muted">Do të ridrejtohesh në <span id="s">${seconds}</span>s…</div>
      <button class="btn" onclick="window.location.href='${target}'">Shko tani</button>
    </div>
  </div>
<script>
let s = ${seconds};
const el = document.getElementById('s');
const timer = setInterval(()=>{
  s--; el.textContent = s;
  if(s<=0){ clearInterval(timer); window.location.replace('${target}'); }
}, 1000);
</script>
</body></html>`);
  }

  // direct redirect
  return res.redirect(link.longUrl);
});

// Serve static frontend
app.use(express.static(path.join(__dirname, 'public')));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, async () => {
  try {
    await prisma.$connect();
    await ensureBootstrap();
    console.log(`🚀 short.al backend on :${PORT}`);
  } catch (e) {
    console.error('DB connection error:', e);
  }
});
