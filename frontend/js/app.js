import {
  DEFAULT_CONTENT,
  escapeHTML as e,
  formatINR,
  normalizeContent,
  safeImage
} from './site-content.js';
import { headerMarkup, footerMarkup, itemThumbnail, renderRouteView } from './views.js';
import { mountLiveSiteEditor } from './live-site-editor.js';
import { mountSitePreviewPanel } from './site-preview.js';
import { renderAdminStudio } from './admin-studio.js';
import {
  checkAdminSession,
  loadSiteContent,
  saveSiteContent,
  submitPublicForm,
  subscribeSiteContent
} from './storage.js';
import {
  applyCheckoutCoupon,
  completeTestPayment,
  createCheckoutOrder
} from './paytm-checkout.js';

const BAG_KEY = 'ycswu-bag-v1';
const CHEVRON_LEFT_SVG = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>`;
const CHEVRON_RIGHT_SVG = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>`;

let siteData = normalizeContent(DEFAULT_CONTENT);
let adminSession = { authenticated: false, demoPasscodeHint: null };
let bag = loadBag();
let checkoutState = { confirmedOrder: null, failedMessage: '', formValues: {}, coupon: null, couponError: '' };
const carouselIndex = new Map();
let slideshowIdx = 0;

let autoplayTimers = new Map();
let pausedCarousels = new Set();
let revealObserver = null;
let lightboxState = { list: [], index: 0 };

