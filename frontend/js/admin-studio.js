import {
  CONTENT_SCHEMA,
  DEFAULT_CONTENT,
  escapeHTML as e,
  normalizeContent,
  normalizeCourse,
  normalizeEvent,
  safeImage,
  validateContent
} from './site-content.js';
import { contentInlineTargets } from './live-site-editor.js';
import { flashControl } from './inline-edit.js';
import { mountSitePreviewPanel } from './site-preview.js';
import {
  deleteSubmission,
  loadSubmissions,
  loginAdmin,
  logoutAdmin,
  resetSiteContent,
  updateSubmissionStatus,
  uploadImageFile
} from './storage.js';

const ADMIN_GROUPS = [
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
      ['orders', 'Orders & payments'],
      ['inquiries', 'Inquiries & bookings'],
      ['backup', 'Backup & reset']
    ]
  }
];

const POLICY_TABS = [
  ['terms', 'Terms of Service', 'home'],
  ['privacy', 'Privacy Policy', 'privacy'],
  ['shipping', 'Shipping & Refunds', 'shipping'],
  ['usage', 'Usage & Guidelines', 'usage-guidelines'],
  ['rules', 'Site Rules', 'site-rules']
];

const csvSafe = val => {
  const s = String(val ?? '').replace(/\r?\n/g, ' ');
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

export function renderAdminStudio(root, {
  authenticated,
  demoPasscodeHint,
  data,
  routeTab = 'content',
  onAuthChange,
  onSaveData,
  onToast,
  onOpenPreviewModal
}) {
  const validTabs = new Set(ADMIN_GROUPS.flatMap(g => g.items.map(([id]) => id)));
  const activeTab = validTabs.has(routeTab) ? routeTab : 'content';

  if (!authenticated) {
    root.innerHTML = `<section class="admin-login-wrap">
      <div class="admin-login-card">
        <p class="eyebrow">You Can Stitch With Us · Studio</p>
        <h1>Admin Sign In</h1>
        <p class="small muted">Sign in to edit page copy, upload images, manage courses &amp; workshops, update policies, and review bookings.</p>
        <form class="form-stack" id="admin-login-form">
          <label class="field">Admin Passcode
            <input type="password" name="password" required autocomplete="current-password" placeholder="Enter passcode">
          </label>
          <p class="small muted" id="admin-login-error" style="color:var(--coral-deep);margin:0" hidden></p>
          <button type="submit" class="btn btn-olive">Sign in to Admin Studio</button>
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
      <button type="button" class="btn btn-outline btn-sm" data-admin-action="logout" style="color:var(--coral-deep)">Sign out</button>
    </div>`;
  }

  function sidebarHtml(newCount = 0) {
    return `<aside class="admin-sidebar">
      <div>
        <p class="eyebrow" style="margin:0 0 4px 10px">Stitch Studio</p>
        <p class="small muted" style="margin:0 0 0 10px">Editable Admin</p>
      </div>
      <nav class="admin-nav" aria-label="Admin navigation">
        ${ADMIN_GROUPS.map(group => `<div>
          <p class="admin-nav-group-label">${e(group.label)}</p>
          <div class="admin-nav-items">
            ${group.items.map(([id, label]) => `<a href="#admin/${id}" class="admin-tab ${activeTab === id ? 'is-active' : ''}">
              <span>${e(label)}</span>
              ${id === 'inquiries' && newCount ? `<span class="admin-badge">${newCount}</span>` : ''}
            </a>`).join('')}
          </div>
        </div>`).join('')}
      </nav>
      <div class="admin-sidebar-foot">
        <button type="button" class="admin-tab" data-admin-action="open-preview"><span>Site preview</span><span aria-hidden="true">👁</span></button>
        <a class="admin-tab" href="#home">View live site ↗</a>
        <button type="button" class="admin-tab" data-admin-action="logout" style="color:var(--coral-deep)">Sign out</button>
      </div>
    </aside>`;
  }

  function renderShell(newCount = 0) {
    previewCtrl?.dispose();
    previewCtrl = null;
    root.innerHTML = `<div class="admin-layout">
      ${mobileBarHtml()}
      ${sidebarHtml(newCount)}
      <section class="admin-main" id="admin-tab-body"></section>
    </div>`;

    const body = root.querySelector('#admin-tab-body');
    if (activeTab === 'content') renderContentEditorTab(body);
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
        <button type="button" class="btn btn-sage btn-sm" data-ed-publish>Publish changes</button>
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
      <div style="display:flex;gap:10px">
        <button type="button" class="btn btn-outline btn-sm" data-course-add>+ Add course tier</button>
        <button type="button" class="btn btn-sage btn-sm" data-course-save>Publish courses</button>
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
            ${draft.courses.length > 1 ? `<button type="button" class="text-link small" style="color:var(--coral-deep)" data-c-del="${idx}">Remove</button>` : ''}
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
      <div style="display:flex;gap:10px">
        <button type="button" class="btn btn-outline btn-sm" data-ev-add>+ Add workshop / meetup</button>
        <button type="button" class="btn btn-sage btn-sm" data-ev-save>Publish events</button>
      </div>
    </div>
    <div class="admin-cards-grid" id="events-editor-list"></div>`;

    const listEl = container.querySelector('#events-editor-list');
    const draw = () => {
      listEl.innerHTML = draft.events.map((ev, idx) => `<article class="admin-item-card" data-ev-idx="${idx}">
        <div class="admin-item-head">
          <strong>${e(ev.title)}</strong>
          <button type="button" class="text-link small" style="color:var(--coral-deep)" data-ev-del="${idx}">Delete event</button>
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
      <button type="button" class="btn btn-sage btn-sm" data-t-save>Publish testimonials</button>
    </div>
    <div class="admin-cards-grid" id="testimonials-editor-body"></div>`;

    const bodyEl = container.querySelector('#testimonials-editor-body');
    const drawGroup = (key, label) => `<section class="admin-item-card">
      <div class="admin-item-head">
        <strong>${e(label)} (${draft.testimonials[key].length})</strong>
        <button type="button" class="btn btn-outline btn-sm" data-t-add="${key}">+ Add quote</button>
      </div>
      ${draft.testimonials[key].map((t, idx) => `<div style="display:grid;gap:8px;padding:12px;background:#fff;border:1px solid var(--line);border-radius:8px" data-t-group="${key}" data-t-idx="${idx}">
        <textarea rows="2" data-t-field="quote">${e(t.quote)}</textarea>
        <div style="display:flex;gap:10px;align-items:center">
          <input style="flex:1;padding:8px 10px;border:1px solid var(--line);border-radius:6px" data-t-field="author" value="${e(t.author)}" placeholder="Author / handle">
          <button type="button" class="text-link small" style="color:var(--coral-deep)" data-t-del="${key}:${idx}">Remove</button>
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
        <button type="button" class="btn btn-sage btn-sm" data-g-save>Publish galleries</button>
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
            <input type="text" data-g-caption="${idx}" value="${e(item.caption || '')}" placeholder="Caption" style="padding:6px 8px;border:1px solid var(--line);border-radius:6px;font-size:12px">
            <div class="admin-gallery-actions">
              <button type="button" class="btn btn-outline btn-sm" data-g-move="${idx}:-1" ${idx === 0 ? 'disabled' : ''}>←</button>
              <button type="button" class="btn btn-outline btn-sm" data-g-move="${idx}:1" ${idx === items.length - 1 ? 'disabled' : ''}>→</button>
              <button type="button" class="text-link small" style="color:var(--coral-deep)" data-g-del="${idx}">Remove</button>
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
        <p class="eyebrow">Checkout &amp; payments</p>
        <h1>Orders &amp; payments</h1>
        <p>Track all orders created from Checkout, payment status (paid / failed / pending), and fulfillment progress.</p>
      </div>
    </div>
    <div id="orders-body"><p class="muted">Loading orders…</p></div>`;

    const bodyEl = container.querySelector('#orders-body');
    let orders = [];
    try {
      const token = localStorage.getItem('ycswu-admin-token-v1');
      const parsedToken = token ? JSON.parse(token) : '';
      const res = await fetch('/api/orders', {
        headers: parsedToken ? { 'x-admin-token': parsedToken } : {},
        cache: 'no-store'
      });
      if (res.ok) {
        const json = await res.json();
        orders = json.orders || [];
      }
    } catch { /* ignore */ }

    const draw = () => {
      if (!orders.length) {
        bodyEl.innerHTML = `<p class="muted">No checkout orders recorded yet.</p>`;
        return;
      }
      bodyEl.innerHTML = `<div class="submissions-list">
        ${orders.map(o => `<article class="submission-card">
          <div class="submission-top">
            <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
              <strong>${e(o.orderId)}</strong>
              <span class="status-pill is-${e(o.paymentStatus || 'pending')}">${e(o.paymentGateway || 'Test')} · ${e(o.paymentStatus || 'pending')}</span>
              <span class="small muted">${e(new Date(o.createdAt).toLocaleString('en-IN'))}</span>
            </div>
            <select data-order-fulfill="${e(o.orderId)}" aria-label="Fulfillment status" style="padding:4px 8px;border:1px solid var(--line);border-radius:6px;font-size:12px">
              ${['new', 'contacted', 'shipped', 'completed', 'cancelled'].map(st => `<option value="${st}" ${(o.fulfillmentStatus || 'new') === st ? 'selected' : ''}>${st}</option>`).join('')}
            </select>
          </div>
          <div class="small" style="display:grid;gap:4px">
            <div><strong>Customer:</strong> ${e(o.customer?.name)} (${e(o.customer?.email)} · ${e(o.customer?.phone)})</div>
            <div><strong>Items:</strong> ${e((o.items || []).map(i => `${i.name} (₹${i.price})`).join(', '))} · <strong>Total: ₹${e(o.amount)}</strong></div>
            ${o.paytmTxnId ? `<div><strong>Txn ID:</strong> ${e(o.paytmTxnId)}</div>` : ''}
            ${o.customer?.address ? `<div><strong>Shipping:</strong> ${e(o.customer.address)}</div>` : ''}
            ${o.customer?.preferredSlot ? `<div><strong>Preferred slot:</strong> ${e(o.customer.preferredSlot)}</div>` : ''}
          </div>
        </article>`).join('')}
      </div>`;

      bodyEl.querySelectorAll('[data-order-fulfill]').forEach(sel => sel.addEventListener('change', async () => {
        const id = sel.getAttribute('data-order-fulfill');
        const token = localStorage.getItem('ycswu-admin-token-v1');
        const parsedToken = token ? JSON.parse(token) : '';
        await fetch(`/api/orders/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(parsedToken ? { 'x-admin-token': parsedToken } : {})
          },
          body: JSON.stringify({ fulfillmentStatus: sel.value })
        });
        onToast?.('Order status updated');
      }));
    };

    draw();
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
      const filtered = activeInquiryFilter === 'all'
        ? submissions
        : submissions.filter(s => s.type === activeInquiryFilter);
      const types = [
        ['all', 'All'],
        ['enrollment', 'Course enrollments'],
        ['booking', '1:1 Bookings'],
        ['contact', 'Contact'],
        ['rsvp', 'Event RSVPs'],
        ['newsletter', 'Mailing list']
      ];
      bodyEl.innerHTML = `<div class="policy-subnav">
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
                <span class="small muted">${e(new Date(s.createdAt).toLocaleString('en-IN'))}</span>
              </div>
              <div style="display:flex;gap:8px;align-items:center">
                <span class="status-pill is-${e(s.status || 'new')}">${e(s.status || 'new')}</span>
                <select data-sub-status="${e(s.id)}" aria-label="Update status" style="padding:4px 8px;border:1px solid var(--line);border-radius:6px;font-size:12px">
                  <option value="new" ${s.status === 'new' ? 'selected' : ''}>New</option>
                  <option value="contacted" ${s.status === 'contacted' ? 'selected' : ''}>Contacted</option>
                  <option value="resolved" ${s.status === 'resolved' ? 'selected' : ''}>Resolved</option>
                </select>
                <button type="button" class="text-link small" style="color:var(--coral-deep)" data-sub-del="${e(s.id)}">Delete</button>
              </div>
            </div>
            <div class="small" style="display:grid;gap:4px">
              ${Object.entries(p).map(([k, v]) => `<div><strong>${e(k)}:</strong> ${e(typeof v === 'object' ? JSON.stringify(v) : v)}</div>`).join('')}
            </div>
          </article>`;
        }).join('')}
      </div>` : `<p class="muted">No submissions in this category yet.</p>`}`;

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
        <p>Export all website copy, courses, events, galleries, and policies as JSON, or restore the original imported site content.</p>
      </div>
    </div>
    <div class="admin-cards-grid">
      <div class="admin-item-card">
        <strong>Export site JSON</strong>
        <p class="small muted" style="margin:0">Download a complete snapshot of your current published content.</p>
        <div><button type="button" class="btn btn-olive btn-sm" data-b-export>Download site-backup.json</button></div>
      </div>
      <div class="admin-item-card">
        <strong>Import site JSON</strong>
        <p class="small muted" style="margin:0">Restore from a previously exported backup file.</p>
        <label class="btn btn-outline btn-sm" style="justify-self:start">Choose JSON file<input type="file" accept="application/json" data-b-import hidden></label>
      </div>
      <div class="admin-item-card">
        <strong>Restore factory defaults</strong>
        <p class="small muted" style="margin:0">Reset all text, courses, events, galleries, and policies back to the original imported youcanstitchwithus.com content.</p>
        <div><button type="button" class="btn btn-outline btn-sm" style="border-color:var(--coral-deep);color:var(--coral-deep)" data-b-reset>Restore default content</button></div>
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
  loadSubmissions().then(list => {
    const newCount = list.filter(x => x.status === 'new').length;
    const badgeHost = root.querySelector('a[href="#admin/inquiries"]');
    if (badgeHost && newCount && !badgeHost.querySelector('.admin-badge')) {
      badgeHost.insertAdjacentHTML('beforeend', `<span class="admin-badge">${newCount}</span>`);
    }
  });
}
