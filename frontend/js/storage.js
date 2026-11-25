import { DEFAULT_CONTENT, normalizeContent } from './site-content.js';

const LOCAL_CONTENT_KEY = 'ycswu-site-data-v1';
const LOCAL_SUBMISSIONS_KEY = 'ycswu-submissions-v1';
const LOCAL_TOKEN_KEY = 'ycswu-admin-token-v1';
const SYNC_CHANNEL_NAME = 'ycswu-live-sync-v1';
const liveChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(SYNC_CHANNEL_NAME) : null;

function broadcastLocalUpdate(data, updatedAt = new Date().toISOString()) {
  try {
    liveChannel?.postMessage({ type: 'site-data', data, updatedAt });
  } catch {
    /* ignore */
  }
}

function isStaticFallbackStatus(status) {
  return status === 404 || status === 405;
}

function readLocalJson(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocalJson(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore storage quota errors */
  }
}

function authHeaders() {
  const token = readLocalJson(LOCAL_TOKEN_KEY, '');
  return token ? { 'x-admin-token': token } : {};
}

export async function loadSiteContent() {
  const cached = readLocalJson(LOCAL_CONTENT_KEY, null);
  try {
    const res = await fetch('/api/site-data', { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json && json.data && typeof json.data === 'object') {
        const normalized = normalizeContent(json.data);
        writeLocalJson(LOCAL_CONTENT_KEY, normalized);
        return { data: normalized, source: 'server' };
      }
      // Server reachable but no overrides saved yet
      if (cached) return { data: normalizeContent(cached), source: 'local' };
      return { data: normalizeContent(DEFAULT_CONTENT), source: 'default' };
    }
  } catch {
    /* static hosting fallback */
  }
  if (cached) return { data: normalizeContent(cached), source: 'local' };
  return { data: normalizeContent(DEFAULT_CONTENT), source: 'default' };
}

export async function saveSiteContent(nextContent) {
  const normalized = normalizeContent(nextContent);
  writeLocalJson(LOCAL_CONTENT_KEY, normalized);
  broadcastLocalUpdate(normalized);
  try {
    const res = await fetch('/api/site-data', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders()
      },
      body: JSON.stringify({ data: normalized })
    });
    if (res.ok) {
      const out = await res.json();
      return { ok: true, mode: 'server', updatedAt: out.updatedAt, data: normalized };
    }
    if (res.status === 401) {
      return { ok: false, error: 'Your admin session expired. Please sign in again.' };
    }
    if (!isStaticFallbackStatus(res.status)) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, error: err.error || 'Could not save site data.' };
    }
  } catch {
    /* static fallback */
  }
  return { ok: true, mode: 'local', data: normalized };
}

export async function resetSiteContent() {
  writeLocalJson(LOCAL_CONTENT_KEY, null);
  broadcastLocalUpdate(null);
  try {
    const res = await fetch('/api/site-data', {
      method: 'DELETE',
      headers: authHeaders()
    });
    if (res.ok) return { ok: true, data: normalizeContent(DEFAULT_CONTENT) };
  } catch {
    /* ignore */
  }
  return { ok: true, data: normalizeContent(DEFAULT_CONTENT) };
}

export async function checkAdminSession() {
  try {
    const res = await fetch('/api/admin/session', { headers: authHeaders(), cache: 'no-store' });
    if (res.ok) {
      const info = await res.json();
      return { authenticated: Boolean(info.authenticated), demoPasscodeHint: info.demoPasscodeHint || null, offline: false };
    }
  } catch {
    /* offline static fallback */
  }
  const hasToken = Boolean(readLocalJson(LOCAL_TOKEN_KEY, ''));
  return { authenticated: hasToken, demoPasscodeHint: 'stitch-admin', offline: true };
}

export async function loginAdmin(password) {
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    if (res.ok) {
      const json = await res.json();
      if (json.token) writeLocalJson(LOCAL_TOKEN_KEY, json.token);
      return { ok: true };
    }
    if (!isStaticFallbackStatus(res.status)) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, error: err.error || 'Incorrect admin passcode.' };
    }
  } catch {
    /* static fallback below */
  }
  if (password === 'stitch-admin') {
    writeLocalJson(LOCAL_TOKEN_KEY, 'local-demo-session');
    return { ok: true };
  }
  return { ok: false, error: 'Incorrect admin passcode.' };
}