function loadBag() {
  try {
    const raw = localStorage.getItem(BAG_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveBag() {
  try {
    localStorage.setItem(BAG_KEY, JSON.stringify(bag));
  } catch { /* ignore */ }
}

export function parseRoute(hash = location.hash) {
  const clean = String(hash || '#home').replace(/^#\/?/, '').split('?')[0].trim();
  if (!clean) return { page: 'home', id: '' };
  const [head, ...rest] = clean.split('/');
  const id = rest.join('/');
  const allowed = new Set([
    'home', 'about', 'events', 'event', '1-on-1', 'courses',
    'wizard-plus', 'wizard', 'checkout', 'contact', 'terms', 'privacy',
    'shipping', 'usage-guidelines', 'site-rules', 'admin'
  ]);
  if (!allowed.has(head)) return { page: 'home', id: '' };
  return { page: head, id };
}

function showToast(message, isError = false) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.toggle('is-error', Boolean(isError));
  el.hidden = false;
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => { el.hidden = true; }, 3400);
}

function updateDocumentTitle(route) {
  const titles = {
    home: siteData.brand.pageTitle || 'You Can Stitch With Us | Art Community',
    about: 'About | You Can Stitch With Us',
    events: 'Events | You Can Stitch With Us',
    event: 'Event Details | You Can Stitch With Us',
    '1-on-1': '1:1 | You Can Stitch With Us',
    courses: 'Courses | You Can Stitch With Us',
    'wizard-plus': 'Wizard Plus | You Can Stitch With Us',
    wizard: 'Wizard | You Can Stitch With Us',
    checkout: 'Checkout | You Can Stitch With Us',
    contact: 'Contact | You Can Stitch With Us',
    terms: 'Terms of Service | You Can Stitch With Us',
    privacy: 'Privacy Policy | You Can Stitch With Us',
    shipping: 'Shipping, Returns & Refunds | You Can Stitch With Us',
    'usage-guidelines': 'Usage Policies and Community Guidelines | You Can Stitch With Us',
    'site-rules': 'Site Rules | You Can Stitch With Us',
    admin: 'Admin Studio | You Can Stitch With Us'
  };
  document.title = titles[route.page] || siteData.brand.pageTitle;
}

const liveEditor = mountLiveSiteEditor({
  isAdmin: () => adminSession.authenticated,
  getRoute: () => parseRoute(),
  getContent: () => siteData,
  onSaveContent: async next => {
    const res = await saveSiteContent(next);
    if (res.ok) {
      siteData = normalizeContent(res.data || next);
      showToast('Published changes live!');
    }
    return res;
  },
  onRefresh: () => renderApp()
});

function renderBag() {
  const body = document.getElementById('bag-body');
  const foot = document.getElementById('bag-foot');
  if (!body || !foot) return;

  if (!bag.length) {
    foot.hidden = true;
    foot.innerHTML = '';
    const courses = siteData.courses || [];
    const wizPlus = courses.find(c => c.id === 'wizard-plus') || courses[0];
    const wiz = courses.find(c => c.id === 'wizard') || courses[1];
    body.innerHTML = `<p class="muted" style="margin:0">Your stitch bag is empty. Pick an offering below to begin:</p>
      <div style="display:grid;gap:10px">
        ${wizPlus ? `<div class="bag-item">
          <img class="bag-item-thumb" src="${e(itemThumbnail(siteData, wizPlus.id))}" alt="">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
            <div><strong>${e(wizPlus.name)}</strong><div class="small muted">${e(formatINR(wizPlus.price))}</div></div>
            <button type="button" class="btn btn-gold btn-sm" data-action="enroll-course" data-course-id="${e(wizPlus.id)}">Add</button>
          </div>
        </div>` : ''}
        ${wiz ? `<div class="bag-item">
          <img class="bag-item-thumb" src="${e(itemThumbnail(siteData, wiz.id))}" alt="">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
            <div><strong>${e(wiz.name)}</strong><div class="small muted">${e(formatINR(wiz.price))}</div></div>
            <button type="button" class="btn btn-outline btn-sm" data-action="enroll-course" data-course-id="${e(wiz.id)}">Add</button>
          </div>
        </div>` : ''}
        <div class="bag-item">
          <img class="bag-item-thumb" src="${e(itemThumbnail(siteData, 'one-on-1'))}" alt="">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
            <div><strong>1:1 Session</strong><div class="small muted">${e(siteData.oneOnOne.priceLabel)}</div></div>
            <button type="button" class="btn btn-sage btn-sm" data-action="book-session">Book</button>
          </div>
        </div>
      </div>`;
    return;
  }

  const total = bag.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1), 0);
  const hasWizardOnly = bag.some(i => i.id === 'wizard') && !bag.some(i => i.id === 'wizard-plus');
  body.innerHTML = `<div style="display:grid;gap:10px">
      ${bag.map((item, idx) => `<div class="bag-item">
        <img class="bag-item-thumb" src="${e(itemThumbnail(siteData, item.id))}" alt="">
        <div>
          <strong>${e(item.name)}</strong>
          <div class="small muted">${e(item.id === 'one-on-1' ? 'Live 1:1 Online' : 'Pre-recorded Course · Kit Included')}</div>
          <div class="bag-item-controls">
            <div class="qty-stepper">
              <button type="button" data-action="bag-qty" data-idx="${idx}" data-delta="-1" aria-label="Decrease quantity">−</button>
              <span>${e(item.qty || 1)}</span>
              <button type="button" data-action="bag-qty" data-idx="${idx}" data-delta="1" aria-label="Increase quantity">+</button>
            </div>
            <span class="small" style="font-weight:700">${e(formatINR(Number(item.price) * Number(item.qty || 1)))}</span>
            <button type="button" class="text-link small" style="color:var(--coral-deep)" data-action="remove-bag-item" data-idx="${idx}">Remove</button>
          </div>
        </div>
      </div>`).join('')}
      ${hasWizardOnly ? `<div class="bag-upsell">
        <span>Upgrade to <strong>Wizard Plus</strong> (+₹1,000) for 30+ modules &amp; personal mentorship</span>
        <button type="button" class="btn btn-gold btn-sm" data-action="upgrade-wizard-plus">Switch</button>
      </div>` : ''}
    </div>`;

  foot.hidden = false;
  foot.innerHTML = `<div style="display:flex;justify-content:space-between;font-weight:700;font-size:15px">
      <span>Subtotal</span>
      <span>${e(formatINR(total))}</span>
    </div>
    <a href="#checkout" class="btn btn-sage" data-action="close-bag" style="width:100%">Proceed to Checkout →</a>`;
}

function openBag() {
  renderBag();
  document.getElementById('drawer-backdrop').hidden = false;
  const drawer = document.getElementById('bag-drawer');
  drawer.classList.add('is-open');
  drawer.setAttribute('aria-hidden', 'false');
}

function closeBag() {
  document.getElementById('drawer-backdrop').hidden = true;
  const drawer = document.getElementById('bag-drawer');
  drawer.classList.remove('is-open');
  drawer.setAttribute('aria-hidden', 'true');
}

