import { mountInlineEditing } from './inline-edit.js';
import { CONTENT_SCHEMA, escapeHTML as e, normalizeContent, validateContent } from './site-content.js';

export function contentInlineTargets(page = 'home') {
  const T = (key, selector, kinds = null, options = {}) => ({ key, selector, kinds, ...options });
  const list = [
    T('brand.name', '[data-edit="brand.name"]', null, { required: true }),
    T('navigation.about', '[data-edit="navigation.about"]', null, { required: true }),
    T('navigation.events', '[data-edit="navigation.events"]', null, { required: true }),
    T('navigation.oneOnOne', '[data-edit="navigation.oneOnOne"]', null, { required: true }),
    T('navigation.courses', '[data-edit="navigation.courses"]', null, { required: true }),

    T('home.heroSubtitle', '[data-edit="home.heroSubtitle"]', ['home'], { required: true }),
    T('home.heroStitchText', '[data-edit="home.heroStitchText"]', ['home'], { type: 'pick' }),
    T('home.makersBody1', '[data-edit="home.makersBody1"]', ['home'], { multiline: true }),
    T('home.tealHeading', '[data-edit="home.tealHeading"]', ['home'], { required: true, multiline: true, allowChildren: true }),
    T('about.communityP3', '.teal-copy [data-edit="about.communityP3"]', ['home'], { multiline: true }),
    T('home.tealCtaLabel', '[data-edit="home.tealCtaLabel"]', ['home'], { required: true }),
    T('home.tealHandNote', '[data-edit="home.tealHandNote"]', ['home'], { multiline: true, allowChildren: true }),
    T('home.railHeading', '[data-edit="home.railHeading"]', ['home'], { required: true, multiline: true, allowChildren: true }),
    T('home.galleryEyebrow', '[data-edit="home.galleryEyebrow"]', ['home'], { required: true }),
    T('home.makersHeading', '[data-edit="home.makersHeading"]', ['home'], { required: true, allowChildren: true }),
    T('home.meetupsTitle', '[data-edit="home.meetupsTitle"]', ['home'], { required: true, allowChildren: true }),
    T('home.closingKicker', '[data-edit="home.closingKicker"]', ['home'], { required: true }),
    T('home.closingHeading', '[data-edit="home.closingHeading"]', ['home'], { required: true, multiline: true, allowChildren: true }),
    T('home.makersSignoff', '[data-edit="home.makersSignoff"]', ['home']),
    T('home.collabBody', '[data-edit="home.collabBody"]', ['home'], { multiline: true }),
    T('home.closingCtaLabel', '[data-edit="home.closingCtaLabel"]', ['home'], { required: true }),
    T('home.collabButton', '[data-edit="home.collabButton"]', ['home'], { required: true }),
    T('home.closingHandNote', '[data-edit="home.closingHandNote"]', ['home'], { multiline: true, allowChildren: true }),

    T('about.pageTitle', '[data-edit="about.pageTitle"]', ['about'], { required: true }),
    T('about.communityHeading', '[data-edit="about.communityHeading"]', ['about'], { required: true }),
    T('about.communityP1', '[data-edit="about.communityP1"]', ['about'], { multiline: true }),
    T('about.communityP2', '[data-edit="about.communityP2"]', ['about'], { multiline: true }),
    T('about.communityP3', '.section-pad [data-edit="about.communityP3"]', ['about'], { multiline: true }),
    T('about.communityP4', '[data-edit="about.communityP4"]', ['about'], { multiline: true }),
    T('about.founderName', '[data-edit="about.founderName"]', ['about'], { required: true }),
    T('about.founderRole', '[data-edit="about.founderRole"]', ['about'], { required: true }),
    T('about.founderBio', '[data-edit="about.founderBio"]', ['about'], { multiline: true }),
    T('about.founderNote', '[data-edit="about.founderNote"]', ['about'], { required: true }),

    T('coursesPage.heading', '[data-edit="coursesPage.heading"]', ['courses'], { required: true }),
    T('coursesPage.subheading', '[data-edit="coursesPage.subheading"]', ['courses']),
    T('coursesPage.paymentNote', '[data-edit="coursesPage.paymentNote"]', ['courses'], { multiline: true }),
    T('coursesPage.kitHeading', '[data-edit="coursesPage.kitHeading"]', ['courses'], { required: true }),
    T('coursesPage.kitButtonLabel', '[data-edit="coursesPage.kitButtonLabel"]', ['courses'], { required: true }),
    T('coursesPage.videoCaption', '[data-edit="coursesPage.videoCaption"]', ['courses']),
    T('coursesPage.howToHeading', '[data-edit="coursesPage.howToHeading"]', ['courses'], { required: true }),
    T('coursesPage.step1Title', '[data-edit="coursesPage.step1Title"]', ['courses'], { required: true }),
    T('coursesPage.step1Desc', '[data-edit="coursesPage.step1Desc"]', ['courses']),
    T('coursesPage.step2Title', '[data-edit="coursesPage.step2Title"]', ['courses'], { required: true }),
    T('coursesPage.step2Desc', '[data-edit="coursesPage.step2Desc"]', ['courses']),
    T('coursesPage.step3Title', '[data-edit="coursesPage.step3Title"]', ['courses'], { required: true }),
    T('coursesPage.step3Desc', '[data-edit="coursesPage.step3Desc"]', ['courses']),
    T('coursesPage.step4Title', '[data-edit="coursesPage.step4Title"]', ['courses'], { required: true }),
    T('coursesPage.step4Desc', '[data-edit="coursesPage.step4Desc"]', ['courses']),

    T('eventsPage.heading', '[data-edit="eventsPage.heading"]', ['events'], { required: true }),

    T('oneOnOne.title', '[data-edit="oneOnOne.title"]', ['1-on-1'], { required: true }),
    T('oneOnOne.priceLabel', '[data-edit="oneOnOne.priceLabel"]', ['1-on-1']),
    T('oneOnOne.ctaLabel', '[data-edit="oneOnOne.ctaLabel"]', ['1-on-1'], { required: true }),
    T('oneOnOne.serviceDescription', '[data-edit="oneOnOne.serviceDescription"]', ['1-on-1'], { multiline: true }),
    T('oneOnOne.learnHeading', '[data-edit="oneOnOne.learnHeading"]', ['1-on-1'], { required: true }),
    T('oneOnOne.learnP1', '[data-edit="oneOnOne.learnP1"]', ['1-on-1'], { multiline: true }),
    T('oneOnOne.learnP2', '[data-edit="oneOnOne.learnP2"]', ['1-on-1'], { multiline: true }),
    T('oneOnOne.hostHeading', '[data-edit="oneOnOne.hostHeading"]', ['1-on-1'], { required: true }),
    T('oneOnOne.hostP1', '[data-edit="oneOnOne.hostP1"]', ['1-on-1'], { multiline: true }),
    T('oneOnOne.hostP2', '[data-edit="oneOnOne.hostP2"]', ['1-on-1'], { multiline: true }),
    T('oneOnOne.hostP3', '[data-edit="oneOnOne.hostP3"]', ['1-on-1'], { multiline: true }),

    T('contact.heading', '[data-edit="contact.heading"]', ['contact'], { required: true }),
    T('contact.subheading', '[data-edit="contact.subheading"]', ['contact'], { required: true }),
    T('contact.p1', '[data-edit="contact.p1"]', ['contact'], { multiline: true }),
    T('contact.p2', '[data-edit="contact.p2"]', ['contact'], { multiline: true }),
    T('contact.submitLabel', '[data-edit="contact.submitLabel"]', ['contact'], { required: true }),

    T('footer.newsletterButton', '[data-edit="footer.newsletterButton"]', null, { required: true }),
    T('footer.termsLabel', '[data-edit="footer.termsLabel"]', null, { required: true }),
    T('footer.privacyLabel', '[data-edit="footer.privacyLabel"]', null, { required: true }),
    T('footer.contactLabel', '[data-edit="footer.contactLabel"]', null, { required: true }),
    T('footer.shippingLabel', '[data-edit="footer.shippingLabel"]', null, { required: true }),
    T('footer.usageLabel', '[data-edit="footer.usageLabel"]', null, { required: true })
  ];

  const policyMap = {
    terms: 'terms',
    privacy: 'privacy',
    shipping: 'shipping',
    'usage-guidelines': 'usage',
    'site-rules': 'rules'
  };
  if (policyMap[page]) {
    const pKey = policyMap[page];
    list.push(
      T(`policies.${pKey}Title`, `[data-edit="policies.${pKey}Title"]`, [page], { required: true }),
      T(`policies.${pKey}Body`, `[data-edit="policies.${pKey}Body"]`, [page], { type: 'pick' })
    );
  }

  // Green pick/jump targets for structured collections
  list.push(
    { id: 'goto:courses', selector: '.tier-card', kinds: ['courses'], type: 'goto', tab: 'courses', tabLabel: 'Courses & pricing', label: 'Course tiers & checklists' },
    { id: 'goto:events', selector: '.event-card', kinds: ['events'], type: 'goto', tab: 'events', tabLabel: 'Events & workshops', label: 'Workshops & events' },
    { id: 'goto:testimonials', selector: '.testimonial-band', kinds: ['home', 'courses', 'events', '1-on-1'], type: 'goto', tab: 'testimonials', tabLabel: 'Testimonials', label: 'Community testimonials' },
    { id: 'goto:galleries', selector: '.showcase-stage, .masonry-grid, .session-gallery', kinds: ['home', 'events', '1-on-1'], type: 'goto', tab: 'galleries', tabLabel: 'Photo galleries', label: 'Photo galleries' }
  );

  return list;
}

