import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
import { DEFAULT_CONTENT, normalizeContent, safeLink, validateContent } from '../frontend/js/site-content.js';
import { POLICY_DEFAULTS } from '../frontend/js/policy-defaults.js';
import { renderRouteView, headerMarkup, footerMarkup } from '../frontend/js/views.js';
import { startServer } from '../scripts/serve.mjs';
import { generateSignature, verifySignature } from '../backend/paytm.mjs';

test('canonical content normalizes and validates cleanly', () => {
  const normalized = normalizeContent(DEFAULT_CONTENT);
  assert.equal(validateContent(normalized), '');
  assert.equal(normalized.courses.length, 2);
  assert.equal(normalized.courses[0].name, 'Wizard Plus');
  assert.equal(normalized.courses[0].price, 4999);
  assert.equal(normalized.courses[1].name, 'Wizard');
  assert.equal(normalized.courses[1].price, 3999);
  assert.equal(normalized.events.length, 3);
  assert.equal(normalized.testimonials.meetups.length, 9);
  assert.equal(normalized.testimonials.learners.length, 7);
  assert.equal(normalized.galleries.homeCommunity.length, 14);
  assert.equal(normalized.galleries.workshops.length, 18);
  assert.equal(normalized.galleries.sessions.length, 8);
});

test('safeLink rejects unsafe javascript URLs and preserves valid routes/links', () => {
  assert.equal(safeLink('javascript:alert(1)', '#home'), '#home');
  assert.equal(safeLink('#wizard-plus'), '#wizard-plus');
  assert.equal(safeLink('https://www.instagram.com/youcanstitchwithus/'), 'https://www.instagram.com/youcanstitchwithus/');
  assert.equal(safeLink('mailto:youcanstitchwithus@gmail.com'), 'mailto:youcanstitchwithus@gmail.com');
});

test('all extracted legal and policy defaults contain verbatim content', () => {
  assert.match(POLICY_DEFAULTS.termsBody, /1\. Acceptance of Terms/);
  assert.match(POLICY_DEFAULTS.termsBody, /13\. Contact Us/);
  assert.match(POLICY_DEFAULTS.privacyBody, /support@youcanstitchwithus\.com/);
  assert.match(POLICY_DEFAULTS.shippingBody, /7-14 business days/);
  assert.match(POLICY_DEFAULTS.usageBody, /at least 48 hours before the event start time/);
  assert.match(POLICY_DEFAULTS.rulesBody, /Please be nice :\)/);
});

test('every public route renders clean HTML with zero undefined strings', () => {
  const routes = [
    { page: 'home', id: '' },
    { page: 'about', id: '' },
    { page: 'courses', id: '' },
    { page: 'wizard-plus', id: '' },
    { page: 'wizard', id: '' },
    { page: 'events', id: '' },
    { page: 'event', id: 'stitching-the-spring-nature-walk-workshop-women-only' },
    { page: '1-on-1', id: '' },
    { page: 'checkout', id: '' },
    { page: 'contact', id: '' },
    { page: 'terms', id: '' },
    { page: 'privacy', id: '' },
    { page: 'shipping', id: '' },
    { page: 'usage-guidelines', id: '' },
    { page: 'site-rules', id: '' }
  ];
  for (const r of routes) {
    const html = headerMarkup(DEFAULT_CONTENT, r, 1) + renderRouteView(DEFAULT_CONTENT, r, {
      bag: [{ id: 'wizard-plus', name: 'Wizard Plus', price: 4999, qty: 1, note: 'Test' }]
    }) + footerMarkup(DEFAULT_CONTENT);
    assert.ok(html.length > 500, `Route ${r.page} rendered too short`);
    assert.ok(!html.includes('undefined'), `Route ${r.page} leaked "undefined"`);
  }
});