function renderLightbox() {
  const modal = document.getElementById('app-modal');
  const { list, index } = lightboxState;
  const item = list[index];
  if (!item) return;
  const hasNav = list.length > 1;
  modal.classList.add('is-lightbox');
  modal.innerHTML = `<div class="modal-inner">
    <div class="lightbox-head">
      <span class="small">${hasNav ? `${index + 1}/${list.length} · ` : ''}${e(item.caption || '')}</span>
      <button type="button" class="icon-btn" style="color:#fff;border-color:rgba(255,255,255,.35)" data-action="close-modal" aria-label="Close">✕</button>
    </div>
    <div class="lightbox-stage">
      ${hasNav ? `<button type="button" class="lightbox-nav prev" data-action="lightbox-prev" aria-label="Previous photo">${CHEVRON_LEFT_SVG}</button>` : ''}
      <img class="lightbox-img" src="${e(safeImage(item.src))}" alt="${e(item.caption || '')}">
      ${hasNav ? `<button type="button" class="lightbox-nav next" data-action="lightbox-next" aria-label="Next photo">${CHEVRON_RIGHT_SVG}</button>` : ''}
    </div>
  </div>`;
  if (!modal.open) modal.showModal();
}

function openLightbox(src, caption = '', groupKey = '', startIdx = 0) {
  const groupList = groupKey && Array.isArray(siteData.galleries?.[groupKey])
    ? siteData.galleries[groupKey]
    : [{ src, caption }];
  const idx = Math.max(0, Math.min(groupList.length - 1, Number(startIdx || 0)));
  lightboxState = { list: groupList, index: idx };
  renderLightbox();
}

function stepLightbox(delta) {
  const len = lightboxState.list.length;
  if (len <= 1) return;
  lightboxState.index = ((lightboxState.index + delta) % len + len) % len;
  renderLightbox();
}

function openEventWaitlistModal(title) {
  const modal = document.getElementById('app-modal');
  modal.classList.remove('is-lightbox');
  modal.innerHTML = `<div class="modal-inner" style="width:min(480px,92vw)">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <h2 style="font-family:var(--font-display);margin:0;font-size:1.35rem">${e(title)}</h2>
      <button type="button" class="icon-btn" data-action="close-modal" aria-label="Close">✕</button>
    </div>
    <form class="form-stack" data-form="rsvp">
      <input type="hidden" name="event" value="${e(title)}">
      <label class="field">Your Name<input name="name" required placeholder="Full name"></label>
      <label class="field">Email<input type="email" name="email" required placeholder="you@example.com"></label>
      <label class="field">WhatsApp Number<input name="phone" required placeholder="+91 ..."></label>
      <label class="field">Message (optional)<textarea name="notes" rows="2" placeholder="Any questions or city preference…"></textarea></label>
      <button type="submit" class="btn btn-sage">Submit RSVP / Waitlist</button>
    </form>
  </div>`;
  modal.showModal();
}

function openFakePaymentDialog(orderInfo, onDecision) {
  const modal = document.getElementById('app-modal');
  modal.classList.remove('is-lightbox');
  modal.innerHTML = `<div class="modal-inner" style="width:min(460px,92vw)">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div>
        <p class="eyebrow" style="margin:0 0 4px">Fake Payment Testing</p>
        <h2 style="font-family:var(--font-display);margin:0;font-size:1.4rem">Test Payment Popup</h2>
      </div>
      <button type="button" class="icon-btn" data-action="close-modal" aria-label="Close">✕</button>
    </div>
    <div style="background:var(--cream);border:1px solid var(--line);border-radius:8px;padding:16px;font-size:13.5px;display:grid;gap:6px;margin-bottom:18px">
      <div><strong>Order ID:</strong> ${e(orderInfo.orderId)}</div>
      <div><strong>Items:</strong> ${e((orderInfo.items || []).map(i => i.name).join(', '))}</div>
      <div><strong>Amount:</strong> ${e(formatINR(orderInfo.amount))}</div>
    </div>
    <p class="small muted" style="margin:0 0 18px">Choose a simulated payment outcome to test the checkout and backend order flow:</p>
    <div style="display:grid;gap:10px">
      <button type="button" class="btn btn-sage" data-fake-pay="paid">Payment Successful</button>
      <button type="button" class="btn btn-outline" style="border-color:var(--coral-deep);color:var(--coral-deep)" data-fake-pay="failed">Payment Failed</button>
    </div>
  </div>`;
  modal.showModal();
  modal.querySelectorAll('[data-fake-pay]').forEach(btn => {
    btn.addEventListener('click', () => {
      const outcome = btn.getAttribute('data-fake-pay');
      modal.close();
      onDecision(outcome);
    });
  });
}

