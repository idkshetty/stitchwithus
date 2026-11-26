import {
  CONTENT_SCHEMA,
  DEFAULT_CONTENT,
  escapeHTML as e,
  formatINR,
  normalizeContent,
  normalizeCourse,
  normalizeEvent,
  safeImage,
  validateContent
} from './site-content.js';
import { contentInlineTargets } from './live-site-editor.js';
import { flashControl } from './inline-edit.js';
import { mountSitePreviewPanel } from './site-preview.js';
import { clearAnalyticsData, loadAnalyticsSummary } from './analytics.js';
import {
  deleteSubmission,
  loadOrders,
  loadSubmissions,
  loginAdmin,
  logoutAdmin,
  resetSiteContent,
  updateOrder,
  updateSubmissionStatus,
  uploadImageFile
} from './storage.js';

const ADMIN_GROUPS = [
  {
    label: 'Insights & tracking',
    items: [
      ['overview', 'Dashboard & tracking']
    ]
  },
  {
    label: 'Design & content',
    items: [
      ['content', 'Storefront editor'],
      ['courses', 'Courses & pricing'],
      ['events', 'Events & workshops'],
      ['testimonials', 'Testimonials'],
      ['galleries', 'Photo galleries'],
      ['policies', 'Pages & policies']
    ]
  },
  {
    label: 'Operations',
    items: [
      ['orders', 'Orders & tracking'],
      ['inquiries', 'Inquiries & bookings'],
      ['backup', 'Backup & reset']
    ]
  }
];

const POLICY_TABS = [
  ['terms', 'Terms of Service', 'terms'],
  ['privacy', 'Privacy Policy', 'privacy'],
  ['shipping', 'Shipping & Refunds', 'shipping'],
  ['usage', 'Usage & Guidelines', 'usage-guidelines'],
  ['rules', 'Site Rules', 'site-rules']
];

const FULFILLMENT_STATES = ['new', 'contacted', 'packed', 'shipped', 'delivered', 'completed', 'cancelled'];

const csvSafe = val => {
  const s = String(val ?? '').replace(/\r?\n/g, ' ');
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

const shortTime = iso => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return String(iso).slice(0, 16);
  }
};

