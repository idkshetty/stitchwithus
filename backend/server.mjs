import http from 'node:http';
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_CONTENT, normalizeContent } from '../frontend/js/site-content.js';
import {
  fetchPaytmTransactionStatus,
  getPaytmConfig,
  initiatePaytmTransaction,
  verifySignature
} from './paytm.mjs';

const BACKEND_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(BACKEND_DIR, '..');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');

function loadEnvFile(filePath) {
  try {
    const raw = readFileSync(filePath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    /* optional .env */
  }
}

loadEnvFile(path.join(ROOT_DIR, '.env'));
loadEnvFile(path.join(BACKEND_DIR, '.env'));

const MAX_BODY_BYTES = 8 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

function parseCookies(header = '') {
  const out = {};
  for (const part of String(header).split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

function corsHeaders(req) {
  const origin = req.headers.origin;
  if (!origin) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-token'
  };
}

function sendJson(req, res, status, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...corsHeaders(req),
    ...extraHeaders
  });
  res.end(body);
}

async function readRawBody(req, limitBytes = MAX_BODY_BYTES) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > limitBytes) {
      const err = new Error('Payload too large.');
      err.status = 413;
      throw err;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function readJsonBody(req, limitBytes = MAX_BODY_BYTES) {
  const raw = await readRawBody(req, limitBytes);
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    const err = new Error('Invalid JSON payload.');
    err.status = 400;
    throw err;
  }
}

async function readJsonFile(filePath, fallback = null) {
  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw err;
  }
}

async function writeJsonAtomic(filePath, data) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
  await rename(tmp, filePath);
}

const COUPON_CODES = {
  HOOPABLES15: 15,
  STITCH10: 10
};

function resolveCoupon(rawCode, subtotal) {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) return { valid: false, code: '', discountPercent: 0, discountAmount: 0, finalTotal: subtotal };
  const pct = COUPON_CODES[code];
  if (!pct) return { valid: false, code, discountPercent: 0, discountAmount: 0, finalTotal: subtotal };
  const discountAmount = Math.round((subtotal * pct) / 100);
  const finalTotal = Math.max(1, subtotal - discountAmount);
  return { valid: true, code, discountPercent: pct, discountAmount, finalTotal };
}

function parsePriceDigits(label, fallback = 1600) {
  const match = String(label || '').replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : fallback;
}

function resolveCanonicalItems(requestedItems, siteContent) {
  const content = normalizeContent(siteContent || DEFAULT_CONTENT);
  if (!Array.isArray(requestedItems) || !requestedItems.length) {
    return { error: 'Select at least one course or session.' };
  }

  const resolved = [];
  let total = 0;

  for (const raw of requestedItems.slice(0, 10)) {
    const id = String(raw?.id || '').trim().toLowerCase();
    const qty = Math.max(1, Math.min(5, Math.floor(Number(raw?.qty || 1))));
    if (id === 'one-on-1' || id === '1-on-1') {
      const unitPrice = parsePriceDigits(content.oneOnOne?.priceLabel, 1600);
      if (unitPrice <= 0) return { error: 'Invalid session price.' };
      resolved.push({
        id: 'one-on-1',
        name: content.oneOnOne?.title || '1:1 Tailored Embroidery Session',
        price: unitPrice,
        qty
      });
      total += unitPrice * qty;
      continue;
    }

    const course = (content.courses || []).find(c => c.id === id);
    if (!course) {
      return { error: `Unknown item: ${id || 'empty'}` };
    }
    const unitPrice = Number(course.price || 0);
    if (unitPrice <= 0) return { error: `Invalid price for ${course.name}.` };
    resolved.push({
      id: course.id,
      name: course.name,
      price: unitPrice,
      qty
    });
    total += unitPrice * qty;
  }

  if (total <= 0) return { error: 'Order total must be greater than zero.' };
  return { items: resolved, total };
}