export function subscribeSiteContent(onUpdate, { enableServerStream = true } = {}) {
  let lastSig = '';
  const emit = raw => {
    const next = normalizeContent(raw && typeof raw === 'object' ? raw : DEFAULT_CONTENT);
    const sig = JSON.stringify(next);
    if (sig === lastSig) return;
    lastSig = sig;
    if (raw && typeof raw === 'object') writeLocalJson(LOCAL_CONTENT_KEY, next);
    else writeLocalJson(LOCAL_CONTENT_KEY, null);
    onUpdate(next);
  };

  const onChannelMessage = ev => {
    if (ev?.data?.type === 'site-data') emit(ev.data.data);
  };
  liveChannel?.addEventListener('message', onChannelMessage);

  const onStorage = ev => {
    if (ev.key !== LOCAL_CONTENT_KEY) return;
    try {
      emit(ev.newValue ? JSON.parse(ev.newValue) : null);
    } catch {
      /* ignore */
    }
  };
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);

  let es = null;
  if (enableServerStream && typeof EventSource !== 'undefined') {
    es = new EventSource('/api/site-data/stream');
    es.addEventListener('site-data', ev => {
      try {
        const msg = JSON.parse(ev.data || '{}');
        emit(msg.data ?? null);
      } catch {
        /* ignore */
      }
    });
    es.onerror = () => {
      fetch('/api/health', { cache: 'no-store' })
        .then(r => { if (!r.ok) es?.close(); })
        .catch(() => es?.close());
    };
  }

  return () => {
    liveChannel?.removeEventListener('message', onChannelMessage);
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
    es?.close();
  };
}

export async function logoutAdmin() {
  writeLocalJson(LOCAL_TOKEN_KEY, null);
  try {
    await fetch('/api/admin/logout', { method: 'POST', headers: authHeaders() });
  } catch {
    /* ignore */
  }
}

export async function submitPublicForm(type, payload) {
  const localEntry = {
    id: (crypto?.randomUUID ? crypto.randomUUID() : `sub-${Date.now()}`),
    type,
    status: 'new',
    createdAt: new Date().toISOString(),
    payload
  };
  try {
    const res = await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, payload })
    });
    if (res.ok) {
      const out = await res.json();
      return { ok: true, entry: out.entry || localEntry };
    }
  } catch {
    /* static fallback */
  }
  const list = readLocalJson(LOCAL_SUBMISSIONS_KEY, []);
  list.unshift(localEntry);
  writeLocalJson(LOCAL_SUBMISSIONS_KEY, list.slice(0, 500));
  return { ok: true, entry: localEntry, localOnly: true };
}

export async function loadSubmissions() {
  try {
    const res = await fetch('/api/submissions', { headers: authHeaders(), cache: 'no-store' });
    if (res.ok) {
      const out = await res.json();
      return out.submissions || [];
    }
  } catch {
    /* static fallback */
  }
  return readLocalJson(LOCAL_SUBMISSIONS_KEY, []);
}

export async function updateSubmissionStatus(id, status) {
  try {
    const res = await fetch(`/api/submissions/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ status })
    });
    if (res.ok) return true;
  } catch {
    /* fallback */
  }
  const list = readLocalJson(LOCAL_SUBMISSIONS_KEY, []);
  const next = list.map(item => (item.id === id ? { ...item, status } : item));
  writeLocalJson(LOCAL_SUBMISSIONS_KEY, next);
  return true;
}

export async function deleteSubmission(id) {
  try {
    const res = await fetch(`/api/submissions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    if (res.ok) return true;
  } catch {
    /* fallback */
  }
  const list = readLocalJson(LOCAL_SUBMISSIONS_KEY, []).filter(item => item.id !== id);
  writeLocalJson(LOCAL_SUBMISSIONS_KEY, list);
  return true;
}

export async function uploadImageFile(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read selected file.'));
    reader.readAsDataURL(file);
  });

  // Resize/compress on canvas if oversized so local fallback & server uploads remain fast
  const compressed = await compressDataUrl(dataUrl, 1600, 0.88);
  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ dataUrl: compressed })
    });
    if (res.ok) {
      const json = await res.json();
      if (json.url) return json.url;
    }
  } catch {
    /* fallback to inline data URL */
  }
  return compressed;
}

function compressDataUrl(dataUrl, maxDim = 1600, quality = 0.88) {
  return new Promise(resolve => {
    if (typeof Image === 'undefined' || typeof document === 'undefined') {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
      const w = Math.max(1, Math.round((img.width || 1) * ratio));
      const h = Math.max(1, Math.round((img.height || 1) * ratio));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      const isPng = dataUrl.startsWith('data:image/png');
      const out = canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', quality);
      resolve(out.length < dataUrl.length ? out : dataUrl);
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