export function mountLiveSiteEditor({
  isAdmin,
  getRoute,
  getContent,
  onSaveContent,
  onRefresh
}) {
  let active = false;
  let busy = false;
  let host = null;
  let draftContent = null;
  const changedIds = new Set();
  let message = '';
  let messageError = false;
  let jumpInfo = null;

  function ensureHost() {
    if (host && host.isConnected) return host;
    host = document.createElement('div');
    host.className = 'live-site-editor-ui';
    host.hidden = true;
    document.body.append(host);
    host.addEventListener('click', handleHostClick);
    return host;
  }

  function snapshot() {
    draftContent = normalizeContent(getContent?.() || {});
    changedIds.clear();
    message = '';
    messageError = false;
    jumpInfo = null;
  }

  function buildTargets() {
    if (!active || !isAdmin?.()) return [];
    const r = getRoute?.() || { page: 'home' };
    if (r.page === 'admin') return [];
    if (!draftContent) snapshot();
    const raw = contentInlineTargets(r.page);
    return raw.map(t => {
      if (t.type === 'goto' || t.type === 'pick') return t;
      const [sec, key] = String(t.key || '').split('.');
      const schemaField = CONTENT_SCHEMA[sec]?.fields?.[key];
      if (!schemaField) return null;
      return {
        ...t,
        id: `content:${t.key}`,
        contentKey: t.key,
        max: schemaField.max,
        value: draftContent[sec]?.[key] ?? ''
      };
    }).filter(Boolean);
  }

  function applyChange(target, text) {
    if (!target?.contentKey) return;
    const [sec, key] = target.contentKey.split('.');
    if (draftContent?.[sec] && key) {
      draftContent[sec][key] = text;
      changedIds.add(target.id);
      message = '';
      messageError = false;
      jumpInfo = null;
      renderBar();
    }
  }

  const inline = mountInlineEditing({
    doc: document,
    ignoreSelector: '.live-site-editor-ui, dialog, #toast, .admin-layout',
    enabled: false,
    getTargets: buildTargets,
    onStart: () => { jumpInfo = null; renderBar(); },
    onInput: (target, text) => applyChange(target, text),
    onCommit: (target, text, info) => {
      if (info?.changed) applyChange(target, text);
      else renderBar();
    },
    onPick: target => {
      if (target.tab) {
        jumpInfo = { label: target.label || 'This section', href: `#admin/${target.tab}`, tabLabel: target.tabLabel || 'Admin Studio' };
      } else if (target.contentKey?.startsWith('policies.')) {
        jumpInfo = { label: 'Full policy text', href: '#admin/policies', tabLabel: 'Pages & policies' };
      } else {
        jumpInfo = { label: target.label || 'This text', href: '#admin/content', tabLabel: 'Storefront editor' };
      }
      renderBar();
    }
  });

  function renderBar() {
    const el = ensureHost();
    const r = getRoute?.() || { page: 'home' };
    const show = Boolean(isAdmin?.()) && r.page !== 'admin';
    if (!show) {
      if (active) deactivate();
      el.hidden = true;
      return;
    }
    el.hidden = false;
    if (!active) {
      el.className = 'live-site-editor-ui is-idle';
      el.innerHTML = `<button type="button" class="live-edit-fab" data-live-action="enter">✎ Edit this page</button>
        <a class="live-edit-admin-chip" href="#admin" title="Open Admin Studio">Admin ↗</a>`;
      return;
    }

    const dirtyCount = changedIds.size;
    el.className = 'live-site-editor-ui is-active';
    el.innerHTML = `<div class="live-editor-dock" role="region" aria-label="Live on-site page editor">
      <div class="live-editor-meta">
        <span class="live-editor-badge">● Editing page live</span>
        <span class="live-editor-hint ${messageError ? 'is-error' : ''}">${jumpInfo
          ? `${e(jumpInfo.label)} is edited in <a href="${e(jumpInfo.href)}" data-live-action="jump">${e(jumpInfo.tabLabel)} →</a>`
          : message
            ? e(message)
            : dirtyCount
              ? `${dirtyCount} ${dirtyCount === 1 ? 'field' : 'fields'} edited on page · Enter confirms`
              : 'Click any outlined text to edit · green outlines jump to Admin tabs'}</span>
      </div>
      <div class="live-editor-actions">
        <a class="btn btn-outline btn-sm" href="#admin">Admin Studio ↗</a>
        <button type="button" class="btn btn-outline btn-sm" data-live-action="discard" ${busy ? 'disabled' : ''}>${dirtyCount ? 'Discard' : 'Done'}</button>
        <button type="button" class="btn-lime btn-sm" data-live-action="publish" ${busy || !dirtyCount ? 'disabled' : ''}>${busy ? 'Publishing…' : 'Publish changes'}</button>
      </div>
    </div>`;
  }

  function activate() {
    snapshot();
    active = true;
    document.body.classList.add('is-live-site-editing');
    inline.setEnabled(true);
    inline.refresh();
    renderBar();
  }

  function deactivate() {
    active = false;
    document.body.classList.remove('is-live-site-editing');
    inline.setEnabled(false);
    snapshot();
    onRefresh?.();
    renderBar();
  }

  async function publish() {
    if (busy) return;
    inline.commit();
    if (!changedIds.size) {
      deactivate();
      return;
    }
    const err = validateContent(draftContent);
    if (err) {
      message = err;
      messageError = true;
      renderBar();
      return;
    }
    busy = true;
    renderBar();
    try {
      const res = await onSaveContent?.(draftContent);
      if (res?.ok === false) {
        message = res.error || 'Could not publish changes.';
        messageError = true;
      } else {
        changedIds.clear();
        message = '✓ Published live';
        messageError = false;
        snapshot();
        onRefresh?.();
        inline.refresh();
      }
    } finally {
      busy = false;
      renderBar();
    }
  }

  function handleHostClick(event) {
    const act = event.target?.closest?.('[data-live-action]');
    if (!act) return;
    const action = act.getAttribute('data-live-action');
    if (action === 'enter') activate();
    else if (action === 'discard') deactivate();
    else if (action === 'publish') publish();
    else if (action === 'jump') deactivate();
  }

  return {
    sync() {
      const r = getRoute?.() || { page: 'home' };
      document.body.setAttribute('data-page', r.page || 'home');
      if (active) {
        snapshot();
        inline.refresh();
      }
      renderBar();
    },
    isActive: () => active
  };
}