function openPreviewModal(previewData) {
  const modal = document.getElementById('app-modal');
  modal.classList.remove('is-lightbox');
  modal.innerHTML = `<div class="modal-inner" style="width:min(1100px,94vw)">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <h2 style="font-family:var(--font-display);margin:0;font-size:1.35rem">Full Site Preview</h2>
      <button type="button" class="icon-btn" data-action="close-modal" aria-label="Close">✕</button>
    </div>
    <div id="modal-preview-host"></div>
  </div>`;
  modal.showModal();
  mountSitePreviewPanel(modal.querySelector('#modal-preview-host'), {
    getData: () => previewData || siteData,
    initialPage: 'home'
  });
}

function syncCarouselUI(id, index, animate = false) {
  const list = id === 'home-meetups' ? siteData.testimonials.meetups : siteData.testimonials.learners;
  if (!list.length) return;
  const normalized = ((index % list.length) + list.length) % list.length;
  carouselIndex.set(id, normalized);

  const root = document.querySelector(`[data-carousel="${id}"]`);
  if (!root) return;
  const cards = root.querySelectorAll('.testimonial-card');
  cards.forEach((card, slot) => {
    const item = list[(normalized + slot) % list.length];
    const qEl = card.querySelector(`[data-slot-quote="${slot}"]`);
    const aEl = card.querySelector(`[data-slot-author="${slot}"]`);
    if (animate) {
      card.classList.add('is-fading');
      setTimeout(() => {
        if (qEl) qEl.textContent = item.quote;
        if (aEl) aEl.textContent = item.author;
        card.classList.remove('is-fading');
      }, 110);
    } else {
      if (qEl) qEl.textContent = item.quote;
      if (aEl) aEl.textContent = item.author;
    }
  });
  root.querySelectorAll(`[data-carousel-dot="${id}"]`).forEach(dot => {
    dot.classList.toggle('is-active', Number(dot.getAttribute('data-index')) === normalized);
  });
}

function syncSlideshowUI(index, animate = false) {
  const list = siteData.galleries.homeCommunity || [];
  if (!list.length) return;
  slideshowIdx = ((index % list.length) + list.length) % list.length;
  const item = list[slideshowIdx];
  const img = document.querySelector('[data-slideshow-img="home"]');
  const counter = document.querySelector('[data-slideshow-counter="home"]');
  const apply = () => {
    if (img) {
      img.src = safeImage(item.src);
      img.alt = item.caption || 'Community stitch meetup';
      img.setAttribute('data-lightbox-idx', String(slideshowIdx));
      img.classList.remove('is-fading');
    }
    if (counter) counter.textContent = `${slideshowIdx + 1}/${list.length}`;
  };
  if (animate && img) {
    img.classList.add('is-fading');
    setTimeout(apply, 110);
  } else {
    apply();
  }
  document.querySelectorAll('[data-slideshow-dot="home"]').forEach(btn => {
    btn.classList.toggle('is-active', Number(btn.getAttribute('data-index')) === slideshowIdx);
  });
}

function stopAutoCarousels() {
  for (const timer of autoplayTimers.values()) clearInterval(timer);
  autoplayTimers.clear();
  pausedCarousels.clear();
}

function canAutoplay(key) {
  if (pausedCarousels.has(key)) return false;
  if (document.hidden || liveEditor.isActive()) return false;
  const modal = document.getElementById('app-modal');
  if (modal?.open) return false;
  return true;
}

function resetCarouselTimer(key) {
  const existing = autoplayTimers.get(key);
  if (!existing) return;
  clearInterval(existing.id);
  const nextId = setInterval(existing.tick, existing.ms);
  autoplayTimers.set(key, { ...existing, id: nextId });
}

function bindSwipe(el, onLeft, onRight) {
  if (!el) return;
  let startX = 0;
  let startY = 0;
  el.addEventListener('touchstart', ev => {
    const t = ev.touches?.[0];
    if (!t) return;
    startX = t.clientX;
    startY = t.clientY;
  }, { passive: true });
  el.addEventListener('touchend', ev => {
    const t = ev.changedTouches?.[0];
    if (!t) return;
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) onLeft();
      else onRight();
    }
  }, { passive: true });
}

