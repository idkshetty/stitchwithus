import { mountInlineEditing } from './inline-edit.js';
import { CONTENT_SCHEMA, escapeHTML as e, normalizeContent, validateContent } from './site-content.js';

export function contentInlineTargets(page = 'home') {
  const T = (key, selector, kinds = null, options = {}) => ({ key, selector, kinds, ...options });
  const list = [
    T('navigation.home', '.desktop-nav > a[data-nav="home"]', null, { required: true }),
    T('navigation.about', '.desktop-nav > a[data-nav="about"]', null, { required: true }),
    T('navigation.events', '.desktop-nav > a[data-nav="events"]', null, { required: true }),
    T('navigation.oneOnOne', '.desktop-nav > a[data-nav="1-on-1"]', null, { required: true }),
    T('navigation.courses', '.desktop-nav > a[data-nav="courses"]', null, { required: true }),

    T('home.heroTitlePrefix', '.home-hero-prefix', ['home']),
    T('home.heroStitchText', '.home-hero-stitch', ['home'], { required: true }),
    T('home.heroTitleSuffix', '.home-hero-suffix', ['home']),
    T('home.heroSubtitle', '.home-hero-subtitle', ['home'], { required: true }),
    T('home.ctaCourses', '.home-hero-actions a[href="#courses"]', ['home'], { required: true }),
    T('home.ctaEvents', '.home-hero-actions a[href="#events"]', ['home'], { required: true }),
    T('home.ctaPrivate', '.home-hero-actions a[href="#1-on-1"]', ['home'], { required: true }),
    T('home.makersHeading', '.makers-heading', ['home'], { required: true }),
    T('home.makersBody1', '.makers-p1', ['home'], { multiline: true }),
    T('home.makersBody2', '.makers-p2', ['home']),
    T('home.makersSignoff', '.makers-signoff', ['home']),
    T('home.collabHeading', '.collaborate-card h2', ['home'], { required: true }),
    T('home.collabBody', '.collaborate-card p', ['home'], { multiline: true }),
    T('home.collabButton', '.collaborate-actions .btn-sage', ['home'], { required: true }),
    T('home.instaHeading', '.instagram-card h2 span', ['home'], { required: true }),
    T('home.instaSubtext', '.insta-subtext a', ['home'], { required: true }),

    T('about.pageTitle', '.page-banner h1', ['about'], { required: true }),
    T('about.communityHeading', '.about-panel:first-child h2 span', ['about'], { required: true }),
    T('about.communityP1', '.about-p1', ['about'], { multiline: true }),
    T('about.communityP2', '.about-p2', ['about'], { multiline: true }),
    T('about.communityP3', '.about-p3', ['about'], { multiline: true }),
    T('about.communityP4', '.about-p4', ['about'], { multiline: true }),
    T('about.founderName', '.about-panel:last-child h2 span', ['about'], { required: true }),
    T('about.founderRole', '.about-panel:last-child .eyebrow', ['about'], { required: true }),
    T('about.founderBio', '.founder-bio', ['about'], { multiline: true }),
    T('about.founderNote', '.founder-note a', ['about'], { required: true }),

    T('coursesPage.heading', '.page-banner h1', ['courses'], { required: true }),
    T('coursesPage.subheading', '.page-banner p', ['courses']),
    T('coursesPage.paymentNote', '.payment-note', ['courses'], { multiline: true }),
    T('coursesPage.kitHeading', '.kit-band h2', ['courses'], { required: true }),
    T('coursesPage.kitButtonLabel', '.kit-band .btn-sage', ['courses'], { required: true }),
    T('coursesPage.videoCaption', '.course-video-caption', ['courses']),
    T('coursesPage.howToHeading', '.steps-band h2', ['courses'], { required: true }),
    T('coursesPage.step1Title', '.step1-title', ['courses'], { required: true }),
    T('coursesPage.step1Desc', '.step1-desc', ['courses']),
    T('coursesPage.step2Title', '.step2-title', ['courses'], { required: true }),
    T('coursesPage.step2Desc', '.step2-desc', ['courses']),
    T('coursesPage.step3Title', '.step3-title', ['courses'], { required: true }),
    T('coursesPage.step3Desc', '.step3-desc', ['courses']),
    T('coursesPage.step4Title', '.step4-title', ['courses'], { required: true }),
    T('coursesPage.step4Desc', '.step4-desc', ['courses']),

    T('eventsPage.heading', '.page-banner h1', ['events'], { required: true }),
    T('eventsPage.testimonialsHeading', '.testimonial-band-title', ['events']),

    T('oneOnOne.title', '.session-hero-copy h1', ['1-on-1'], { required: true }),
    T('oneOnOne.badge', '.session-pill', ['1-on-1']),
    T('oneOnOne.priceLabel', '.session-hero-copy p[style*="font-size:1.25rem"]', ['1-on-1']),
    T('oneOnOne.ctaLabel', '.session-hero-copy .btn-sage', ['1-on-1'], { required: true }),
    T('oneOnOne.serviceDescription', '.session-desc', ['1-on-1'], { multiline: true }),
    T('oneOnOne.learnHeading', '.session-split-copy.is-sage h2', ['1-on-1'], { required: true }),
    T('oneOnOne.learnP1', '.learn-p1', ['1-on-1'], { multiline: true }),
    T('oneOnOne.learnP2', '.learn-p2', ['1-on-1'], { multiline: true }),
    T('oneOnOne.hostHeading', '.session-split-copy.is-butter h2', ['1-on-1'], { required: true }),
    T('oneOnOne.hostP1', '.host-p1', ['1-on-1'], { multiline: true }),
    T('oneOnOne.hostP2', '.host-p2', ['1-on-1'], { multiline: true }),
    T('oneOnOne.hostP3', '.host-p3', ['1-on-1'], { multiline: true }),

    T('contact.heading', '.page-banner h1', ['contact'], { required: true }),
    T('contact.subheading', '.contact-info-card h2', ['contact'], { required: true }),
    T('contact.p1', '.contact-p1', ['contact'], { multiline: true }),
    T('contact.p2', '.contact-p2', ['contact'], { multiline: true }),
    T('contact.submitLabel', '.contact-form-card button[type="submit"]', ['contact'], { required: true }),

    T('footer.newsletterHeading', '.newsletter-heading', null),
    T('footer.newsletterButton', 'form[data-form="newsletter"] button[type="submit"]', null, { required: true }),
    T('footer.termsLabel', '#footer a[href="#terms"]', null, { required: true }),
    T('footer.privacyLabel', '#footer a[href="#privacy"]', null, { required: true }),
    T('footer.contactLabel', '#footer a[href="#contact"]', null, { required: true }),
    T('footer.shippingLabel', '#footer a[href="#shipping"]', null, { required: true }),
    T('footer.usageLabel', '#footer a[href="#usage-guidelines"]', null, { required: true }),
    T('footer.copyrightLine1', '.footer-bottom > div:first-child > div:first-child', null, { required: true }),
    T('footer.copyrightLine2', '.footer-bottom > div:first-child > div:last-child', null, { required: true })
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
      T(`policies.${pKey}Title`, '.policy-doc h1', [page], { required: true }),
      T(`policies.${pKey}Body`, '.policy-body', [page], { type: 'pick' })
    );
  }

  // Green pick/jump targets for structured collections
  list.push(
    { id: 'goto:courses', selector: '.course-card', kinds: ['courses'], type: 'goto', tab: 'courses', tabLabel: 'Courses & pricing', label: 'Course tiers & checklists' },
    { id: 'goto:events', selector: '.event-card', kinds: ['events'], type: 'goto', tab: 'events', tabLabel: 'Events & workshops', label: 'Workshops & events' },
    { id: 'goto:testimonials', selector: '.testimonial-band', kinds: ['home', 'courses', 'events', '1-on-1'], type: 'goto', tab: 'testimonials', tabLabel: 'Testimonials', label: 'Community testimonials' },
    { id: 'goto:galleries', selector: '.slideshow-card, .masonry-grid, .session-gallery', kinds: ['home', 'events', '1-on-1'], type: 'goto', tab: 'galleries', tabLabel: 'Photo galleries', label: 'Photo galleries' }
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
        <button type="button" class="btn btn-sage btn-sm" data-live-action="publish" ${busy || !dirtyCount ? 'disabled' : ''}>${busy ? 'Publishing…' : 'Publish changes'}</button>
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
