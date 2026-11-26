import { DEFAULT_CONTENT, normalizeContent } from './site-content.js';

const LOCAL_ANALYTICS_KEY = 'ycswu-analytics-v1';
const LOCAL_ORDERS_KEY = 'ycswu-orders-v1';
const LOCAL_SUBMISSIONS_KEY = 'ycswu-submissions-v1';
const LOCAL_SID_KEY = 'ycswu-sid-v1';
const LOCAL_TOKEN_KEY = 'ycswu-admin-token-v1';

const ALLOWED_TYPES = new Set([
  'page_view',
  'bag_add',
  'bag_open',
  'checkout_start',
  'coupon_apply',
  'order_paid',
  'order_failed',
  'order_manual',
  'form_submit',
  'outbound_click',
  'cta_click'
]);

let lastPageViewSig = '';
let lastPageViewAt = 0;

function readJson(key, fallback) {
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    if (typeof localStorage === 'undefined') return;
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

function getSessionId() {
  let sid = readJson(LOCAL_SID_KEY, '');
  if (!sid) {
    sid = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `sid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    writeJson(LOCAL_SID_KEY, sid);
  }
  return sid;
}

function detectDevice() {
  if (typeof window === 'undefined') return 'desktop';
  const w = window.innerWidth || 1280;
  if (w <= 760) return 'mobile';
  if (w <= 1140) return 'tablet';
  return 'desktop';
}

function detectReferrer() {
  if (typeof document === 'undefined') return 'Direct';
  const ref = String(document.referrer || '').trim();
  if (!ref) return 'Direct';
  try {
    const host = new URL(ref).hostname.replace(/^www\./i, '');
    const cur = typeof location !== 'undefined' ? location.hostname.replace(/^www\./i, '') : '';
    if (!host || host === cur) return 'Direct';
    return host;
  } catch {
    return 'Direct';
  }
}

function authHeaders() {
  const token = readJson(LOCAL_TOKEN_KEY, '');
  return token ? { 'x-admin-token': token } : {};
}

export function trackEvent(type, { route = '', label = '', meta = {} } = {}) {
  if (!ALLOWED_TYPES.has(type)) return;
  if (typeof location !== 'undefined' && /^#\/?admin(?:\/|$)/i.test(location.hash || '')) return;

  const currentHash = typeof location !== 'undefined' ? (location.hash || '#home').split('?')[0] : '#home';
  const entry = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    route: String(route || currentHash || '#home').slice(0, 120),
    label: String(label || '').slice(0, 160),
    sessionId: getSessionId(),
    device: detectDevice(),
    referrer: detectReferrer(),
    meta: meta && typeof meta === 'object' ? meta : {},
    createdAt: new Date().toISOString()
  };

  const list = readJson(LOCAL_ANALYTICS_KEY, []);
  const next = Array.isArray(list) ? list : [];
  next.unshift(entry);
  writeJson(LOCAL_ANALYTICS_KEY, next.slice(0, 1500));

  try {
    if (typeof fetch === 'function') {
      fetch('/api/analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
        keepalive: true
      }).catch(() => { /* offline fallback */ });
    }
  } catch {
    /* ignore */
  }
}

export function trackPageView(route = { page: 'home', id: '' }) {
  if (!route || route.page === 'admin') return;
  const routeKey = route.id ? `#${route.page}/${route.id}` : `#${route.page || 'home'}`;
  const now = Date.now();
  if (routeKey === lastPageViewSig && now - lastPageViewAt < 800) return;
  lastPageViewSig = routeKey;
  lastPageViewAt = now;
  trackEvent('page_view', {
    route: routeKey,
    label: typeof document !== 'undefined' ? document.title : routeKey
  });
}

export function computeAnalyticsSummary({
  events = [],
  orders = [],
  submissions = [],
  siteContent = DEFAULT_CONTENT,
  days = 0
} = {}) {
  const safeDays = Math.max(0, Math.min(365, Math.floor(Number(days || 0))));
  const cutoff = safeDays > 0 ? Date.now() - safeDays * 86400000 : 0;
  const inWindow = item => {
    if (!cutoff) return true;
    const t = Date.parse(item?.createdAt || '');
    return Number.isFinite(t) ? t >= cutoff : true;
  };

  const evList = (Array.isArray(events) ? events : []).filter(inWindow);
  const ordList = (Array.isArray(orders) ? orders : []).filter(inWindow);
  const subList = (Array.isArray(submissions) ? submissions : []).filter(inWindow);
  const content = normalizeContent(siteContent || DEFAULT_CONTENT);

  const pvEvents = evList.filter(x => x.type === 'page_view');
  const pageViews = pvEvents.length;
  const uniqueVisitors = new Set(evList.map(x => x.sessionId).filter(Boolean)).size;
  const paidOrdersList = ordList.filter(o => o.paymentStatus === 'paid');
  const paidOrders = paidOrdersList.length;
  const pendingOrders = ordList.filter(o => o.paymentStatus === 'pending' || o.paymentStatus === 'manual_pending').length;
  const failedOrders = ordList.filter(o => o.paymentStatus === 'failed').length;
  const paidRevenue = paidOrdersList.reduce((sum, o) => sum + Number(o.amount || 0), 0);
  const averageOrderValue = paidOrders ? Math.round(paidRevenue / paidOrders) : 0;
  const convBase = uniqueVisitors > 0 ? uniqueVisitors : pageViews;
  const conversionRate = convBase > 0 ? Number(((paidOrders / convBase) * 100).toFixed(1)) : 0;
  const totalSubmissions = subList.length;
  const unreadSubmissions = subList.filter(s => (s.status || 'new') === 'new').length;
  const bagAddEvents = evList.filter(x => x.type === 'bag_add');
  const bagAdds = bagAddEvents.length;
  const checkoutStarts = evList.filter(x => x.type === 'checkout_start').length;
  const outboundClicks = evList.filter(x => x.type === 'outbound_click').length;

  const pct = (val, base) => (base > 0 ? Math.min(100, Math.round((val / base) * 100)) : 0);
  const funnel = [
    { step: 'page_view', label: 'Page Views', count: pageViews, rate: pageViews > 0 ? 100 : 0 },
    { step: 'bag_add', label: 'Added to Bag', count: bagAdds, rate: pct(bagAdds, pageViews) },
    { step: 'checkout_start', label: 'Checkout Started', count: checkoutStarts, rate: pct(checkoutStarts, pageViews) },
    { step: 'order_paid', label: 'Completed Orders', count: paidOrders, rate: pct(paidOrders, pageViews) }
  ];

  const span = Math.max(7, Math.min(30, safeDays || 14));
  const dailyMap = new Map();
  const today = new Date();
  for (let i = span - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
    const key = d.toISOString().slice(0, 10);
    dailyMap.set(key, { date: key, views: 0, orders: 0, revenue: 0 });
  }
  for (const ev of pvEvents) {
    const key = String(ev.createdAt || '').slice(0, 10);
    const bucket = dailyMap.get(key);
    if (bucket) bucket.views += 1;
  }
  for (const o of ordList) {
    const key = String(o.createdAt || '').slice(0, 10);
    const bucket = dailyMap.get(key);
    if (bucket) {
      bucket.orders += 1;
      if (o.paymentStatus === 'paid') bucket.revenue += Number(o.amount || 0);
    }
  }
  const daily = [...dailyMap.values()];

  const pageCounts = new Map();
  for (const ev of pvEvents) {
    const r = ev.route || '#home';
    pageCounts.set(r, (pageCounts.get(r) || 0) + 1);
  }
  const topPages = [...pageCounts.entries()]
    .map(([route, views]) => ({
      route,
      views,
      share: pageViews > 0 ? Math.round((views / pageViews) * 100) : 0
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 12);

  const devices = { desktop: 0, mobile: 0, tablet: 0 };
  const deviceSource = pvEvents.length ? pvEvents : evList;
  for (const ev of deviceSource) {
    const dev = ev.device === 'mobile' || ev.device === 'tablet' ? ev.device : 'desktop';
    devices[dev] += 1;
  }

  const refMap = new Map();
  for (const ev of deviceSource) {
    const src = ev.referrer || 'Direct';
    refMap.set(src, (refMap.get(src) || 0) + 1);
  }
  const referrers = [...refMap.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const offeringMap = new Map();
  for (const c of content.courses || []) {
    offeringMap.set(c.id, { id: c.id, name: c.name, bagAdds: 0, orders: 0, revenue: 0 });
  }
  offeringMap.set('one-on-1', {
    id: 'one-on-1',
    name: content.oneOnOne?.title || '1:1 Tailored Embroidery Session',
    bagAdds: 0,
    orders: 0,
    revenue: 0
  });
  for (const ev of bagAddEvents) {
    const id = String(ev.meta?.itemId || '').trim();
    if (!id) continue;
    if (!offeringMap.has(id)) offeringMap.set(id, { id, name: ev.label || id, bagAdds: 0, orders: 0, revenue: 0 });
    offeringMap.get(id).bagAdds += 1;
  }
  for (const o of paidOrdersList) {
    for (const item of o.items || []) {
      const id = String(item.id || '').trim() || 'other';
      if (!offeringMap.has(id)) offeringMap.set(id, { id, name: item.name || id, bagAdds: 0, orders: 0, revenue: 0 });
      const row = offeringMap.get(id);
      const qty = Math.max(1, Number(item.qty || 1));
      const unit = Number(item.price ?? item.unitPrice ?? 0);
      row.orders += qty;
      row.revenue += unit * qty;
    }
  }
  const offerings = [...offeringMap.values()].sort((a, b) => b.revenue - a.revenue || b.bagAdds - a.bagAdds);

  const couponMap = new Map();
  for (const o of ordList) {
    const code = String(o.couponCode || '').trim().toUpperCase();
    if (!code) continue;
    const prev = couponMap.get(code) || { code, uses: 0, totalDiscount: 0 };
    prev.uses += 1;
    prev.totalDiscount += Number(o.discountAmount || 0);
    couponMap.set(code, prev);
  }
  const coupons = [...couponMap.values()].sort((a, b) => b.uses - a.uses);

  const activity = [
    ...ordList.slice(0, 30).map(o => ({
      id: o.orderId,
      kind: 'order',
      title: `Order ${o.orderId} · ₹${Number(o.amount || 0).toLocaleString('en-IN')}`,
      detail: `${o.customer?.name || 'Customer'} (${(o.items || []).map(i => i.name).join(', ')})`,
      status: o.paymentStatus || 'pending',
      createdAt: o.updatedAt || o.createdAt || ''
    })),
    ...subList.slice(0, 30).map(s => ({
      id: s.id,
      kind: 'submission',
      title: `${String(s.type || 'inquiry').toUpperCase()} submission`,
      detail: s.payload?.name || s.payload?.email || 'Public form',
      status: s.status || 'new',
      createdAt: s.createdAt || ''
    })),
    ...evList.filter(ev => ev.type !== 'page_view' || ev.route).slice(0, 40).map(ev => ({
      id: ev.id,
      kind: ev.type,
      title: ev.type === 'page_view' ? `Visited ${ev.route}` : `${ev.type.replace(/_/g, ' ')}${ev.label ? ` · ${ev.label}` : ''}`,
      detail: `${ev.device || 'desktop'} · ${ev.referrer || 'Direct'}`,
      status: ev.type,
      createdAt: ev.createdAt || ''
    }))
  ].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 50);

  return {
    ok: true,
    days: safeDays,
    generatedAt: new Date().toISOString(),
    kpis: {
      pageViews,
      uniqueVisitors,
      totalOrders: ordList.length,
      paidOrders,
      pendingOrders,
      failedOrders,
      paidRevenue,
      averageOrderValue,
      conversionRate,
      totalSubmissions,
      unreadSubmissions,
      bagAdds,
      checkoutStarts,
      outboundClicks
    },
    funnel,
    daily,
    topPages,
    devices,
    referrers,
    offerings,
    coupons,
    recentActivity: activity
  };
}

export async function loadAnalyticsSummary(days = 0, siteContent = DEFAULT_CONTENT) {
  try {
    const res = await fetch(`/api/analytics/summary?days=${encodeURIComponent(String(days || 0))}`, {
      headers: authHeaders(),
      cache: 'no-store'
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    /* static fallback */
  }
  return computeAnalyticsSummary({
    events: readJson(LOCAL_ANALYTICS_KEY, []),
    orders: readJson(LOCAL_ORDERS_KEY, []),
    submissions: readJson(LOCAL_SUBMISSIONS_KEY, []),
    siteContent,
    days
  });
}

export async function clearAnalyticsData() {
  writeJson(LOCAL_ANALYTICS_KEY, []);
  try {
    const res = await fetch('/api/analytics', {
      method: 'DELETE',
      headers: authHeaders()
    });
    if (res.ok) return true;
  } catch {
    /* static fallback */
  }
  return true;
}