function startAutoCarousels() {
  stopAutoCarousels();
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  const slideshowEl = document.querySelector('[data-slideshow="home"]');
  if (slideshowEl && (siteData.galleries.homeCommunity || []).length > 1) {
    const key = 'slideshow:home';
    slideshowEl.addEventListener('mouseenter', () => pausedCarousels.add(key));
    slideshowEl.addEventListener('mouseleave', () => pausedCarousels.delete(key));
    slideshowEl.addEventListener('focusin', () => pausedCarousels.add(key));
    slideshowEl.addEventListener('focusout', () => pausedCarousels.delete(key));
    bindSwipe(
      slideshowEl,
      () => { syncSlideshowUI(slideshowIdx + 1, true); resetCarouselTimer(key); },
      () => { syncSlideshowUI(slideshowIdx - 1, true); resetCarouselTimer(key); }
    );
    if (!reduced) {
      const tick = () => { if (canAutoplay(key)) syncSlideshowUI(slideshowIdx + 1, true); };
      autoplayTimers.set(key, { id: setInterval(tick, 4000), tick, ms: 4000 });
    }
  }

  document.querySelectorAll('[data-carousel]').forEach(el => {
    const id = el.getAttribute('data-carousel');
    const key = `carousel:${id}`;
    el.addEventListener('mouseenter', () => pausedCarousels.add(key));
    el.addEventListener('mouseleave', () => pausedCarousels.delete(key));
    el.addEventListener('focusin', () => pausedCarousels.add(key));
    el.addEventListener('focusout', () => pausedCarousels.delete(key));
    bindSwipe(
      el,
      () => { syncCarouselUI(id, (carouselIndex.get(id) || 0) + 1, true); resetCarouselTimer(key); },
      () => { syncCarouselUI(id, (carouselIndex.get(id) || 0) - 1, true); resetCarouselTimer(key); }
    );
    if (!reduced) {
      const tick = () => {
        if (canAutoplay(key)) syncCarouselUI(id, (carouselIndex.get(id) || 0) + 1, true);
      };
      autoplayTimers.set(key, { id: setInterval(tick, 5000), tick, ms: 5000 });
    }
  });
}

function observeReveals() {
  revealObserver?.disconnect();
  const els = [...document.querySelectorAll('[data-reveal]')];
  if (!els.length) return;
  if (typeof IntersectionObserver === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
    els.forEach(el => el.classList.add('is-revealed'));
    return;
  }
  revealObserver = new IntersectionObserver(entries => {
    let stagger = 0;
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.style.transitionDelay = `${Math.min(stagger, 3) * 55}ms`;
      entry.target.classList.add('is-revealed');
      revealObserver.unobserve(entry.target);
      stagger += 1;
    }
  }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });
  els.forEach(el => revealObserver.observe(el));
}

function renderApp(opts = {}) {
  const silent = Boolean(opts?.silent);
  const savedScrollY = silent ? window.scrollY : null;
  stopAutoCarousels();
  const route = parseRoute();
  const bagCount = bag.reduce((sum, item) => sum + Number(item.qty || 1), 0);

  document.getElementById('site-header-root').innerHTML = headerMarkup(siteData, route, bagCount);
  const main = document.getElementById('main');
  const footer = document.getElementById('footer');

  if (route.page === 'admin') {
    footer.hidden = true;
    renderAdminStudio(main, {
      authenticated: adminSession.authenticated,
      demoPasscodeHint: adminSession.demoPasscodeHint,
      data: siteData,
      routeTab: route.id || 'content',
      onAuthChange: async () => {
        adminSession = await checkAdminSession();
        renderApp();
      },
      onSaveData: async next => {
        const res = await saveSiteContent(next);
        if (res.ok) siteData = normalizeContent(res.data || next);
        return res;
      },
      onToast: showToast,
      onOpenPreviewModal: openPreviewModal
    });
  } else {
    footer.hidden = false;
    main.classList.remove('is-entering');
    main.innerHTML = renderRouteView(siteData, route, { bag, checkoutState });
    if (!silent) {
      void main.offsetWidth;
      main.classList.add('is-entering');
    }
    footer.innerHTML = footerMarkup(siteData);
    if (slideshowIdx > 0) syncSlideshowUI(slideshowIdx, false);
    if (silent) {
      document.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('is-revealed'));
    } else {
      observeReveals();
    }
    startAutoCarousels();
  }

  updateDocumentTitle(route);
  liveEditor.sync();
  if (savedScrollY !== null) window.scrollTo({ top: savedScrollY, behavior: 'instant' });
}

