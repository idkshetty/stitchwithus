import { escapeHTML as e } from './site-content.js';
import { headerMarkup, footerMarkup, renderRouteView } from './views.js';
import { mountInlineEditing, readInlinePref, writeInlinePref, inlineToolbarMarkup, inlineHintMarkup } from './inline-edit.js';

export const PREVIEW_PAGES = [
  ['home', 'Home'],
  ['about', 'About'],
  ['courses', 'Courses (Learn with Us)'],
  ['wizard-plus', 'Wizard Plus'],
  ['wizard', 'Wizard'],
  ['events', 'Workshops & Events'],
  ['1-on-1', '1:1 Tailored Session'],
  ['contact', 'Contact Us'],
  ['terms', 'Terms of Service'],
  ['privacy', 'Privacy Policy'],
  ['shipping', 'Shipping, Returns & Refunds'],
  ['usage-guidelines', 'Usage Policies & Guidelines'],
  ['site-rules', 'Site Rules']
];

export function buildPreviewDocumentHtml(data, page = 'home') {
  const route = page.startsWith('event:')
    ? { page: 'event', id: page.slice(6) }
    : { page, id: '' };
  const bodyHtml = `${headerMarkup(data, route, 0)}<main>${renderRouteView(data, route)}</main><footer id="footer" class="site-footer">${footerMarkup(data)}</footer>`;
  const baseHref = typeof document !== 'undefined' ? new URL('./', document.baseURI).href : '/';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <base href="${e(baseHref)}">
  <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Shrikhand&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/styles.css">
  <style>
    a,button,input,select,textarea{pointer-events:none}
    body{overflow-x:hidden;padding-bottom:0!important}
    .site-header{position:relative}
    .char-reveal .ch,[data-reveal]{opacity:1!important;transform:none!important}
    .mobile-tabbar,.scroll-progress{display:none!important}
    [data-edit-highlight="true"]{
      outline:2px solid #d94e41!important;
      outline-offset:4px!important;
      border-radius:3px;
      scroll-margin-block:80px;
    }
  </style>
</head>
<body data-page="${e(route.page)}">${bodyHtml}</body>
</html>`;
}

export function mountSitePreviewPanel(container, {
  getData,
  initialPage = 'home',
  title = 'Live site preview',
  inlineTargets = null,
  onInlineStart,
  onInlineInput,
  onInlineCommit,
  onInlinePick
}) {
  let page = initialPage || 'home';
  let device = 'desktop';
  let timer = null;
  let commitTimer = null;
  let pendingRender = false;
  let activeHighlightSelector = '';
  let pendingHighlightScroll = false;

  const inlineAvailable = typeof inlineTargets === 'function';
  const inlineOn = inlineAvailable && readInlinePref();

  container.innerHTML = `<section class="content-preview" aria-label="${e(title)}">
    <div class="content-preview-toolbar">
      <label>${e(title)}
        <select data-preview-page-select aria-label="Preview page">
          ${PREVIEW_PAGES.map(([id, label]) => `<option value="${e(id)}" ${id === page ? 'selected' : ''}>${e(label)}</option>`).join('')}
        </select>
      </label>
      <div class="content-devices-group">
        ${inlineAvailable ? inlineToolbarMarkup(inlineOn) : ''}
        <div class="content-devices" role="group" aria-label="Preview screen size">
          <button type="button" data-device="desktop" aria-pressed="true">Desktop</button>
          <button type="button" data-device="mobile" aria-pressed="false">Mobile</button>
        </div>
        <a class="btn btn-outline btn-sm" data-preview-live-link href="#${e(page)}">Open live ↗</a>
      </div>
    </div>
    ${inlineAvailable ? inlineHintMarkup(inlineOn) : ''}
    <div class="content-preview-stage">
      <div class="content-preview-frame"><iframe title="${e(title)}" sandbox="allow-same-origin" tabindex="-1"></iframe></div>
    </div>
  </section>`;

  const selectEl = container.querySelector('[data-preview-page-select]');
  const stage = container.querySelector('.content-preview-stage');
  const holder = container.querySelector('.content-preview-frame');
  const frame = container.querySelector('iframe');
  const liveLink = container.querySelector('[data-preview-live-link]');
  const inlineToggle = container.querySelector('[data-inline-toggle]');
  const inlineHint = container.querySelector('[data-inline-hint]');

  const inline = inlineAvailable ? mountInlineEditing({
    frame,
    enabled: inlineOn,
    getTargets: () => inlineTargets(page) || [],
    onStart: onInlineStart,
    onInput: onInlineInput,
    onCommit: (target, text, info) => {
      try { onInlineCommit?.(target, text, info); } finally {
        clearTimeout(commitTimer);
        if (!info?.switching && (info?.changed || pendingRender)) {
          commitTimer = setTimeout(() => {
            if (!inline.isEditing()) {
              pendingRender = false;
              renderFrame();
            }
          }, 40);
        }
      }
    },
    onPick: onInlinePick
  }) : null;

  function sizeFrame() {
    const width = device === 'mobile' ? 390 : 1200;
    const avail = Math.max(260, stage.clientWidth - 28);
    const scale = Math.min(1, avail / width);
    holder.style.width = `${width}px`;
    holder.style.height = `${Math.round(590 / scale)}px`;
    holder.style.transform = `scale(${scale})`;
  }

  function applyHighlight(selector = activeHighlightSelector, scroll = false) {
    const doc = frame.contentDocument;
    if (!doc) return;
    doc.querySelectorAll('[data-edit-highlight]').forEach(el => el.removeAttribute('data-edit-highlight'));
    if (!selector) return;
    let target = null;
    for (const part of String(selector).split('||')) {
      const sel = part.trim();
      if (!sel) continue;
      target = doc.querySelector(sel);
      if (target) break;
    }
    if (!target) return;
    target.setAttribute('data-edit-highlight', 'true');
    if (scroll) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function renderFrame() {
    const data = getData();
    if (!data) return;
    const scrollTop = frame.contentWindow?.scrollY || 0;
    const html = buildPreviewDocumentHtml(data, page);
    frame.srcdoc = html;
    if (liveLink) liveLink.setAttribute('href', `#${page}`);
    frame.onload = () => {
      sizeFrame();
      if (scrollTop) frame.contentWindow?.scrollTo(0, scrollTop);
      inline?.refresh();
      applyHighlight(activeHighlightSelector, pendingHighlightScroll);
      pendingHighlightScroll = false;
    };
  }

  selectEl?.addEventListener('change', () => {
    page = selectEl.value || 'home';
    renderFrame();
  });

  container.querySelectorAll('[data-device]').forEach(btn => {
    btn.addEventListener('click', () => {
      device = btn.getAttribute('data-device') || 'desktop';
      container.querySelectorAll('[data-device]').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      sizeFrame();
    });
  });

  inlineToggle?.addEventListener('click', () => {
    if (!inline) return;
    const next = !inline.isEnabled();
    inline.setEnabled(next);
    writeInlinePref(next);
    inlineToggle.classList.toggle('is-on', next);
    inlineToggle.setAttribute('aria-pressed', String(next));
    if (inlineHint) inlineHint.hidden = !next;
  });

  window.addEventListener('resize', sizeFrame);
  renderFrame();

  return {
    scheduleRender() {
      if (inline?.isEditing()) {
        pendingRender = true;
        return;
      }
      clearTimeout(timer);
      timer = setTimeout(renderFrame, 120);
    },
    setPage(nextPage) {
      if (!nextPage || nextPage === page) return;
      page = nextPage;
      if (selectEl) selectEl.value = nextPage;
      renderFrame();
    },
    highlight(selector, { scroll = true } = {}) {
      activeHighlightSelector = selector || '';
      pendingHighlightScroll = scroll;
      applyHighlight(activeHighlightSelector, scroll);
    },
    dispose() {
      window.removeEventListener('resize', sizeFrame);
      clearTimeout(timer);
      clearTimeout(commitTimer);
      inline?.dispose();
    }
  };
}