test('dev persistence server serves static files, admin auth, site-data CRUD, and submissions', async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'ycswu-test-'));
  const uploadDir = path.join(tmpDir, 'uploads');
  const app = await startServer({
    port: 0,
    dataDir: tmpDir,
    uploadDir,
    adminPassword: 'test-passcode'
  });
  const baseUrl = `http://127.0.0.1:${app.port}`;
  try {
    const homeRes = await fetch(`${baseUrl}/`);
    assert.equal(homeRes.status, 200);
    const homeHtml = await homeRes.text();
    assert.match(homeHtml, /You Can Stitch With Us/);

    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthRes.status, 200);
    assert.deepEqual(await healthRes.json(), { ok: true, service: 'ycswu-backend' });

    // Unauthenticated PUT must fail
    const unauthPut = await fetch(`${baseUrl}/api/site-data`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: DEFAULT_CONTENT })
    });
    assert.equal(unauthPut.status, 401);

    // Login
    const loginRes = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'test-passcode' })
    });
    assert.equal(loginRes.status, 200);
    const { token } = await loginRes.json();
    assert.ok(token);

    // Save edited site content
    const modified = normalizeContent(DEFAULT_CONTENT);
    modified.home.heroSubtitle = 'Learn. Create. Stitch Together.';
    const putRes = await fetch(`${baseUrl}/api/site-data`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': token
      },
      body: JSON.stringify({ data: modified })
    });
    assert.equal(putRes.status, 200);

    const getRes = await fetch(`${baseUrl}/api/site-data`);
    assert.equal(getRes.status, 200);
    const loaded = await getRes.json();
    assert.equal(loaded.data.home.heroSubtitle, 'Learn. Create. Stitch Together.');

    // Live SSE stream pushes site-data updates immediately
    const streamCtrl = new AbortController();
    const streamRes = await fetch(`${baseUrl}/api/site-data/stream`, { signal: streamCtrl.signal });
    assert.equal(streamRes.status, 200);
    assert.match(streamRes.headers.get('content-type') || '', /text\/event-stream/);
    const reader = streamRes.body.getReader();
    const decoder = new TextDecoder();
    const firstFrame = await reader.read();
    assert.match(decoder.decode(firstFrame.value), /: connected/);

    const ssePayload = normalizeContent(DEFAULT_CONTENT);
    ssePayload.home.heroSubtitle = 'Live SSE Reload Works!';
    const ssePutRes = await fetch(`${baseUrl}/api/site-data`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': token
      },
      body: JSON.stringify({ data: ssePayload })
    });
    assert.equal(ssePutRes.status, 200);

    let sseBuffer = '';
    for (let i = 0; i < 6 && !sseBuffer.includes('Live SSE Reload Works!'); i += 1) {
      const chunk = await reader.read();
      if (chunk.done) break;
      sseBuffer += decoder.decode(chunk.value, { stream: true });
    }
    streamCtrl.abort();
    assert.match(sseBuffer, /event: site-data/);
    assert.match(sseBuffer, /Live SSE Reload Works!/);

    // Public form submission + admin read/update
    const subRes = await fetch(`${baseUrl}/api/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'enrollment',
        payload: { name: 'Aarav', email: 'aarav@example.com', total: 4999 }
      })
    });
    assert.equal(subRes.status, 201);
    const { entry } = await subRes.json();

    const listRes = await fetch(`${baseUrl}/api/submissions`, {
      headers: { 'x-admin-token': token }
    });
    assert.equal(listRes.status, 200);
    const { submissions } = await listRes.json();
    assert.equal(submissions.length, 1);
    assert.equal(submissions[0].payload.name, 'Aarav');

    const patchRes = await fetch(`${baseUrl}/api/submissions/${entry.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': token
      },
      body: JSON.stringify({ status: 'contacted' })
    });
    assert.equal(patchRes.status, 200);

    // Coupon preview API (valid & invalid)
    const couponValidRes = await fetch(`${baseUrl}/api/checkout/coupon`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'HOOPABLES15', items: [{ id: 'wizard-plus', qty: 1 }] })
    });
    assert.equal(couponValidRes.status, 200);
    const couponValid = await couponValidRes.json();
    assert.equal(couponValid.discountAmount, 750);
    assert.equal(couponValid.finalTotal, 4249);

    const couponBadRes = await fetch(`${baseUrl}/api/checkout/coupon`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'BADCODE', items: [{ id: 'wizard-plus', qty: 1 }] })
    });
    assert.equal(couponBadRes.status, 400);

    // Checkout config + fake payment testing (paid with coupon & structured address, and failed) + canonical price enforcement
    const payCfg = await (await fetch(`${baseUrl}/api/payments/config`)).json();
    assert.equal(payCfg.mode, 'test');

    const createPaid = await fetch(`${baseUrl}/api/checkout/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ id: 'wizard-plus', qty: 1, price: 1 }],
        paymentMethod: 'paytm',
        couponCode: 'HOOPABLES15',
        customer: {
          name: 'Meera',
          email: 'meera@example.com',
          phone: '+919999988888',
          street: '14 Indiranagar 100ft Rd',
          city: 'Bengaluru',
          state: 'Karnataka',
          pinCode: '560038'
        }
      })
    });
    assert.equal(createPaid.status, 200);
    const paidInit = await createPaid.json();
    assert.equal(paidInit.amount, 4249);
    assert.ok(paidInit.orderId.startsWith('YCSWU-'));

    const donePaid = await (await fetch(`${baseUrl}/api/checkout/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: paidInit.orderId, outcome: 'paid' })
    })).json();
    assert.equal(donePaid.order.paymentStatus, 'paid');

    const createFail = await (await fetch(`${baseUrl}/api/checkout/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ id: 'one-on-1', qty: 1 }],
        paymentMethod: 'paytm',
        customer: { name: 'Riya', email: 'riya@example.com', phone: '+919888877777' }
      })
    })).json();
    assert.equal(createFail.amount, 1600);

    const doneFail = await (await fetch(`${baseUrl}/api/checkout/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: createFail.orderId, outcome: 'failed' })
    })).json();
    assert.equal(doneFail.order.paymentStatus, 'failed');

    const ordersRes = await fetch(`${baseUrl}/api/orders`, {
      headers: { 'x-admin-token': token }
    });
    assert.equal(ordersRes.status, 200);
    const { orders } = await ordersRes.json();
    assert.equal(orders.length, 2);
    const paidOrder = orders.find(o => o.orderId === paidInit.orderId);
    assert.equal(paidOrder.customer.pinCode, '560038');
    assert.match(paidOrder.customer.address, /Indiranagar/);

    const patchOrderRes = await fetch(`${baseUrl}/api/orders/${paidInit.orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': token
      },
      body: JSON.stringify({ fulfillmentStatus: 'shipped' })
    });
    assert.equal(patchOrderRes.status, 200);

    const subsAfter = await (await fetch(`${baseUrl}/api/submissions`, {
      headers: { 'x-admin-token': token }
    })).json();
    assert.equal(subsAfter.submissions.some(s => s.payload.orderId === paidInit.orderId && s.payload.paymentStatus === 'paid'), true);
  } finally {
    await app.closeAll();
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test('Paytm AES-128-CBC checksum signs and verifies JSON and param maps, rejecting tampering', () => {
  const key = '1234567890123456';
  const jsonBody = JSON.stringify({ mid: 'TESTMID', orderId: 'ORD123', amount: '4999.00' });
  const sig1 = generateSignature(jsonBody, key);
  assert.equal(verifySignature(jsonBody, key, sig1), true);
  assert.equal(verifySignature(jsonBody.replace('4999.00', '1.00'), key, sig1), false);
  assert.equal(verifySignature(jsonBody, 'wrongkey12345678', sig1), false);

  const params = { MID: 'TESTMID', ORDERID: 'ORD123', TXNAMOUNT: '1600.00', STATUS: 'TXN_SUCCESS' };
  const sig2 = generateSignature(params, key);
  assert.equal(verifySignature(params, key, sig2), true);
  assert.equal(verifySignature({ ...params, TXNAMOUNT: '10.00' }, key, sig2), false);
});