// Global event delegation
document.addEventListener('click', ev => {
  const dropdown = document.querySelector('[data-dropdown]');
  const moreBtn = ev.target.closest?.('[data-action="toggle-more-menu"]');
  if (moreBtn && dropdown) {
    const menu = dropdown.querySelector('.nav-dropdown-menu');
    const nextOpen = menu.hidden;
    menu.hidden = !nextOpen;
    dropdown.classList.toggle('is-open', nextOpen);
    moreBtn.setAttribute('aria-expanded', String(nextOpen));
    return;
  }
  if (dropdown && !ev.target.closest?.('[data-dropdown]')) {
    const menu = dropdown.querySelector('.nav-dropdown-menu');
    if (menu) menu.hidden = true;
    dropdown.classList.remove('is-open');
  }

  const mobileBtn = ev.target.closest?.('[data-action="toggle-mobile-menu"]');
  if (mobileBtn) {
    const menu = document.getElementById('mobile-menu');
    const open = menu.hidden;
    menu.hidden = !open;
    mobileBtn.setAttribute('aria-expanded', String(open));
    return;
  }

  if (ev.target.closest?.('#mobile-menu a')) {
    const menu = document.getElementById('mobile-menu');
    if (menu) menu.hidden = true;
  }

  const filterBtn = ev.target.closest?.('[data-event-filter]');
  if (filterBtn) {
    const mode = filterBtn.getAttribute('data-event-filter');
    document.querySelectorAll('[data-event-filter]').forEach(b => b.classList.toggle('is-active', b === filterBtn));
    document.querySelectorAll('.event-card').forEach(card => {
      const st = card.getAttribute('data-event-status');
      card.hidden = mode !== 'all' && (mode === 'open' ? st !== 'open' : st === 'open');
    });
    return;
  }

  const actionEl = ev.target.closest?.('[data-action]');
  if (actionEl) {
    const act = actionEl.getAttribute('data-action');
    if (act === 'open-bag') { openBag(); return; }
    if (act === 'close-bag') { closeBag(); return; }
    if (act === 'close-modal') {
      const modal = document.getElementById('app-modal');
      modal?.classList.remove('is-lightbox');
      modal?.close();
      return;
    }
    if (act === 'lightbox-prev') { stepLightbox(-1); return; }
    if (act === 'lightbox-next') { stepLightbox(1); return; }
    if (act === 'open-lightbox') {
      const src = actionEl.getAttribute('data-src') || actionEl.getAttribute('src');
      const caption = actionEl.getAttribute('data-caption') || actionEl.getAttribute('alt') || '';
      const group = actionEl.getAttribute('data-lightbox-group') || '';
      const idx = Number(actionEl.getAttribute('data-lightbox-idx') || 0);
      if (src) openLightbox(src, caption, group, idx);
      return;
    }
    if (act === 'enroll-course') {
      const cid = actionEl.getAttribute('data-course-id');
      const course = siteData.courses.find(c => c.id === cid);
      if (course) {
        checkoutState.confirmedOrder = null;
        checkoutState.failedMessage = '';
        if (!bag.some(b => b.id === course.id)) {
          bag.push({ id: course.id, name: course.name, price: course.price, qty: 1, note: course.subtitle });
          saveBag();
        }
        closeBag();
        location.hash = '#checkout';
      }
      return;
    }
    if (act === 'book-session') {
      checkoutState.confirmedOrder = null;
      checkoutState.failedMessage = '';
      if (!bag.some(b => b.id === 'one-on-1')) {
        const numeric = Number(String(siteData.oneOnOne.priceLabel || '1600').replace(/[^0-9]/g, '')) || 1600;
        bag.push({
          id: 'one-on-1',
          name: siteData.oneOnOne.title || '1:1 Tailored Embroidery Session',
          price: numeric,
          qty: 1,
          note: `${siteData.oneOnOne.duration} · ${siteData.oneOnOne.badge}`
        });
        saveBag();
      }
      closeBag();
      location.hash = '#checkout';
      return;
    }
    if (act === 'remove-bag-item') {
      bag.splice(Number(actionEl.getAttribute('data-idx')), 1);
      saveBag();
      renderApp();
      renderBag();
      return;
    }
    if (act === 'bag-qty') {
      const idx = Number(actionEl.getAttribute('data-idx'));
      const delta = Number(actionEl.getAttribute('data-delta'));
      if (bag[idx]) {
        const nextQty = Number(bag[idx].qty || 1) + delta;
        if (nextQty <= 0) bag.splice(idx, 1);
        else bag[idx].qty = Math.min(5, nextQty);
        saveBag();
        renderApp();
        renderBag();
      }
      return;
    }
    if (act === 'upgrade-wizard-plus') {
      const wp = (siteData.courses || []).find(c => c.id === 'wizard-plus');
      if (wp) {
        const idx = bag.findIndex(i => i.id === 'wizard');
        if (idx >= 0) bag[idx] = { id: wp.id, name: wp.name, price: wp.price, qty: bag[idx].qty || 1, note: wp.subtitle };
        saveBag();
        renderApp();
        renderBag();
        showToast('Upgraded to Wizard Plus!');
      }
      return;
    }
    if (act === 'apply-coupon') {
      const input = document.querySelector('[data-coupon-input]');
      const code = String(input?.value || '').trim();
      checkoutState.couponError = '';
      if (!code) {
        checkoutState.couponError = 'Enter a promo code first.';
        renderApp();
        return;
      }
      applyCheckoutCoupon({ code, items: bag.map(b => ({ id: b.id, qty: b.qty || 1 })) })
        .then(res => {
          checkoutState.coupon = res;
          checkoutState.couponError = '';
          renderApp();
          showToast(res.message || 'Promo applied!');
        })
        .catch(err => {
          checkoutState.coupon = null;
          checkoutState.couponError = err?.message || 'Invalid promo code.';
          renderApp();
        });
      return;
    }
    if (act === 'clear-coupon') {
      checkoutState.coupon = null;
      checkoutState.couponError = '';
      renderApp();
      return;
    }
    if (act === 'copy-order-id') {
      const oid = actionEl.getAttribute('data-order-id') || '';
      navigator.clipboard?.writeText(oid).then(() => showToast('Order ID copied!'));
      return;
    }
    if (act === 'print-receipt') {
      window.print();
      return;
    }
    if (act === 'event-rsvp') {
      const slug = actionEl.getAttribute('data-event-slug');
      const eventObj = siteData.events.find(x => x.slug === slug);
      openEventWaitlistModal(eventObj ? `Waitlist / RSVP: ${eventObj.title}` : 'Event RSVP');
      return;
    }
  }

  const prevC = ev.target.closest?.('[data-carousel-prev]');
  if (prevC) {
    const id = prevC.getAttribute('data-carousel-prev');
    syncCarouselUI(id, (carouselIndex.get(id) || 0) - 1, true);
    resetCarouselTimer(`carousel:${id}`);
    return;
  }
  const nextC = ev.target.closest?.('[data-carousel-next]');
  if (nextC) {
    const id = nextC.getAttribute('data-carousel-next');
    syncCarouselUI(id, (carouselIndex.get(id) || 0) + 1, true);
    resetCarouselTimer(`carousel:${id}`);
    return;
  }
  const dotC = ev.target.closest?.('[data-carousel-dot]');
  if (dotC) {
    const id = dotC.getAttribute('data-carousel-dot');
    syncCarouselUI(id, Number(dotC.getAttribute('data-index')), true);
    resetCarouselTimer(`carousel:${id}`);
    return;
  }

  if (ev.target.closest?.('[data-slideshow-prev]')) {
    syncSlideshowUI(slideshowIdx - 1, true);
    resetCarouselTimer('slideshow:home');
    return;
  }
  if (ev.target.closest?.('[data-slideshow-next]')) {
    syncSlideshowUI(slideshowIdx + 1, true);
    resetCarouselTimer('slideshow:home');
    return;
  }
  const dotS = ev.target.closest?.('[data-slideshow-dot]');
  if (dotS) {
    syncSlideshowUI(Number(dotS.getAttribute('data-index')), true);
    resetCarouselTimer('slideshow:home');
  }
});

