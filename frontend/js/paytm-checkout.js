const LOCAL_ORDERS_KEY = 'ycswu-orders-v1';
const LOCAL_COUPONS = { HOOPABLES15: 15, STITCH10: 10 };

function isStaticFallbackStatus(status) {
  return status === 404 || status === 405;
}

function readLocalOrders() {
  try {
    const raw = localStorage.getItem(LOCAL_ORDERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalOrders(list) {
  try {
    localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(list.slice(0, 200)));
  } catch { /* ignore */ }
}

function itemUnitPrice(item) {
  if (item.id === 'wizard-plus') return 4999;
  if (item.id === 'wizard') return 3999;
  if (item.id === 'one-on-1') return 1600;
  return Math.max(1, Math.round(Number(item.price || 0)));
}

function calcLocalCoupon(code, items = []) {
  const normalized = String(code || '').trim().toUpperCase();
  const subtotal = (Array.isArray(items) ? items : []).reduce(
    (sum, item) => sum + itemUnitPrice(item) * Math.max(1, Math.round(Number(item.qty || 1))),
    0
  );
  if (!normalized) {
    return { valid: false, code: '', discountPercent: 0, subtotal, discountAmount: 0, finalTotal: subtotal };
  }
  const discountPercent = LOCAL_COUPONS[normalized] || 0;
  if (!discountPercent) {
    throw new Error('Promo code not recognized. Try HOOPABLES15 or STITCH10.');
  }
  const discountAmount = Math.round((subtotal * discountPercent) / 100);
  const finalTotal = Math.max(1, subtotal - discountAmount);
  return { valid: true, code: normalized, discountPercent, subtotal, discountAmount, finalTotal };
}

export async function fetchPaymentConfig() {
  try {
    const res = await fetch('/api/payments/config', { cache: 'no-store' });
    if (res.ok) return await res.json();
  } catch {
    /* offline static fallback */
  }
  return { mode: 'test', provider: 'Test Payment Testing', configured: false, env: 'staging' };
}

export async function applyCheckoutCoupon({ code, items }) {
  try {
    const res = await fetch('/api/checkout/coupon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, items })
    });
    if (res.ok) return await res.json();
    if (!isStaticFallbackStatus(res.status)) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || 'Invalid promo code.');
    }
  } catch (err) {
    if (err instanceof Error && !/fetch|network|failed/i.test(err.message)) throw err;
  }
  return calcLocalCoupon(code, items);
}

export async function createCheckoutOrder({ items, customer, paymentMethod = 'paytm', couponCode = '' }) {
  try {
    const res = await fetch('/api/checkout/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, customer, paymentMethod, couponCode })
    });
    if (res.ok) return await res.json();
    if (!isStaticFallbackStatus(res.status)) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || 'Could not create order.');
    }
  } catch (err) {
    if (err instanceof Error && !/fetch|network|failed/i.test(err.message)) throw err;
  }

  const coupon = calcLocalCoupon(couponCode, items);
  const safeItems = (Array.isArray(items) ? items : []).map(item => ({
    id: item.id,
    name: item.name || item.id,
    qty: Math.max(1, Math.round(Number(item.qty || 1))),
    unitPrice: itemUnitPrice(item)
  }));
  const address = customer?.street
    ? [customer.street, customer.city, customer.state, customer.pinCode].filter(Boolean).join(', ')
    : String(customer?.address || '');
  const orderId = `YCSWU-${Date.now().toString(36).toUpperCase()}`;
  const order = {
    orderId,
    createdAt: new Date().toISOString(),
    paymentMethod,
    mode: 'test',
    paymentStatus: paymentMethod === 'manual' ? 'manual_pending' : 'pending',
    fulfillmentStatus: 'new',
    amount: coupon.finalTotal,
    subtotal: coupon.subtotal,
    discountAmount: coupon.discountAmount,
    couponCode: coupon.valid ? coupon.code : '',
    items: safeItems,
    customer: { ...(customer || {}), address }
  };
  const list = readLocalOrders();
  list.unshift(order);
  writeLocalOrders(list);
  return { ok: true, mode: 'test', orderId, amount: order.amount, order };
}

export async function completeTestPayment(orderId, outcome) {
  try {
    const res = await fetch('/api/checkout/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, outcome })
    });
    if (res.ok) return await res.json();
    if (!isStaticFallbackStatus(res.status)) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || 'Could not complete payment.');
    }
  } catch (err) {
    if (err instanceof Error && !/fetch|network|failed/i.test(err.message)) throw err;
  }

  const list = readLocalOrders();
  const idx = list.findIndex(o => o.orderId === orderId);
  const nextStatus = outcome === 'paid' ? 'paid' : 'failed';
  const order = idx >= 0
    ? { ...list[idx], paymentStatus: nextStatus, updatedAt: new Date().toISOString() }
    : { orderId, paymentStatus: nextStatus, updatedAt: new Date().toISOString() };
  if (idx >= 0) {
    list[idx] = order;
    writeLocalOrders(list);
  }
  return { ok: true, order };
}