export function createBackendServer({
  port = Number(process.env.API_PORT || 3001),
  dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT_DIR, 'data'),
  uploadDir = process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : path.join(FRONTEND_DIR, 'assets', 'uploads'),
  adminPassword = process.env.ADMIN_PASSWORD || 'stitch-admin',
  paytmEnv = process.env
} = {}) {
  const siteDataPath = path.join(dataDir, 'site-data.json');
  const submissionsPath = path.join(dataDir, 'submissions.json');
  const ordersPath = path.join(dataDir, 'orders.json');
  const paytmConfig = getPaytmConfig(paytmEnv);
  const sessions = new Map();
  const liveClients = new Set();
  const demoHintAllowed = !process.env.ADMIN_PASSWORD;

  function broadcastSiteData(data, updatedAt = new Date().toISOString()) {
    if (!liveClients.size) return;
    const frame = `event: site-data\ndata: ${JSON.stringify({ data, updatedAt })}\n\n`;
    for (const clientRes of [...liveClients]) {
      try {
        clientRes.write(frame);
      } catch {
        liveClients.delete(clientRes);
      }
    }
  }

  const sseHeartbeat = setInterval(() => {
    for (const clientRes of [...liveClients]) {
      try {
        clientRes.write(': ping\n\n');
      } catch {
        liveClients.delete(clientRes);
      }
    }
  }, 25000);
  sseHeartbeat.unref?.();

  function getSessionToken(req) {
    const headerToken = req.headers['x-admin-token'];
    if (typeof headerToken === 'string' && sessions.has(headerToken)) return headerToken;
    const cookies = parseCookies(req.headers.cookie || '');
    const cookieToken = cookies.ycswu_admin;
    if (cookieToken && sessions.has(cookieToken)) return cookieToken;
    return null;
  }

  function requireAdmin(req, res) {
    const token = getSessionToken(req);
    if (!token) {
      sendJson(req, res, 401, { error: 'Admin sign-in required.' });
      return null;
    }
    return token;
  }

  async function recordOrderSubmission(order) {
    const list = (await readJsonFile(submissionsPath, [])) || [];
    const existingIdx = list.findIndex(item => item.payload?.orderId === order.orderId);
    const isSessionOnly = order.items.length === 1 && order.items[0].id === 'one-on-1';
    const entry = {
      id: existingIdx >= 0 ? list[existingIdx].id : crypto.randomUUID(),
      type: isSessionOnly ? 'booking' : 'enrollment',
      status: existingIdx >= 0 ? list[existingIdx].status : 'new',
      createdAt: existingIdx >= 0 ? list[existingIdx].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      payload: {
        ...order.customer,
        items: order.items,
        total: order.amount,
        paymentGateway: order.paymentMethod === 'manual' ? 'Manual' : 'Paytm',
        paymentMode: order.mode,
        paymentStatus: order.paymentStatus,
        orderId: order.orderId,
        paytmTxnId: order.paytmTxnId || '',
        paytmPaymentMode: order.paytmPaymentMode || ''
      }
    };
    if (existingIdx >= 0) list[existingIdx] = entry;
    else list.unshift(entry);
    await writeJsonAtomic(submissionsPath, list.slice(0, 2000));
    return entry;
  }

  const server = http.createServer(async (req, res) => {
    try {
      if (req.method === 'OPTIONS') {
        res.writeHead(204, corsHeaders(req));
        res.end();
        return;
      }

      const url = new URL(req.url || '/', 'http://localhost');
      const pathname = decodeURIComponent(url.pathname);

      if ((pathname === '/api/health' || pathname === '/health') && req.method === 'GET') {
        sendJson(req, res, 200, { ok: true, service: 'ycswu-backend' });
        return;
      }

      if (pathname === '/api/admin/session' && req.method === 'GET') {
        const authenticated = Boolean(getSessionToken(req));
        const host = String(req.headers.host || '');
        const isLocal = /^(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(host);
        sendJson(req, res, 200, {
          authenticated,
          demoPasscodeHint: demoHintAllowed && isLocal ? adminPassword : null
        });
        return;
      }

      if (pathname === '/api/admin/login' && req.method === 'POST') {
        const body = await readJsonBody(req, 64 * 1024);
        const pass = String(body.password || '');
        if (!pass || pass !== adminPassword) {
          sendJson(req, res, 401, { error: 'Incorrect admin passcode.' });
          return;
        }
        const token = crypto.randomBytes(24).toString('hex');
        sessions.set(token, { createdAt: Date.now() });
        sendJson(
          req,
          res,
          200,
          { ok: true, token },
          { 'Set-Cookie': `ycswu_admin=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800` }
        );
        return;
      }

      if (pathname === '/api/admin/logout' && req.method === 'POST') {
        const token = getSessionToken(req);
        if (token) sessions.delete(token);
        sendJson(
          req,
          res,
          200,
          { ok: true },
          { 'Set-Cookie': 'ycswu_admin=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0' }
        );
        return;
      }

      if ((pathname === '/api/payments/config' || pathname === '/api/payments/paytm/config') && req.method === 'GET') {
        sendJson(req, res, 200, {
          configured: paytmConfig.configured,
          env: paytmConfig.env,
          host: paytmConfig.host,
          website: paytmConfig.website,
          mid: paytmConfig.configured ? paytmConfig.mid : null,
          mode: 'test',
          provider: 'Test Payment Testing'
        });
        return;
      }

      if (pathname === '/api/checkout/coupon' && req.method === 'POST') {
        const body = await readJsonBody(req, 32 * 1024);
        const savedContent = await readJsonFile(siteDataPath, null);
        const canonical = resolveCanonicalItems(body.items, savedContent);
        if (canonical.error) {
          sendJson(req, res, 400, { error: canonical.error });
          return;
        }
        const coupon = resolveCoupon(body.code, canonical.total);
        if (!coupon.valid) {
          sendJson(req, res, 400, { error: 'Promo code not recognized. Try HOOPABLES15 or STITCH10.' });
          return;
        }
        sendJson(req, res, 200, {
          ok: true,
          ...coupon,
          subtotal: canonical.total,
          message: `${coupon.code} applied (${coupon.discountPercent}% off)`
        });
        return;
      }

      if ((pathname === '/api/checkout/create' || pathname === '/api/payments/paytm/initiate') && req.method === 'POST') {
        const body = await readJsonBody(req, 64 * 1024);
        const customer = body.customer && typeof body.customer === 'object' ? body.customer : {};
        const name = String(customer.name || '').trim().slice(0, 120);
        const email = String(customer.email || '').trim().slice(0, 160);
        const phone = String(customer.phone || '').trim().slice(0, 40);
        if (!name || !email || !phone) {
          sendJson(req, res, 400, { error: 'Name, email, and WhatsApp number are required.' });
          return;
        }

        const savedContent = await readJsonFile(siteDataPath, null);
        const canonical = resolveCanonicalItems(body.items, savedContent);
        if (canonical.error) {
          sendJson(req, res, 400, { error: canonical.error });
          return;
        }

        const coupon = resolveCoupon(body.couponCode || customer.couponCode, canonical.total);
        const street = String(customer.street || '').trim().slice(0, 300);
        const city = String(customer.city || '').trim().slice(0, 100);
        const state = String(customer.state || '').trim().slice(0, 100);
        const pinCode = String(customer.pinCode || '').trim().slice(0, 12);
        const combinedAddress = [street, city, state, pinCode].filter(Boolean).join(', ') || String(customer.address || '').trim().slice(0, 500);

        const paymentMethod = body.paymentMethod === 'manual' ? 'manual' : 'paytm';
        const orderId = `YCSWU-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
        const orderRecord = {
          orderId,
          mode: 'test',
          paymentMethod,
          paymentGateway: paymentMethod === 'manual' ? 'Manual' : 'Paytm (Test)',
          paymentStatus: 'pending',
          fulfillmentStatus: 'new',
          subtotal: canonical.total,
          couponCode: coupon.valid ? coupon.code : '',
          discountAmount: coupon.valid ? coupon.discountAmount : 0,
          amount: coupon.valid ? coupon.finalTotal : canonical.total,
          currency: 'INR',
          items: canonical.items,
          customer: {
            name,
            email,
            phone,
            street,
            city,
            state,
            pinCode,
            address: combinedAddress,
            preferredSlot: String(customer.preferredSlot || '').trim().slice(0, 80),
            notes: String(customer.notes || '').trim().slice(0, 1000)
          },
          createdAt: new Date().toISOString()
        };

        const orders = (await readJsonFile(ordersPath, [])) || [];
        orders.unshift(orderRecord);
        await writeJsonAtomic(ordersPath, orders.slice(0, 2000));

        if (paymentMethod === 'manual') {
          await recordOrderSubmission(orderRecord);
        }

        sendJson(req, res, 200, {
          ok: true,
          mode: 'test',
          orderId,
          subtotal: orderRecord.subtotal,
          discountAmount: orderRecord.discountAmount,
          couponCode: orderRecord.couponCode,
          amount: orderRecord.amount,
          items: canonical.items,
          order: orderRecord
        });
        return;
      }

      if ((pathname === '/api/checkout/complete' || pathname === '/api/payments/paytm/verify') && req.method === 'POST') {
        const body = await readJsonBody(req, 32 * 1024);
        const orderId = String(body.orderId || '').trim();
        if (!orderId) {
          sendJson(req, res, 400, { error: 'orderId is required.' });
          return;
        }
        const orders = (await readJsonFile(ordersPath, [])) || [];
        const idx = orders.findIndex(o => o.orderId === orderId);
        if (idx < 0) {
          sendJson(req, res, 404, { error: 'Order not found.' });
          return;
        }
        const order = orders[idx];
        const rawOutcome = body.outcome || body.demoOutcome || 'paid';
        if (paytmConfig.configured && order.mode === 'paytm') {
          const status = await fetchPaytmTransactionStatus({ config: paytmConfig, orderId });
          order.paymentStatus = status.resultStatus === 'TXN_SUCCESS'
            ? 'paid'
            : status.resultStatus === 'TXN_FAILURE'
              ? 'failed'
              : 'pending';
          order.paytmTxnId = status.txnId || order.paytmTxnId || '';
          order.paytmPaymentMode = status.paymentMode || '';
        } else {
          const normalizedOutcome = rawOutcome === 'paid' ? 'paid' : 'failed';
          order.paymentStatus = normalizedOutcome;
          if (normalizedOutcome === 'paid') {
            order.paytmTxnId = `TEST-TXN-${Date.now().toString(36).toUpperCase()}`;
            order.paytmPaymentMode = 'Test Popup';
          } else {
            order.paytmTxnId = '';
            order.paytmPaymentMode = 'Test Popup (Failed)';
          }
        }

        order.updatedAt = new Date().toISOString();
        orders[idx] = order;
        await writeJsonAtomic(ordersPath, orders);
        await recordOrderSubmission(order);

        sendJson(req, res, 200, { ok: true, order });
        return;
      }

      if (pathname === '/api/payments/paytm/callback' && req.method === 'POST') {
        const raw = await readRawBody(req, 128 * 1024);
        const params = Object.fromEntries(new URLSearchParams(raw));
        const checksum = params.CHECKSUMHASH || '';
        const orderId = String(params.ORDERID || '').trim();
        const unsigned = { ...params };
        delete unsigned.CHECKSUMHASH;

        if (paytmConfig.configured && checksum && !verifySignature(unsigned, paytmConfig.merchantKey, checksum)) {
          res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Invalid Paytm checksum');
          return;
        }

        const orders = (await readJsonFile(ordersPath, [])) || [];
        const idx = orders.findIndex(o => o.orderId === orderId);
        let paymentStatus = 'pending';
        if (idx >= 0) {
          const order = orders[idx];
          if (paytmConfig.configured) {
            const status = await fetchPaytmTransactionStatus({ config: paytmConfig, orderId });
            paymentStatus = status.resultStatus === 'TXN_SUCCESS'
              ? 'paid'
              : status.resultStatus === 'TXN_FAILURE'
                ? 'failed'
                : 'pending';
            order.paytmTxnId = status.txnId || params.TXNID || '';
            order.paytmPaymentMode = status.paymentMode || params.PAYMENTMODE || '';
          } else {
            paymentStatus = params.STATUS === 'TXN_SUCCESS' ? 'paid' : 'failed';
          }
          order.paymentStatus = paymentStatus;
          order.updatedAt = new Date().toISOString();
          orders[idx] = order;
          await writeJsonAtomic(ordersPath, orders);
          await recordOrderSubmission(order);
        }

        res.writeHead(302, {
          Location: `/?paytmOrder=${encodeURIComponent(orderId)}&paytmStatus=${encodeURIComponent(paymentStatus)}#checkout`
        });
        res.end();
        return;
      }

      if (pathname === '/api/orders' && req.method === 'GET') {
        if (!requireAdmin(req, res)) return;
        const orders = (await readJsonFile(ordersPath, [])) || [];
        sendJson(req, res, 200, { orders });
        return;
      }

      if (pathname.startsWith('/api/orders/') && req.method === 'PATCH') {
        if (!requireAdmin(req, res)) return;
        const orderId = decodeURIComponent(pathname.slice('/api/orders/'.length).trim());
        const orders = (await readJsonFile(ordersPath, [])) || [];
        const idx = orders.findIndex(o => o.orderId === orderId);
        if (idx < 0) {
          sendJson(req, res, 404, { error: 'Order not found.' });
          return;
        }
        const body = await readJsonBody(req, 32 * 1024);
        const fulfillmentStatus = String(body.fulfillmentStatus || '');
        if (!['new', 'contacted', 'shipped', 'completed', 'cancelled'].includes(fulfillmentStatus)) {
          sendJson(req, res, 400, { error: 'Invalid fulfillment status.' });
          return;
        }
        orders[idx] = { ...orders[idx], fulfillmentStatus, updatedAt: new Date().toISOString() };
        await writeJsonAtomic(ordersPath, orders);
        sendJson(req, res, 200, { ok: true, order: orders[idx] });
        return;
      }

      if (pathname === '/api/site-data/stream' && req.method === 'GET') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
          ...corsHeaders(req)
        });
        res.write(': connected\n\n');
        liveClients.add(res);
        res.on('close', () => {
          liveClients.delete(res);
        });
        return;
      }

      if (pathname === '/api/site-data') {
        if (req.method === 'GET') {
          const saved = await readJsonFile(siteDataPath, null);
          sendJson(req, res, 200, { data: saved });
          return;
        }
        if (req.method === 'PUT') {
          if (!requireAdmin(req, res)) return;
          const body = await readJsonBody(req, MAX_BODY_BYTES);
          const payload = body && typeof body === 'object' && 'data' in body ? body.data : body;
          if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
            sendJson(req, res, 400, { error: 'Invalid site data object.' });
            return;
          }
          const updatedAt = new Date().toISOString();
          await writeJsonAtomic(siteDataPath, payload);
          broadcastSiteData(payload, updatedAt);
          sendJson(req, res, 200, { ok: true, updatedAt });
          return;
        }
        if (req.method === 'DELETE') {
          if (!requireAdmin(req, res)) return;
          await writeJsonAtomic(siteDataPath, null);
          broadcastSiteData(null, new Date().toISOString());
          sendJson(req, res, 200, { ok: true });
          return;
        }
      }

      if (pathname === '/api/submissions') {
        if (req.method === 'POST') {
          const body = await readJsonBody(req, 256 * 1024);
          const type = String(body.type || 'contact').slice(0, 40);
          const allowedTypes = new Set(['contact', 'newsletter', 'booking', 'enrollment', 'rsvp', 'collaborate']);
          if (!allowedTypes.has(type)) {
            sendJson(req, res, 400, { error: 'Unsupported submission type.' });
            return;
          }
          const payload = body.payload && typeof body.payload === 'object' ? body.payload : {};
          const entry = {
            id: crypto.randomUUID(),
            type,
            status: 'new',
            createdAt: new Date().toISOString(),
            payload
          };
          const list = (await readJsonFile(submissionsPath, [])) || [];
          list.unshift(entry);
          await writeJsonAtomic(submissionsPath, list.slice(0, 2000));
          sendJson(req, res, 201, { ok: true, entry });
          return;
        }
        if (req.method === 'GET') {
          if (!requireAdmin(req, res)) return;
          const list = (await readJsonFile(submissionsPath, [])) || [];
          sendJson(req, res, 200, { submissions: list });
          return;
        }
      }

      if (pathname.startsWith('/api/submissions/')) {
        if (!requireAdmin(req, res)) return;
        const id = pathname.slice('/api/submissions/'.length).trim();
        const list = (await readJsonFile(submissionsPath, [])) || [];
        const idx = list.findIndex(item => item.id === id);
        if (idx < 0) {
          sendJson(req, res, 404, { error: 'Submission not found.' });
          return;
        }
        if (req.method === 'PATCH') {
          const body = await readJsonBody(req, 32 * 1024);
          const nextStatus = String(body.status || '');
          if (!['new', 'contacted', 'resolved'].includes(nextStatus)) {
            sendJson(req, res, 400, { error: 'Invalid status.' });
            return;
          }
          list[idx] = { ...list[idx], status: nextStatus, updatedAt: new Date().toISOString() };
          await writeJsonAtomic(submissionsPath, list);
          sendJson(req, res, 200, { ok: true, entry: list[idx] });
          return;
        }
        if (req.method === 'DELETE') {
          list.splice(idx, 1);
          await writeJsonAtomic(submissionsPath, list);
          sendJson(req, res, 200, { ok: true });
          return;
        }
      }

      if (pathname === '/api/upload' && req.method === 'POST') {
        if (!requireAdmin(req, res)) return;
        const body = await readJsonBody(req, 6 * 1024 * 1024);
        const dataUrl = String(body.dataUrl || '');
        const match = /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
        if (!match) {
          sendJson(req, res, 400, { error: 'Upload must be a JPG, PNG, or WebP image.' });
          return;
        }
        const ext = match[1] === 'jpg' ? 'jpeg' : match[1];
        const buffer = Buffer.from(match[2], 'base64');
        if (buffer.length > MAX_UPLOAD_BYTES) {
          sendJson(req, res, 413, { error: 'Image exceeds 4 MB limit.' });
          return;
        }
        await mkdir(uploadDir, { recursive: true });
        const filename = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
        await writeFile(path.join(uploadDir, filename), buffer);
        sendJson(req, res, 201, { ok: true, url: `assets/uploads/${filename}` });
        return;
      }

      sendJson(req, res, 404, { error: 'API endpoint not found.' });
    } catch (err) {
      if (err && err.status) {
        sendJson(req, res, err.status, { error: err.message });
        return;
      }
      sendJson(req, res, 500, { error: 'Internal server error.' });
    }
  });

  server.on('close', () => {
    clearInterval(sseHeartbeat);
    for (const clientRes of liveClients) {
      try { clientRes.end(); } catch { /* ignore */ }
    }
    liveClients.clear();
  });

  return { server, port, dataDir, uploadDir, paytmConfig };
}

export function startBackendServer(options = {}) {
  const app = createBackendServer(options);
  return new Promise((resolve, reject) => {
    app.server.once('error', reject);
    app.server.listen(app.port, () => {
      const addr = app.server.address();
      const actualPort = typeof addr === 'object' && addr ? addr.port : app.port;
      resolve({ ...app, port: actualPort });
    });
  });
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  startBackendServer().then(({ port }) => {
    console.log(`ycswu-backend API listening on http://127.0.0.1:${port}`);
  });
}