document.addEventListener('keydown', ev => {
  const modal = document.getElementById('app-modal');
  if (!modal?.open || !lightboxState.list.length || !modal.classList.contains('is-lightbox')) return;
  if (ev.key === 'ArrowLeft') stepLightbox(-1);
  else if (ev.key === 'ArrowRight') stepLightbox(1);
});

document.getElementById('drawer-backdrop')?.addEventListener('click', closeBag);
document.getElementById('app-modal')?.addEventListener('click', ev => {
  if (ev.target === ev.currentTarget) {
    ev.currentTarget.classList.remove('is-lightbox');
    ev.currentTarget.close();
  }
});

document.addEventListener('submit', async ev => {
  const form = ev.target.closest?.('[data-form]');
  if (!form) return;
  ev.preventDefault();
  const kind = form.getAttribute('data-form');
  const fd = new FormData(form);
  const payload = Object.fromEntries(fd.entries());

  if (kind === 'checkout') {
    checkoutState.formValues = { ...payload };
    checkoutState.failedMessage = '';
    const items = bag.map(b => ({ id: b.id, qty: b.qty || 1 }));
    try {
      const created = await createCheckoutOrder({
        items,
        customer: payload,
        paymentMethod: payload.paymentMethod || 'paytm',
        couponCode: checkoutState.coupon?.code || ''
      });

      if (payload.paymentMethod === 'manual') {
        checkoutState.confirmedOrder = created.order;
        checkoutState.coupon = null;
        bag = [];
        saveBag();
        renderApp();
        showToast('Manual enrollment request received!');
        return;
      }

      openFakePaymentDialog(created, async outcome => {
        try {
          const completed = await completeTestPayment(created.orderId, outcome);
          if (completed?.order?.paymentStatus === 'paid') {
            checkoutState.confirmedOrder = completed.order;
            checkoutState.failedMessage = '';
            checkoutState.formValues = {};
            checkoutState.coupon = null;
            bag = [];
            saveBag();
            renderApp();
            showToast('Payment successful!');
          } else {
            checkoutState.failedMessage = 'Payment Failed. You can try again or switch to Manual Payment.';
            renderApp();
            showToast('Payment failed.', true);
          }
        } catch (err) {
          showToast(err?.message || 'Could not update payment.', true);
        }
      });
    } catch (err) {
      showToast(err?.message || 'Could not start checkout.', true);
    }
    return;
  }

  if (kind === 'rsvp') {
    await submitPublicForm('rsvp', payload);
    document.getElementById('app-modal')?.close();
    showToast('Waitlist / RSVP submitted!');
    return;
  }

  await submitPublicForm(kind, payload);
  form.reset();
  const statusEl = form.querySelector(`[data-form-status="${kind}"]`);
  const successMsg = kind === 'newsletter' ? siteData.footer.newsletterSuccess : siteData.contact.successMessage;
  if (statusEl) {
    statusEl.textContent = successMsg || 'Thanks for submitting!';
    statusEl.hidden = false;
  }
  showToast(successMsg || 'Thanks for submitting!');
});