export function renderAdminStudio(root, {
  authenticated,
  demoPasscodeHint,
  data,
  routeTab = 'overview',
  onAuthChange,
  onSaveData,
  onToast,
  onOpenPreviewModal
}) {
  const validTabs = new Set(ADMIN_GROUPS.flatMap(g => g.items.map(([id]) => id)));
  const activeTab = validTabs.has(routeTab) ? routeTab : 'overview';

  if (!authenticated) {
    root.innerHTML = `<section class="admin-login-wrap">
      <div class="admin-login-card">
        <p class="eyebrow">You Can Stitch With Us · Studio</p>
        <h1>Admin Sign In</h1>
        <p class="small muted">Sign in to edit the storefront, monitor site analytics and conversion tracking, manage courses &amp; workshops, and track orders.</p>
        <form class="form-stack" id="admin-login-form">
          <label class="field">Admin Passcode
            <input type="password" name="password" required autocomplete="current-password" placeholder="Enter passcode">
          </label>
          <p class="small" id="admin-login-error" style="color:var(--rose-deep);margin:0" hidden></p>
          <button type="submit" class="btn-lime" style="justify-content:center">
            <span>Sign in to Admin Studio</span>
            <span class="btn-lime-circle" aria-hidden="true">→</span>
          </button>
          ${demoPasscodeHint ? `<button type="button" class="btn btn-outline" id="demo-admin-btn">Use local demo passcode (${e(demoPasscodeHint)})</button>` : ''}
        </form>
        <p class="small muted" style="margin:0"><a href="#home" class="text-link">← Back to public website</a></p>
      </div>
    </section>`;

    const form = root.querySelector('#admin-login-form');
    const errEl = root.querySelector('#admin-login-error');
    const demoBtn = root.querySelector('#demo-admin-btn');

    const submitPass = async pass => {
      errEl.hidden = true;
      const res = await loginAdmin(pass);
      if (res.ok) {
        onToast?.('Signed into Admin Studio');
        await onAuthChange?.();
      } else {
        errEl.textContent = res.error || 'Incorrect passcode.';
        errEl.hidden = false;
      }
    };

    form?.addEventListener('submit', async ev => {
      ev.preventDefault();
      await submitPass(form.elements.password.value);
    });
    demoBtn?.addEventListener('click', () => submitPass(demoPasscodeHint));
    return;
  }

  let draft = normalizeContent(data);
  let activePolicySubtab = 'terms';
  let activeGalleryKey = 'homeCommunity';
  let activeInquiryFilter = 'all';
  let activeOrderFilter = 'all';
  let orderQuery = '';
  let inquiryQuery = '';
  let activeDays = 0;
  let submissions = [];
  let previewCtrl = null;
  let busy = false;

  const isDirty = () => JSON.stringify(draft) !== JSON.stringify(normalizeContent(data));

  function mobileBarHtml() {
    return `<div class="admin-mobile-bar">
      <select data-admin-mobile-nav aria-label="Admin section">
        ${ADMIN_GROUPS.map(g => `<optgroup label="${e(g.label)}">
          ${g.items.map(([id, label]) => `<option value="${e(id)}" ${id === activeTab ? 'selected' : ''}>${e(label)}</option>`).join('')}
        </optgroup>`).join('')}
      </select>
      <button type="button" class="btn btn-outline btn-sm" data-admin-action="open-preview">Preview</button>
      <a class="btn btn-outline btn-sm" href="#home">Live ↗</a>
      <button type="button" class="btn btn-outline btn-sm" data-admin-action="logout" style="color:var(--rose-deep)">Sign out</button>
    </div>`;
  }

  function sidebarHtml(newInqCount = 0, pendingOrdCount = 0) {
    return `<aside class="admin-sidebar">
      <div>
        <p class="eyebrow" style="margin:0 0 4px 10px">Stitch Studio</p>
        <p class="small muted" style="margin:0 0 0 10px">Admin &amp; Tracking</p>
      </div>
      <nav class="admin-nav" aria-label="Admin navigation">
        ${ADMIN_GROUPS.map(group => `<div>
          <p class="admin-nav-group-label">${e(group.label)}</p>
          <div class="admin-nav-items">
            ${group.items.map(([id, label]) => `<a href="#admin/${id}" class="admin-tab ${activeTab === id ? 'is-active' : ''}">
              <span>${e(label)}</span>
              ${id === 'inquiries' && newInqCount ? `<span class="admin-badge">${newInqCount}</span>` : ''}
              ${id === 'orders' && pendingOrdCount ? `<span class="admin-badge">${pendingOrdCount}</span>` : ''}
            </a>`).join('')}
          </div>
        </div>`).join('')}
      </nav>
      <div class="admin-sidebar-foot">
        <button type="button" class="admin-tab" data-admin-action="open-preview"><span>Site preview</span><span aria-hidden="true">👁</span></button>
        <a class="admin-tab" href="#home">View live site ↗</a>
        <button type="button" class="admin-tab" data-admin-action="logout" style="color:var(--rose-deep)">Sign out</button>
      </div>
    </aside>`;
  }

  function renderShell() {
    previewCtrl?.dispose();
    previewCtrl = null;
    root.innerHTML = `<div class="admin-layout">
      ${mobileBarHtml()}
      ${sidebarHtml()}
      <section class="admin-main" id="admin-tab-body"></section>
    </div>`;

    const body = root.querySelector('#admin-tab-body');
    if (activeTab === 'overview') renderOverviewTab(body);
    else if (activeTab === 'content') renderContentEditorTab(body);
    else if (activeTab === 'courses') renderCoursesTab(body);
    else if (activeTab === 'events') renderEventsTab(body);
    else if (activeTab === 'testimonials') renderTestimonialsTab(body);
    else if (activeTab === 'galleries') renderGalleriesTab(body);
    else if (activeTab === 'policies') renderPoliciesTab(body);
    else if (activeTab === 'orders') renderOrdersTab(body);
    else if (activeTab === 'inquiries') renderInquiriesTab(body);
    else if (activeTab === 'backup') renderBackupTab(body);

    root.querySelector('[data-admin-mobile-nav]')?.addEventListener('change', ev => {
      location.hash = `#admin/${ev.target.value}`;
    });
    root.querySelectorAll('[data-admin-action="logout"]').forEach(btn => btn.addEventListener('click', async () => {
      await logoutAdmin();
      onToast?.('Signed out');
      await onAuthChange?.();
    }));
    root.querySelectorAll('[data-admin-action="open-preview"]').forEach(btn => btn.addEventListener('click', () => {
      onOpenPreviewModal?.(draft);
    }));
  }

  async function publishDraft(nextDraft = draft, msg = 'Changes published live!') {
    const err = validateContent(nextDraft);
    if (err) {
      onToast?.(err, true);
      return false;
    }
    busy = true;
    try {
      const res = await onSaveData?.(nextDraft);
      if (res?.ok === false) {
        onToast?.(res.error || 'Could not save changes.', true);
        return false;
      }
      data = normalizeContent(res?.data || nextDraft);
      draft = normalizeContent(data);
      onToast?.(msg);
      return true;
    } finally {
      busy = false;
    }
  }

  async function renderOverviewTab(container) {
    const ranges = [
      [1, 'Today'],
      [7, '7 Days'],
      [30, '30 Days'],
      [0, 'All Time']
    ];

    container.innerHTML = `<div class="admin-head">
      <div>
        <p class="eyebrow">Live Site Analytics &amp; Operations</p>
        <h1>Dashboard &amp; tracking</h1>
        <p>Monitor page visits, checkout conversion funnel, offering performance, promo usage, and customer activity in real time.</p>
      </div>
      <div class="admin-head-actions">
        <button type="button" class="btn btn-outline btn-sm" data-ov-refresh>↻ Refresh</button>
        <button type="button" class="btn btn-dark btn-sm" data-ov-export>Export Tracking CSV</button>
      </div>
    </div>
    <div class="policy-subnav" role="group" aria-label="Analytics time range">
      ${ranges.map(([d, lbl]) => `<button type="button" class="policy-subtab ${activeDays === d ? 'is-active' : ''}" data-ov-days="${d}">${e(lbl)}</button>`).join('')}
    </div>
    <div id="overview-body"><p class="muted">Loading live metrics…</p></div>`;

    const bodyEl = container.querySelector('#overview-body');
    let lastSummary = null;

    const draw = async () => {
      lastSummary = await loadAnalyticsSummary(activeDays, data);
      const k = lastSummary.kpis || {};
      const funnel = lastSummary.funnel || [];
      const daily = lastSummary.daily || [];
      const maxViews = Math.max(1, ...daily.map(d => d.views));
      const topPages = lastSummary.topPages || [];
      const devTotal = Math.max(1, (lastSummary.devices?.desktop || 0) + (lastSummary.devices?.mobile || 0) + (lastSummary.devices?.tablet || 0));
      const refs = lastSummary.referrers || [];
      const offerings = lastSummary.offerings || [];
      const coupons = lastSummary.coupons || [];
      const activity = lastSummary.recentActivity || [];

      bodyEl.innerHTML = `<div class="kpi-grid">
        <div class="kpi-card is-accent">
          <span class="kpi-label">Paid Revenue</span>
          <span class="kpi-value">${e(formatINR(k.paidRevenue || 0))}</span>
          <span class="kpi-sub">Avg order: ${e(formatINR(k.averageOrderValue || 0))}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Orders</span>
          <span class="kpi-value">${e(k.totalOrders || 0)}</span>
          <span class="kpi-sub">${e(k.paidOrders || 0)} paid · ${e(k.pendingOrders || 0)} pending · ${e(k.failedOrders || 0)} failed</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Page Views</span>
          <span class="kpi-value">${e(k.pageViews || 0)}</span>
          <span class="kpi-sub">${e(k.bagAdds || 0)} bag adds · ${e(k.outboundClicks || 0)} outbound clicks</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Unique Visitors</span>
          <span class="kpi-value">${e(k.uniqueVisitors || 0)}</span>
          <span class="kpi-sub">Active sessions tracked</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Conversion Rate</span>
          <span class="kpi-value">${e(k.conversionRate || 0)}%</span>
          <span class="kpi-sub">${e(k.checkoutStarts || 0)} checkouts started</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Inquiries &amp; Leads</span>
          <span class="kpi-value">${e(k.totalSubmissions || 0)}</span>
          <span class="kpi-sub">${e(k.unreadSubmissions || 0)} unread new</span>
        </div>
      </div>

      <div class="analytics-grid">
        <section class="analytics-card">
          <h2>Conversion Funnel</h2>
          <div class="funnel-list">
            ${funnel.map(f => `<div class="funnel-row">
              <div class="funnel-meta">
                <span>${e(f.label)}</span>
                <span class="tabular">${e(f.count)} (${e(f.rate)}%)</span>
              </div>
              <div class="funnel-bar-track"><div class="funnel-bar-fill" style="width:${Math.max(f.count ? 4 : 0, Math.min(100, f.rate))}%"></div></div>
            </div>`).join('')}
          </div>
        </section>

        <section class="analytics-card">
          <h2>Daily Traffic &amp; Orders (Last ${daily.length} Days)</h2>
          <div class="trend-chart">
            ${daily.map(d => {
              const h = d.views ? Math.max(8, Math.round((d.views / maxViews) * 100)) : 4;
              return `<div class="trend-col" title="${e(d.date)}: ${d.views} views, ${d.orders} orders (${formatINR(d.revenue)})">
                ${d.orders ? `<span class="trend-badge">${d.orders}</span>` : ''}
                <div class="trend-bar-wrap"><div class="trend-bar" style="height:${h}%"></div></div>
                <span class="trend-date">${e(d.date.slice(5))}</span>
              </div>`;
            }).join('')}
          </div>
        </section>

        <section class="analytics-card">
          <h2>Top Visited Pages</h2>
          ${topPages.length ? `<div class="breakdown-list">
            ${topPages.map(p => `<div class="breakdown-row">
              <div class="breakdown-top"><span>${e(p.route)}</span><span class="tabular">${e(p.views)} views (${e(p.share)}%)</span></div>
              <div class="funnel-bar-track"><div class="funnel-bar-fill" style="width:${Math.max(4, p.share)}%"></div></div>
            </div>`).join('')}
          </div>` : `<p class="small muted" style="margin:0">Browse public routes (#home, #courses, #events) to populate page visit data.</p>`}
        </section>

        <section class="analytics-card">
          <h2>Devices &amp; Traffic Sources</h2>
          <div class="breakdown-list">
            ${[['Desktop', lastSummary.devices?.desktop || 0], ['Mobile', lastSummary.devices?.mobile || 0], ['Tablet', lastSummary.devices?.tablet || 0]].map(([lbl, cnt]) => {
              const pct = Math.round((cnt / devTotal) * 100);
              return `<div class="breakdown-row">
                <div class="breakdown-top"><span>${lbl}</span><span class="tabular">${cnt} (${pct}%)</span></div>
                <div class="funnel-bar-track"><div class="funnel-bar-fill" style="width:${cnt ? Math.max(4, pct) : 0}%"></div></div>
              </div>`;
            }).join('')}
          </div>
          ${refs.length ? `<div style="border-top:1px solid var(--line);padding-top:10px;display:grid;gap:6px">
            <span class="eyebrow" style="margin:0">Referrers</span>
            ${refs.map(r => `<div class="breakdown-top small"><span>${e(r.source)}</span><span class="tabular">${e(r.count)}</span></div>`).join('')}
          </div>` : ''}
        </section>

        <section class="analytics-card">
          <h2>Offerings Performance</h2>
          <div class="breakdown-list">
            ${offerings.map(o => `<div class="activity-item">
              <div><strong>${e(o.name)}</strong><div class="small muted">${e(o.bagAdds)} bag adds · ${e(o.orders)} paid qty</div></div>
              <strong class="tabular">${e(formatINR(o.revenue))}</strong>
            </div>`).join('')}
          </div>
        </section>

        <section class="analytics-card">
          <h2>Promo Codes &amp; Quick Shortcuts</h2>
          ${coupons.length ? `<div class="breakdown-list">
            ${coupons.map(c => `<div class="activity-item">
              <div><strong>${e(c.code)}</strong><div class="small muted">${e(c.uses)} redemptions</div></div>
              <strong class="tabular">−${e(formatINR(c.totalDiscount))}</strong>
            </div>`).join('')}
          </div>` : `<p class="small muted" style="margin:0">No promo codes redeemed in this period (HOOPABLES15, STITCH10).</p>`}
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:auto">
            <a href="#admin/orders" class="btn btn-outline btn-sm">Manage Orders →</a>
            <a href="#admin/inquiries" class="btn btn-outline btn-sm">View Inquiries →</a>
            <a href="#admin/content" class="btn-lime btn-sm">Open Storefront Editor →</a>
          </div>
        </section>
      </div>

      <section class="analytics-card">
        <div class="admin-item-head">
          <h2>Recent Live Activity Feed</h2>
          <span class="small muted">${activity.length} events shown</span>
        </div>
        ${activity.length ? `<div class="activity-feed">
          ${activity.map(item => `<div class="activity-item">
            <div>
              <strong>${e(item.title)}</strong>
              <div class="small muted">${e(item.detail)}</div>
            </div>
            <div style="display:flex;gap:8px;align-items:center">
              <span class="status-pill is-${e(item.status)}">${e(item.status)}</span>
              <span class="small muted tabular">${e(shortTime(item.createdAt))}</span>
            </div>
          </div>`).join('')}
        </div>` : `<p class="small muted" style="margin:0">No activity tracked in this timeframe yet.</p>`}
      </section>`;
    };

    await draw();

    container.querySelectorAll('[data-ov-days]').forEach(btn => btn.addEventListener('click', async () => {
      activeDays = Number(btn.getAttribute('data-ov-days') || 0);
      container.querySelectorAll('[data-ov-days]').forEach(b => b.classList.toggle('is-active', b === btn));
      await draw();
    }));

    container.querySelector('[data-ov-refresh]')?.addEventListener('click', async () => {
      await draw();
      onToast?.('Analytics refreshed');
    });

    container.querySelector('[data-ov-export]')?.addEventListener('click', () => {
      if (!lastSummary) return;
      const headers = ['Kind', 'Title', 'Detail', 'Status', 'Timestamp'];
      const rows = (lastSummary.recentActivity || []).map(a => [
        csvSafe(a.kind),
        csvSafe(a.title),
        csvSafe(a.detail),
        csvSafe(a.status),
        csvSafe(a.createdAt)
      ].join(','));
      const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `ycswu-tracking-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
    });
  }

  function renderContentEditorTab(container, onlyPolicies = false) {
    const sectionsToRender = onlyPolicies
      ? { policies: CONTENT_SCHEMA.policies }
      : Object.fromEntries(Object.entries(CONTENT_SCHEMA).filter(([k]) => k !== 'policies'));

    const fieldHtml = (sec, key, f, groupLabel) => {
      const id = `ed-${sec}-${key}`;
      const name = `${sec}.${key}`;
      const val = draft[sec]?.[key] ?? f.value;
      const meta = e(`${f.label} ${groupLabel} ${sec} ${key}`.toLowerCase());
      let inner = '';
      if (f.kind === 'checkbox') {
        inner = `<label class="visibility-toggle" for="${id}"><input id="${id}" name="${name}" type="checkbox" ${val ? 'checked' : ''}>${e(f.label)}</label>`;
      } else if (f.kind === 'image') {
        inner = `<label class="field" for="${id}">${e(f.label)}
            <input id="${id}" name="${name}" maxlength="${f.max}" value="${val.startsWith('data:') ? '' : e(val)}" placeholder="${val.startsWith('data:') ? 'Uploaded image · paste URL or upload new' : 'assets/images/... or https://...'}">
          </label>
          <div class="content-image-control">
            <img data-img-prev="${e(name)}" src="${e(safeImage(val, f.value))}" alt="${e(f.label)} preview">
            <button type="button" class="text-link small" data-img-reset="${e(name)}">Restore default</button>
          </div>
          <label class="content-upload">Upload replacement image (JPG, PNG, WebP)
            <input type="file" data-img-upload="${e(name)}" accept="image/jpeg,image/png,image/webp">
          </label>`;
      } else if (f.kind === 'textarea') {
        inner = `<label class="field" for="${id}">${e(f.label)}
          <textarea id="${id}" name="${name}" maxlength="${f.max}" rows="${f.max > 1000 ? 10 : 3}">${e(val)}</textarea>
        </label>`;
      } else {
        inner = `<label class="field" for="${id}">${e(f.label)}
          <input id="${id}" name="${name}" maxlength="${f.max}" value="${e(val)}">
        </label>`;
      }
      return `<div class="content-field-item" data-search-text="${meta}">${inner}</div>`;
    };

    const policySubnav = onlyPolicies ? `<div class="policy-subnav" role="tablist">
      ${POLICY_TABS.map(([id, label]) => `<button type="button" class="policy-subtab ${activePolicySubtab === id ? 'is-active' : ''}" data-policy-subtab="${id}">${e(label)}</button>`).join('')}
    </div>` : '';

    container.innerHTML = `<div class="admin-head">
      <div>
        <p class="eyebrow">Make it yours</p>
        <h1>${onlyPolicies ? 'Pages & policies' : 'Storefront editor'}</h1>
        <p>Edit copy, images, and visibility with a live Desktop &amp; Mobile preview. Toggle "Edit on page" to click text directly inside the preview.</p>
      </div>
    </div>
    ${policySubnav}
    <div class="content-toolbar">
      <span class="content-save-state" data-save-state></span>
      <div class="content-toolbar-actions">
        <button type="button" class="btn btn-outline btn-sm" data-ed-discard>Discard changes</button>
        <button type="button" class="btn-lime btn-sm" data-ed-publish>Publish changes</button>
      </div>
    </div>
    <p class="content-message" data-ed-msg></p>
    <div class="content-workspace">
      <form class="content-form" id="ed-form">
        <div class="content-tip">Search or expand any section. Tip: when signed in, you can also click <strong>✎ Edit this page</strong> on the live site!</div>
        <input type="search" class="content-search-input" data-ed-search placeholder="Search headings, links, courses, policies…">
        ${Object.entries(sectionsToRender).map(([sec, group], i) => `<details class="content-group" ${i === 0 ? 'open' : ''} data-sec="${e(sec)}">
          <summary>${e(group.label)}<span>${Object.keys(group.fields).length}</span></summary>
          <div class="content-fields">
            ${Object.entries(group.fields)
              .filter(([k]) => !onlyPolicies || k.startsWith(activePolicySubtab))
              .map(([k, f]) => fieldHtml(sec, k, f, group.label)).join('')}
          </div>
        </details>`).join('')}
      </form>
      <div id="ed-preview-host"></div>
    </div>`;

    const form = container.querySelector('#ed-form');
    const stateEl = container.querySelector('[data-save-state]');
    const msgEl = container.querySelector('[data-ed-msg]');
    const discardBtn = container.querySelector('[data-ed-discard]');
    const publishBtn = container.querySelector('[data-ed-publish]');
    const searchInput = container.querySelector('[data-ed-search]');

    const updateToolbar = () => {
      const dirty = isDirty();
      stateEl.textContent = dirty ? '● Unpublished draft changes' : '✓ All changes published';
      stateEl.style.color = dirty ? '#b7850d' : '#176b3a';
      discardBtn.disabled = busy || !dirty;
      publishBtn.disabled = busy || !dirty;
    };

    const routeForSection = name => {
      if (name.startsWith('about.')) return 'about';
      if (name.startsWith('coursesPage.')) return 'courses';
      if (name.startsWith('eventsPage.')) return 'events';
      if (name.startsWith('oneOnOne.')) return '1-on-1';
      if (name.startsWith('contact.')) return 'contact';
      if (name.startsWith('policies.terms')) return 'terms';
      if (name.startsWith('policies.privacy')) return 'privacy';
      if (name.startsWith('policies.shipping')) return 'shipping';
      if (name.startsWith('policies.usage')) return 'usage-guidelines';
      if (name.startsWith('policies.rules')) return 'site-rules';
      return 'home';
    };

    previewCtrl = mountSitePreviewPanel(container.querySelector('#ed-preview-host'), {
      getData: () => draft,
      initialPage: onlyPolicies ? (activePolicySubtab === 'usage' ? 'usage-guidelines' : activePolicySubtab === 'rules' ? 'site-rules' : activePolicySubtab) : 'home',
      inlineTargets: page => contentInlineTargets(page).map(t => {
        if (t.type === 'goto' || t.type === 'pick') return t;
        const [sec, key] = String(t.key || '').split('.');
        return {
          ...t,
          id: t.key,
          max: CONTENT_SCHEMA[sec]?.fields?.[key]?.max,
          value: draft[sec]?.[key] ?? ''
        };
      }),
      onInlineStart: t => {
        const ctrl = form.elements.namedItem(t.key);
        if (ctrl) flashControl(ctrl, { focus: false });
      },
      onInlineInput: (t, text) => {
        const [sec, key] = String(t.key || '').split('.');
        if (draft[sec] && key) draft[sec][key] = text;
        const ctrl = form.elements.namedItem(t.key);
        if (ctrl) ctrl.value = text;
        updateToolbar();
      },
      onInlineCommit: (t, text) => {
        const [sec, key] = String(t.key || '').split('.');
        if (draft[sec] && key) draft[sec][key] = text;
        const ctrl = form.elements.namedItem(t.key);
        if (ctrl) ctrl.value = text;
        updateToolbar();
      },
      onInlinePick: t => {
        if (t.tab) {
          location.hash = `#admin/${t.tab}`;
          return;
        }
        const ctrl = form.elements.namedItem(t.key);
        if (ctrl) flashControl(ctrl, { focus: true });
      }
    });

    form.addEventListener('input', ev => {
      const target = ev.target;
      if (!target.name || !target.name.includes('.')) return;
      const [sec, key] = target.name.split('.');
      const f = CONTENT_SCHEMA[sec]?.fields?.[key];
      if (!f) return;
      draft[sec][key] = f.kind === 'checkbox' ? target.checked : target.value;
      if (f.kind === 'image') {
        const img = form.querySelector(`[data-img-prev="${target.name}"]`);
        if (img) img.src = safeImage(target.value, f.value);
      }
      msgEl.textContent = '';
      updateToolbar();
      previewCtrl?.scheduleRender();
    });

    form.addEventListener('focusin', ev => {
      const target = ev.target;
      if (!target?.name) return;
      const expectedPage = routeForSection(target.name);
      if (expectedPage) previewCtrl?.setPage(expectedPage);
      const inlineMatch = contentInlineTargets(expectedPage).find(t => t.key === target.name);
      if (inlineMatch) previewCtrl?.highlight(inlineMatch.selector, { scroll: true });
    });

    form.addEventListener('change', async ev => {
      const uploadInput = ev.target.closest?.('[data-img-upload]');
      if (!uploadInput) return;
      const file = uploadInput.files?.[0];
      if (!file) return;
      const name = uploadInput.getAttribute('data-img-upload');
      const [sec, key] = name.split('.');
      try {
        onToast?.('Uploading image…');
        const url = await uploadImageFile(file);
        draft[sec][key] = url;
        const textInput = form.elements.namedItem(name);
        if (textInput) textInput.value = url.startsWith('data:') ? '' : url;
        const prev = form.querySelector(`[data-img-prev="${name}"]`);
        if (prev) prev.src = safeImage(url);
        updateToolbar();
        previewCtrl?.scheduleRender();
        onToast?.('Image uploaded. Click Publish changes to make it live.');
      } catch (err) {
        onToast?.(err.message || 'Image upload failed.', true);
      }
    });

    form.addEventListener('click', ev => {
      const resetBtn = ev.target.closest?.('[data-img-reset]');
      if (!resetBtn) return;
      const name = resetBtn.getAttribute('data-img-reset');
      const [sec, key] = name.split('.');
      const def = CONTENT_SCHEMA[sec]?.fields?.[key]?.value || '';
      draft[sec][key] = def;
      const textInput = form.elements.namedItem(name);
      if (textInput) textInput.value = def;
      const prev = form.querySelector(`[data-img-prev="${name}"]`);
      if (prev) prev.src = def;
      updateToolbar();
      previewCtrl?.scheduleRender();
    });

    searchInput?.addEventListener('input', () => {
      const q = searchInput.value.trim().toLowerCase();
      form.querySelectorAll('.content-field-item').forEach(item => {
        item.hidden = Boolean(q) && !item.getAttribute('data-search-text').includes(q);
      });
      if (q) {
        form.querySelectorAll('.content-group').forEach(g => {
          const anyVisible = g.querySelector('.content-field-item:not([hidden])');
          g.open = Boolean(anyVisible);
        });
      }
    });

    discardBtn.addEventListener('click', () => {
      draft = normalizeContent(data);
      renderContentEditorTab(container, onlyPolicies);
    });

    publishBtn.addEventListener('click', async () => {
      msgEl.classList.remove('is-error');
      const err = validateContent(draft);
      if (err) {
        msgEl.textContent = err;
        msgEl.classList.add('is-error');
        return;
      }
      const ok = await publishDraft(draft);
      if (ok) {
        msgEl.textContent = '✓ Published! All pages updated.';
        updateToolbar();
      }
    });

    container.querySelectorAll('[data-policy-subtab]').forEach(btn => {
      btn.addEventListener('click', () => {
        activePolicySubtab = btn.getAttribute('data-policy-subtab');
        renderContentEditorTab(container, true);
      });
    });

    updateToolbar();
  }

  function renderPoliciesTab(container) {
    renderContentEditorTab(container, true);
  }

  function renderCoursesTab(container) {
    container.innerHTML = `<div class="admin-head">
      <div>
        <p class="eyebrow">Learn with Us</p>
        <h1>Courses &amp; pricing</h1>
        <p>Edit course tiers, pricing, descriptions, banners, and checklist features.</p>
      </div>
      <div class="admin-head-actions">
        <button type="button" class="btn btn-outline btn-sm" data-course-add>+ Add course tier</button>
        <button type="button" class="btn-lime btn-sm" data-course-save>Publish courses</button>
      </div>
    </div>
    <div class="admin-cards-grid" id="courses-editor-list"></div>`;

    const listEl = container.querySelector('#courses-editor-list');
    const draw = () => {
      listEl.innerHTML = draft.courses.map((c, idx) => `<article class="admin-item-card" data-c-idx="${idx}">
        <div class="admin-item-head">
          <strong>${e(c.name)} (${e(c.currency)}${e(c.price)})</strong>
          <div style="display:flex;gap:10px;align-items:center">
            <label class="visibility-toggle"><input type="checkbox" data-c-field="featured" ${c.featured ? 'checked' : ''}> Featured tier</label>
            ${draft.courses.length > 1 ? `<button type="button" class="text-link small" style="color:var(--rose-deep)" data-c-del="${idx}">Remove</button>` : ''}
          </div>
        </div>
        <div class="admin-two-col">
          <label class="field">Course Name<input data-c-field="name" value="${e(c.name)}"></label>
          <label class="field">Price (INR ₹)<input type="number" min="0" data-c-field="price" value="${e(c.price)}"></label>
          <label class="field">Subtitle<input data-c-field="subtitle" value="${e(c.subtitle)}"></label>
          <label class="field">Badge (optional)<input data-c-field="badge" value="${e(c.badge || '')}"></label>
          <label class="field">Validity text<input data-c-field="validity" value="${e(c.validity)}"></label>
          <label class="field">Button label<input data-c-field="ctaLabel" value="${e(c.ctaLabel)}"></label>
        </div>
        <label class="field">Included features (one per line)
          <textarea rows="6" data-c-field="features">${e((c.features || []).join('\n'))}</textarea>
        </label>
        <div class="content-image-control">
          <img src="${e(safeImage(c.heroImage))}" alt="">
          <label class="content-upload">Change banner image<input type="file" data-c-upload="${idx}" accept="image/jpeg,image/png,image/webp"></label>
        </div>
      </article>`).join('');
    };

    draw();

    listEl.addEventListener('input', ev => {
      const card = ev.target.closest?.('[data-c-idx]');
      if (!card) return;
      const idx = Number(card.getAttribute('data-c-idx'));
      const fieldName = ev.target.getAttribute('data-c-field');
      if (!fieldName) return;
      if (fieldName === 'featured') draft.courses[idx].featured = ev.target.checked;
      else if (fieldName === 'price') draft.courses[idx].price = Number(ev.target.value || 0);
      else if (fieldName === 'features') draft.courses[idx].features = ev.target.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      else draft.courses[idx][fieldName] = ev.target.value;
    });

    listEl.addEventListener('change', async ev => {
      const up = ev.target.closest?.('[data-c-upload]');
      if (!up) return;
      const file = up.files?.[0];
      if (!file) return;
      const idx = Number(up.getAttribute('data-c-upload'));
      const url = await uploadImageFile(file);
      draft.courses[idx].heroImage = url;
      draw();
    });

    listEl.addEventListener('click', ev => {
      const del = ev.target.closest?.('[data-c-del]');
      if (!del) return;
      draft.courses.splice(Number(del.getAttribute('data-c-del')), 1);
      draw();
    });

    container.querySelector('[data-course-add]').addEventListener('click', () => {
      draft.courses.push(normalizeCourse({
        id: `tier-${Date.now()}`,
        name: 'New Embroidery Tier',
        price: 2999,
        subtitle: 'Guided hand embroidery module',
        features: ['Pre-recorded modules', 'Starter stitch guide', 'WhatsApp support']
      }));
      draw();
    });

    container.querySelector('[data-course-save]').addEventListener('click', async () => {
      draft.courses = draft.courses.map(c => normalizeCourse(c));
      await publishDraft(draft, 'Courses published!');
    });
  }

  function renderEventsTab(container) {
    container.innerHTML = `<div class="admin-head">
      <div>
        <p class="eyebrow">Workshops &amp; meetups</p>
        <h1>Events &amp; workshops</h1>
        <p>Add upcoming workshops/meetups, update ticket status, or edit event details.</p>
      </div>
      <div class="admin-head-actions">
        <button type="button" class="btn btn-outline btn-sm" data-ev-add>+ Add workshop / meetup</button>
        <button type="button" class="btn-lime btn-sm" data-ev-save>Publish events</button>
      </div>
    </div>
    <div class="admin-cards-grid" id="events-editor-list"></div>`;

    const listEl = container.querySelector('#events-editor-list');
    const draw = () => {
      listEl.innerHTML = draft.events.map((ev, idx) => `<article class="admin-item-card" data-ev-idx="${idx}">
        <div class="admin-item-head">
          <strong>${e(ev.title)}</strong>
          <button type="button" class="text-link small" style="color:var(--rose-deep)" data-ev-del="${idx}">Delete event</button>
        </div>
        <div class="admin-two-col">
          <label class="field">Title<input data-ev-field="title" value="${e(ev.title)}"></label>
          <label class="field">URL Slug<input data-ev-field="slug" value="${e(ev.slug)}"></label>
          <label class="field">Short Date<input data-ev-field="shortDate" value="${e(ev.shortDate)}"></label>
          <label class="field">Full Date &amp; Time<input data-ev-field="fullDateTime" value="${e(ev.fullDateTime)}"></label>
          <label class="field">Short Venue<input data-ev-field="venueShort" value="${e(ev.venueShort)}"></label>
          <label class="field">Full Address<input data-ev-field="venueFull" value="${e(ev.venueFull)}"></label>
          <label class="field">Registration Status
            <select data-ev-field="status">
              <option value="open" ${ev.status === 'open' ? 'selected' : ''}>Open (Accepting RSVPs)</option>
              <option value="closed" ${ev.status === 'closed' ? 'selected' : ''}>Closed / Past</option>
            </select>
          </label>
          <label class="field">Card Button Label<input data-ev-field="buttonLabel" value="${e(ev.buttonLabel)}"></label>
        </div>
        <label class="field">Badges (comma separated, e.g. 12 spots left, Women Only)<input data-ev-field="badges" value="${e((ev.badges || []).join(', '))}"></label>
        <label class="field">Short Summary<textarea rows="2" data-ev-field="summary">${e(ev.summary)}</textarea></label>
        <label class="field">Full Event Details<textarea rows="6" data-ev-field="details">${e(ev.details)}</textarea></label>
        <div class="content-image-control">
          <img src="${e(safeImage(ev.image))}" alt="">
          <label class="content-upload">Upload poster image<input type="file" data-ev-upload="${idx}" accept="image/jpeg,image/png,image/webp"></label>
        </div>
      </article>`).join('');
    };

    draw();

    listEl.addEventListener('input', ev => {
      const card = ev.target.closest?.('[data-ev-idx]');
      if (!card) return;
      const idx = Number(card.getAttribute('data-ev-idx'));
      const f = ev.target.getAttribute('data-ev-field');
      if (!f) return;
      if (f === 'badges') draft.events[idx].badges = ev.target.value.split(',').map(s => s.trim()).filter(Boolean);
      else draft.events[idx][f] = ev.target.value;
    });

    listEl.addEventListener('change', async ev => {
      const up = ev.target.closest?.('[data-ev-upload]');
      if (!up) return;
      const file = up.files?.[0];
      if (!file) return;
      const idx = Number(up.getAttribute('data-ev-upload'));
      draft.events[idx].image = await uploadImageFile(file);
      draw();
    });

    listEl.addEventListener('click', ev => {
      const del = ev.target.closest?.('[data-ev-del]');
      if (!del) return;
      draft.events.splice(Number(del.getAttribute('data-ev-del')), 1);
      draw();
    });

    container.querySelector('[data-ev-add]').addEventListener('click', () => {
      draft.events.unshift(normalizeEvent({
        slug: `meetup-${Date.now()}`,
        title: 'New Community Stitch Meetup',
        shortDate: 'Sun, Upcoming',
        fullDateTime: 'Upcoming · 10:00 am – 12:30 pm IST',
        venueShort: 'City Park',
        venueFull: 'Location to be announced',
        badges: ['Open'],
        status: 'open',
        buttonLabel: 'RSVP Now',
        image: 'assets/images/event-bengaluru-meetup.png',
        summary: 'Come sit with us for a cozy morning of stitching and making together.',
        details: 'Bring your current WIP or join with beginner supplies provided.'
      }));
      draw();
    });

    container.querySelector('[data-ev-save]').addEventListener('click', async () => {
      draft.events = draft.events.map(ev => normalizeEvent(ev));
      await publishDraft(draft, 'Events published!');
    });
  }

  function renderTestimonialsTab(container) {
    container.innerHTML = `<div class="admin-head">
      <div>
        <p class="eyebrow">Community voices</p>
        <h1>Testimonials</h1>
        <p>Manage Home meet-up quotes and OG learner reviews shown on Courses, Events &amp; 1:1.</p>
      </div>
      <button type="button" class="btn-lime btn-sm" data-t-save>Publish testimonials</button>
    </div>
    <div class="admin-cards-grid" id="testimonials-editor-body"></div>`;

    const bodyEl = container.querySelector('#testimonials-editor-body');
    const drawGroup = (key, label) => `<section class="admin-item-card">
      <div class="admin-item-head">
        <strong>${e(label)} (${draft.testimonials[key].length})</strong>
        <button type="button" class="btn btn-outline btn-sm" data-t-add="${key}">+ Add quote</button>
      </div>
      ${draft.testimonials[key].map((t, idx) => `<div class="field" style="display:grid;gap:8px;padding:12px;background:#fff;border:1px solid var(--line);border-radius:12px" data-t-group="${key}" data-t-idx="${idx}">
        <textarea rows="2" data-t-field="quote">${e(t.quote)}</textarea>
        <div style="display:flex;gap:10px;align-items:center">
          <input style="flex:1;padding:8px 10px;border:1px solid var(--line);border-radius:8px" data-t-field="author" value="${e(t.author)}" placeholder="Author / handle">
          <button type="button" class="text-link small" style="color:var(--rose-deep)" data-t-del="${key}:${idx}">Remove</button>
        </div>
      </div>`).join('')}
    </section>`;

    const draw = () => {
      bodyEl.innerHTML = drawGroup('meetups', 'Home Meet-up Testimonials') + drawGroup('learners', 'OG Learner & Workshop Testimonials');
    };
    draw();

    bodyEl.addEventListener('input', ev => {
      const row = ev.target.closest?.('[data-t-group]');
      if (!row) return;
      const g = row.getAttribute('data-t-group');
      const idx = Number(row.getAttribute('data-t-idx'));
      const f = ev.target.getAttribute('data-t-field');
      draft.testimonials[g][idx][f] = ev.target.value;
    });

    bodyEl.addEventListener('click', ev => {
      const add = ev.target.closest?.('[data-t-add]');
      if (add) {
        draft.testimonials[add.getAttribute('data-t-add')].unshift({ quote: '“Loved stitching together!”', author: 'Community Member' });
        draw();
        return;
      }
      const del = ev.target.closest?.('[data-t-del]');
      if (del) {
        const [g, idx] = del.getAttribute('data-t-del').split(':');
        draft.testimonials[g].splice(Number(idx), 1);
        draw();
      }
    });

    container.querySelector('[data-t-save]').addEventListener('click', async () => {
      await publishDraft(draft, 'Testimonials published!');
    });
  }

  function renderGalleriesTab(container) {
    const labels = {
      homeCommunity: 'Home Community Slideshow',
      workshops: 'Workshops & Events Masonry Gallery',
      sessions: '1:1 Session Gallery'
    };

    const draw = () => {
      const items = draft.galleries[activeGalleryKey] || [];
      container.innerHTML = `<div class="admin-head">
        <div>
          <p class="eyebrow">Imported &amp; custom photos</p>
          <h1>Photo galleries</h1>
          <p>Reorder, caption, upload new photos, or remove photos from each gallery.</p>
        </div>
        <button type="button" class="btn-lime btn-sm" data-g-save>Publish galleries</button>
      </div>
      <div class="policy-subnav">
        ${Object.entries(labels).map(([k, lbl]) => `<button type="button" class="policy-subtab ${activeGalleryKey === k ? 'is-active' : ''}" data-g-tab="${k}">${e(lbl)} (${draft.galleries[k].length})</button>`).join('')}
      </div>
      <div style="margin-bottom:18px">
        <label class="btn btn-outline btn-sm">+ Upload photos to ${e(labels[activeGalleryKey])}
          <input type="file" multiple accept="image/jpeg,image/png,image/webp" data-g-upload hidden>
        </label>
      </div>
      <div class="admin-gallery-grid">
        ${items.map((item, idx) => `<div class="admin-gallery-card" data-g-idx="${idx}">
          <img src="${e(safeImage(item.src))}" alt="">
          <div class="admin-gallery-meta">
            <input type="text" data-g-caption="${idx}" value="${e(item.caption || '')}" placeholder="Caption" style="padding:6px 8px;border:1px solid var(--line);border-radius:8px;font-size:12px">
            <div class="admin-gallery-actions">
              <button type="button" class="btn btn-outline btn-sm" data-g-move="${idx}:-1" ${idx === 0 ? 'disabled' : ''}>←</button>
              <button type="button" class="btn btn-outline btn-sm" data-g-move="${idx}:1" ${idx === items.length - 1 ? 'disabled' : ''}>→</button>
              <button type="button" class="text-link small" style="color:var(--rose-deep)" data-g-del="${idx}">Remove</button>
            </div>
          </div>
        </div>`).join('')}
      </div>`;

      container.querySelectorAll('[data-g-tab]').forEach(b => b.addEventListener('click', () => {
        activeGalleryKey = b.getAttribute('data-g-tab');
        draw();
      }));

      container.querySelector('[data-g-upload]')?.addEventListener('change', async ev => {
        const files = [...(ev.target.files || [])];
        for (const file of files) {
          const url = await uploadImageFile(file);
          draft.galleries[activeGalleryKey].push({ src: url, caption: file.name.replace(/\.[^.]+$/, '') });
        }
        draw();
      });

      container.querySelectorAll('[data-g-caption]').forEach(inp => inp.addEventListener('input', () => {
        draft.galleries[activeGalleryKey][Number(inp.getAttribute('data-g-caption'))].caption = inp.value;
      }));

      container.querySelectorAll('[data-g-move]').forEach(btn => btn.addEventListener('click', () => {
        const [idxStr, dirStr] = btn.getAttribute('data-g-move').split(':');
        const idx = Number(idxStr);
        const next = idx + Number(dirStr);
        const arr = draft.galleries[activeGalleryKey];
        if (next < 0 || next >= arr.length) return;
        [arr[idx], arr[next]] = [arr[next], arr[idx]];
        draw();
      }));

      container.querySelectorAll('[data-g-del]').forEach(btn => btn.addEventListener('click', () => {
        draft.galleries[activeGalleryKey].splice(Number(btn.getAttribute('data-g-del')), 1);
        draw();
      }));

      container.querySelector('[data-g-save]')?.addEventListener('click', async () => {
        await publishDraft(draft, 'Galleries published!');
      });
    };

    draw();
  }

  async function renderOrdersTab(container) {
    container.innerHTML = `<div class="admin-head">
      <div>
        <p class="eyebrow">Checkout &amp; Fulfillment Tracking</p>
        <h1>Orders &amp; tracking</h1>
        <p>Track payments, courier &amp; AWB shipment numbers, fulfillment status, and follow up on WhatsApp.</p>
      </div>
      <div class="admin-head-actions">
        <button type="button" class="btn btn-outline btn-sm" data-ord-csv>Export Orders CSV</button>
      </div>
    </div>
    <div id="orders-body"><p class="muted">Loading orders…</p></div>`;

    const bodyEl = container.querySelector('#orders-body');
    let orders = await loadOrders();

    const draw = () => {
      const paidList = orders.filter(o => o.paymentStatus === 'paid');
      const paidRev = paidList.reduce((s, o) => s + Number(o.amount || 0), 0);
      const pendingList = orders.filter(o => o.paymentStatus === 'pending' || o.paymentStatus === 'manual_pending');
      const needsAction = orders.filter(o => !['shipped', 'delivered', 'completed', 'cancelled'].includes(o.fulfillmentStatus || 'new'));

      const matchesFilter = o => {
        if (activeOrderFilter === 'paid') return o.paymentStatus === 'paid';
        if (activeOrderFilter === 'pending') return o.paymentStatus === 'pending' || o.paymentStatus === 'manual_pending';
        if (activeOrderFilter === 'failed') return o.paymentStatus === 'failed';
        if (activeOrderFilter === 'action') return !['shipped', 'delivered', 'completed', 'cancelled'].includes(o.fulfillmentStatus || 'new');
        if (activeOrderFilter === 'done') return ['shipped', 'delivered', 'completed'].includes(o.fulfillmentStatus || 'new');
        return true;
      };

      const q = orderQuery.trim().toLowerCase();
      const filtered = orders.filter(o => {
        if (!matchesFilter(o)) return false;
        if (!q) return true;
        const hay = `${o.orderId} ${o.customer?.name} ${o.customer?.email} ${o.customer?.phone} ${o.customer?.city} ${o.customer?.pinCode} ${o.trackingNumber} ${o.trackingCarrier} ${(o.items || []).map(i => i.name).join(' ')}`.toLowerCase();
        return hay.includes(q);
      });

      const filters = [
        ['all', `All (${orders.length})`],
        ['paid', `Paid (${paidList.length})`],
        ['pending', `Pending / Manual (${pendingList.length})`],
        ['action', `Needs Action (${needsAction.length})`],
        ['done', `Shipped / Done (${orders.length - needsAction.length})`]
      ];

      bodyEl.innerHTML = `<div class="kpi-grid">
        <div class="kpi-card is-accent">
          <span class="kpi-label">Paid Revenue</span>
          <span class="kpi-value">${e(formatINR(paidRev))}</span>
          <span class="kpi-sub">${paidList.length} paid orders</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Total Orders</span>
          <span class="kpi-value">${orders.length}</span>
          <span class="kpi-sub">${pendingList.length} awaiting payment confirm</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Needs Fulfillment</span>
          <span class="kpi-value">${needsAction.length}</span>
          <span class="kpi-sub">New, contacted, or packed</span>
        </div>
      </div>

      <div class="admin-search-row">
        <input type="search" data-ord-search value="${e(orderQuery)}" placeholder="Search order ID, customer, email, phone, AWB tracking #…">
      </div>

      <div class="policy-subnav">
        ${filters.map(([k, lbl]) => `<button type="button" class="policy-subtab ${activeOrderFilter === k ? 'is-active' : ''}" data-ord-filter="${k}">${e(lbl)}</button>`).join('')}
      </div>

      ${filtered.length ? `<div class="submissions-list">
        ${filtered.map(o => {
          const cleanPhone = String(o.customer?.phone || '').replace(/[^0-9]/g, '');
          const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
          const trackBit = o.trackingNumber ? ` Tracking: ${o.trackingNumber}${o.trackingCarrier ? ` (${o.trackingCarrier})` : ''}.` : '';
          const waUrl = waPhone
            ? `https://wa.me/${waPhone}?text=${encodeURIComponent(`Hi ${o.customer?.name || ''}, update for your You Can Stitch With Us order ${o.orderId}: status is ${o.fulfillmentStatus || 'new'}.${trackBit}`)}`
            : '';
          return `<article class="submission-card" data-ord-card="${e(o.orderId)}">
            <div class="submission-top">
              <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
                <strong>${e(o.orderId)}</strong>
                <span class="status-pill is-${e(o.paymentStatus || 'pending')}">${e(o.paymentGateway || o.paymentMethod || 'Paytm')} · ${e(o.paymentStatus || 'pending')}</span>
                <span class="status-pill is-${e(o.fulfillmentStatus || 'new')}">${e(o.fulfillmentStatus || 'new')}</span>
                <span class="small muted tabular">${e(shortTime(o.createdAt))}</span>
              </div>
              <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
                ${o.paymentStatus !== 'paid' ? `<button type="button" class="btn-lime btn-sm" data-ord-mark-paid="${e(o.orderId)}">Mark Paid</button>` : ''}
                ${waUrl ? `<a class="btn btn-outline btn-sm" href="${e(waUrl)}" target="_blank" rel="noopener noreferrer">WhatsApp ↗</a>` : ''}
                <select data-order-fulfill="${e(o.orderId)}" aria-label="Fulfillment status" style="padding:6px 10px;border:1.5px solid var(--line);border-radius:8px;font-size:12.5px;background:var(--surface)">
                  ${FULFILLMENT_STATES.map(st => `<option value="${st}" ${(o.fulfillmentStatus || 'new') === st ? 'selected' : ''}>${st}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="small" style="display:grid;gap:4px">
              <div><strong>Customer:</strong> ${e(o.customer?.name)} · ${e(o.customer?.email)} · ${e(o.customer?.phone)}</div>
              <div><strong>Items:</strong> ${e((o.items || []).map(i => `${i.name}${Number(i.qty || 1) > 1 ? ` × ${i.qty}` : ''} (${formatINR(i.price ?? i.unitPrice ?? 0)})`).join(', '))} · <strong>Total: ${e(formatINR(o.amount || 0))}</strong>${o.couponCode ? ` · Promo ${e(o.couponCode)}` : ''}</div>
              ${o.paytmTxnId ? `<div><strong>Txn ID:</strong> ${e(o.paytmTxnId)}</div>` : ''}
              ${o.customer?.address ? `<div><strong>Shipping:</strong> ${e(o.customer.address)}</div>` : ''}
              ${o.customer?.preferredSlot ? `<div><strong>Preferred slot:</strong> ${e(o.customer.preferredSlot)}</div>` : ''}
            </div>
            <form class="order-track-form" data-order-track-form="${e(o.orderId)}">
              <label>Courier / Carrier<input name="trackingCarrier" maxlength="80" value="${e(o.trackingCarrier || '')}" placeholder="e.g. Delhivery / India Post"></label>
              <label>Tracking / AWB #<input name="trackingNumber" maxlength="100" value="${e(o.trackingNumber || '')}" placeholder="AWB tracking code"></label>
              <label>Internal Note<input name="adminNotes" maxlength="1000" value="${e(o.adminNotes || '')}" placeholder="Dispatch or workshop notes"></label>
              <button type="submit" class="btn btn-dark btn-sm">Save Tracking</button>
            </form>
          </article>`;
        }).join('')}
      </div>` : `<p class="muted">No orders match this filter yet.</p>`}`;

      bodyEl.querySelector('[data-ord-search]')?.addEventListener('input', ev => {
        orderQuery = ev.target.value;
        const pos = ev.target.selectionStart;
        draw();
        const nextInp = bodyEl.querySelector('[data-ord-search]');
        if (nextInp) {
          nextInp.focus();
          try { nextInp.setSelectionRange(pos, pos); } catch { /* ignore */ }
        }
      });

      bodyEl.querySelectorAll('[data-ord-filter]').forEach(btn => btn.addEventListener('click', () => {
        activeOrderFilter = btn.getAttribute('data-ord-filter');
        draw();
      }));

      bodyEl.querySelectorAll('[data-order-fulfill]').forEach(sel => sel.addEventListener('change', async () => {
        const id = sel.getAttribute('data-order-fulfill');
        const res = await updateOrder(id, { fulfillmentStatus: sel.value });
        if (res.ok) {
          const item = orders.find(x => x.orderId === id);
          if (item) Object.assign(item, res.order || { fulfillmentStatus: sel.value });
          draw();
          onToast?.('Fulfillment status saved');
        } else {
          onToast?.(res.error || 'Update failed', true);
        }
      }));

      bodyEl.querySelectorAll('[data-ord-mark-paid]').forEach(btn => btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-ord-mark-paid');
        const res = await updateOrder(id, { paymentStatus: 'paid' });
        if (res.ok) {
          const item = orders.find(x => x.orderId === id);
          if (item) Object.assign(item, res.order || { paymentStatus: 'paid' });
          draw();
          onToast?.(`Order ${id} marked paid`);
        } else {
          onToast?.(res.error || 'Could not update payment status', true);
        }
      }));

      bodyEl.querySelectorAll('[data-order-track-form]').forEach(form => form.addEventListener('submit', async ev => {
        ev.preventDefault();
        const id = form.getAttribute('data-order-track-form');
        const fd = new FormData(form);
        const patch = {
          trackingCarrier: String(fd.get('trackingCarrier') || '').trim(),
          trackingNumber: String(fd.get('trackingNumber') || '').trim(),
          adminNotes: String(fd.get('adminNotes') || '').trim()
        };
        const res = await updateOrder(id, patch);
        if (res.ok) {
          const item = orders.find(x => x.orderId === id);
          if (item) Object.assign(item, res.order || patch);
          draw();
          onToast?.('Tracking info saved');
        } else {
          onToast?.(res.error || 'Could not save tracking', true);
        }
      }));
    };

    draw();

    container.querySelector('[data-ord-csv]')?.addEventListener('click', () => {
      const headers = ['Order ID', 'Created', 'Customer', 'Email', 'Phone', 'Amount', 'Payment', 'Fulfillment', 'Carrier', 'Tracking #', 'Notes'];
      const rows = orders.map(o => [
        csvSafe(o.orderId),
        csvSafe(o.createdAt),
        csvSafe(o.customer?.name),
        csvSafe(o.customer?.email),
        csvSafe(o.customer?.phone),
        csvSafe(o.amount),
        csvSafe(o.paymentStatus),
        csvSafe(o.fulfillmentStatus || 'new'),
        csvSafe(o.trackingCarrier || ''),
        csvSafe(o.trackingNumber || ''),
        csvSafe(o.adminNotes || '')
      ].join(','));
      const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `ycswu-orders-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
    });
  }

  async function renderInquiriesTab(container) {
    container.innerHTML = `<div class="admin-head">
      <div>
        <p class="eyebrow">Customer activity</p>
        <h1>Inquiries &amp; bookings</h1>
        <p>Paytm course payments, 1:1 bookings, manual payment requests, contact messages, and mailing list signups.</p>
      </div>
      <button type="button" class="btn btn-outline btn-sm" data-sub-csv>Export CSV</button>
    </div>
    <div id="inquiries-body"><p class="muted">Loading submissions…</p></div>`;

    submissions = await loadSubmissions();
    const bodyEl = container.querySelector('#inquiries-body');

    const draw = () => {
      const q = inquiryQuery.trim().toLowerCase();
      const filtered = submissions.filter(s => {
        if (activeInquiryFilter !== 'all' && s.type !== activeInquiryFilter) return false;
        if (!q) return true;
        return `${s.type} ${s.status} ${JSON.stringify(s.payload || {})}`.toLowerCase().includes(q);
      });
      const types = [
        ['all', 'All'],
        ['enrollment', 'Course enrollments'],
        ['booking', '1:1 Bookings'],
        ['contact', 'Contact'],
        ['rsvp', 'Event RSVPs'],
        ['newsletter', 'Mailing list']
      ];
      bodyEl.innerHTML = `<div class="admin-search-row">
        <input type="search" data-sub-search value="${e(inquiryQuery)}" placeholder="Search by name, email, order ID, or message…">
      </div>
      <div class="policy-subnav">
        ${types.map(([k, lbl]) => {
          const cnt = k === 'all' ? submissions.length : submissions.filter(s => s.type === k).length;
          return `<button type="button" class="policy-subtab ${activeInquiryFilter === k ? 'is-active' : ''}" data-sub-filter="${k}">${e(lbl)} (${cnt})</button>`;
        }).join('')}
      </div>
      ${filtered.length ? `<div class="submissions-list">
        ${filtered.map(s => {
          const p = s.payload || {};
          const payBadge = p.paymentGateway === 'Paytm'
            ? `<span class="status-pill is-${e(p.paymentStatus || 'pending')}">Paytm · ${e(p.paymentStatus || 'pending')}</span>`
            : '';
          return `<article class="submission-card" data-sub-id="${e(s.id)}">
            <div class="submission-top">
              <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
                <strong>${e(s.type.toUpperCase())}</strong>
                ${payBadge}
                <span class="small muted">${e(shortTime(s.createdAt))}</span>
              </div>
              <div style="display:flex;gap:8px;align-items:center">
                <span class="status-pill is-${e(s.status || 'new')}">${e(s.status || 'new')}</span>
                <select data-sub-status="${e(s.id)}" aria-label="Update status" style="padding:5px 9px;border:1.5px solid var(--line);border-radius:8px;font-size:12px;background:var(--surface)">
                  <option value="new" ${s.status === 'new' ? 'selected' : ''}>New</option>
                  <option value="contacted" ${s.status === 'contacted' ? 'selected' : ''}>Contacted</option>
                  <option value="resolved" ${s.status === 'resolved' ? 'selected' : ''}>Resolved</option>
                </select>
                <button type="button" class="text-link small" style="color:var(--rose-deep)" data-sub-del="${e(s.id)}">Delete</button>
              </div>
            </div>
            <div class="small" style="display:grid;gap:4px">
              ${Object.entries(p).map(([k, v]) => `<div><strong>${e(k)}:</strong> ${e(typeof v === 'object' ? JSON.stringify(v) : v)}</div>`).join('')}
            </div>
          </article>`;
        }).join('')}
      </div>` : `<p class="muted">No submissions match this filter yet.</p>`}`;

      bodyEl.querySelector('[data-sub-search]')?.addEventListener('input', ev => {
        inquiryQuery = ev.target.value;
        const pos = ev.target.selectionStart;
        draw();
        const nextInp = bodyEl.querySelector('[data-sub-search]');
        if (nextInp) {
          nextInp.focus();
          try { nextInp.setSelectionRange(pos, pos); } catch { /* ignore */ }
        }
      });

      bodyEl.querySelectorAll('[data-sub-filter]').forEach(btn => btn.addEventListener('click', () => {
        activeInquiryFilter = btn.getAttribute('data-sub-filter');
        draw();
      }));

      bodyEl.querySelectorAll('[data-sub-status]').forEach(sel => sel.addEventListener('change', async () => {
        const id = sel.getAttribute('data-sub-status');
        await updateSubmissionStatus(id, sel.value);
        const item = submissions.find(x => x.id === id);
        if (item) item.status = sel.value;
        draw();
        onToast?.('Status updated');
      }));

      bodyEl.querySelectorAll('[data-sub-del]').forEach(btn => btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-sub-del');
        await deleteSubmission(id);
        submissions = submissions.filter(x => x.id !== id);
        draw();
        onToast?.('Deleted entry');
      }));
    };

    draw();

    container.querySelector('[data-sub-csv]')?.addEventListener('click', () => {
      const headers = ['ID', 'Type', 'Status', 'Created At', 'Details'];
      const rows = submissions.map(s => [
        csvSafe(s.id),
        csvSafe(s.type),
        csvSafe(s.status),
        csvSafe(s.createdAt),
        csvSafe(JSON.stringify(s.payload || {}))
      ].join(','));
      const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `ycswu-submissions-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
    });
  }

  function renderBackupTab(container) {
    container.innerHTML = `<div class="admin-head">
      <div>
        <p class="eyebrow">Safety &amp; portability</p>
        <h1>Backup &amp; reset</h1>
        <p>Export all website copy, courses, events, galleries, and policies as JSON, clear tracking logs, or restore default content.</p>
      </div>
    </div>
    <div class="admin-cards-grid">
      <div class="admin-item-card">
        <strong>Export site JSON</strong>
        <p class="small muted" style="margin:0">Download a complete snapshot of your current published content.</p>
        <div><button type="button" class="btn btn-dark btn-sm" data-b-export>Download site-backup.json</button></div>
      </div>
      <div class="admin-item-card">
        <strong>Import site JSON</strong>
        <p class="small muted" style="margin:0">Restore from a previously exported backup file.</p>
        <label class="btn btn-outline btn-sm" style="justify-self:start">Choose JSON file<input type="file" accept="application/json" data-b-import hidden></label>
      </div>
      <div class="admin-item-card">
        <strong>Clear analytics tracking log</strong>
        <p class="small muted" style="margin:0">Reset recorded page views, bag clicks, checkout starts, and visitor sessions to zero (orders and inquiries remain intact).</p>
        <div><button type="button" class="btn btn-outline btn-sm" style="border-color:var(--rose-deep);color:var(--rose-deep)" data-b-clear-analytics>Clear analytics log</button></div>
      </div>
      <div class="admin-item-card">
        <strong>Restore factory defaults</strong>
        <p class="small muted" style="margin:0">Reset all text, courses, events, galleries, and policies back to the original imported youcanstitchwithus.com content.</p>
        <div><button type="button" class="btn btn-outline btn-sm" style="border-color:var(--rose-deep);color:var(--rose-deep)" data-b-reset>Restore default content</button></div>
      </div>
    </div>`;

    container.querySelector('[data-b-export]').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `ycswu-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
    });

    container.querySelector('[data-b-import]').addEventListener('change', async ev => {
      const file = ev.target.files?.[0];
      if (!file) return;
      try {
        const parsed = JSON.parse(await file.text());
        const normalized = normalizeContent(parsed);
        await publishDraft(normalized, 'Backup imported and published!');
        renderShell();
      } catch {
        onToast?.('Invalid backup JSON file.', true);
      }
    });

    container.querySelector('[data-b-clear-analytics]').addEventListener('click', async () => {
      await clearAnalyticsData();
      onToast?.('Analytics tracking log cleared.');
    });

    container.querySelector('[data-b-reset]').addEventListener('click', async () => {
      const res = await resetSiteContent();
      data = normalizeContent(res.data || DEFAULT_CONTENT);
      draft = normalizeContent(data);
      await onSaveData?.(data);
      onToast?.('Restored original imported content.');
      renderShell();
    });
  }

  renderShell();
  Promise.all([loadSubmissions(), loadOrders()]).then(([subList, ordList]) => {
    const newInq = (subList || []).filter(x => x.status === 'new').length;
    const pendingOrd = (ordList || []).filter(o => !['shipped', 'delivered', 'completed', 'cancelled'].includes(o.fulfillmentStatus || 'new')).length;
    const inqHost = root.querySelector('a[href="#admin/inquiries"]');
    if (inqHost && newInq && !inqHost.querySelector('.admin-badge')) {
      inqHost.insertAdjacentHTML('beforeend', `<span class="admin-badge">${newInq}</span>`);
    }
    const ordHost = root.querySelector('a[href="#admin/orders"]');
    if (ordHost && pendingOrd && !ordHost.querySelector('.admin-badge')) {
      ordHost.insertAdjacentHTML('beforeend', `<span class="admin-badge">${pendingOrd}</span>`);
    }
  });
}