document.addEventListener('change', ev => {
  const radio = ev.target.closest?.('[data-form="checkout"] input[name="paymentMethod"]');
  if (!radio) return;
  const submitBtn = document.querySelector('[data-checkout-submit]');
  if (!submitBtn) return;
  const subtotal = bag.reduce((s, i) => s + Number(i.price || 0) * Number(i.qty || 1), 0);
  const disc = checkoutState.coupon?.valid ? Math.round((subtotal * Number(checkoutState.coupon.discountPercent || 0)) / 100) : 0;
  const total = Math.max(1, subtotal - disc);
  submitBtn.textContent = radio.value === 'manual'
    ? `Request Manual Payment · ${formatINR(total)}`
    : `Pay ${formatINR(total)}`;
});

window.addEventListener('hashchange', () => {
  if (parseRoute().page !== 'checkout') {
    checkoutState.failedMessage = '';
  }
  window.scrollTo({ top: 0, behavior: 'instant' });
  renderApp();
});

async function init() {
  const [loaded, session] = await Promise.all([
    loadSiteContent(),
    checkAdminSession()
  ]);
  siteData = normalizeContent(loaded.data || DEFAULT_CONTENT);
  adminSession = session;
  renderApp();

  const isLocalHost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  subscribeSiteContent(nextData => {
    siteData = normalizeContent(nextData || DEFAULT_CONTENT);
    const active = document.activeElement;
    const isEditingField = Boolean(
      active && (active.matches('input, textarea, select') || active.isContentEditable)
    );
    if (parseRoute().page === 'admin' && isEditingField) return;
    renderApp({ silent: true });
  }, { enableServerStream: loaded.source === 'server' || isLocalHost });
}

init();
