import {
  DEFAULT_CONTENT,
  escapeHTML as e,
  formatINR,
  normalizeContent,
  safeImage
} from '../shared/site-content.js';
import {
  loadSiteContent,
  submitPublicForm,
  subscribeSiteContent
} from '../shared/storage.js';
import {
  applyCheckoutCoupon,
  completeTestPayment,
  createCheckoutOrder
} from '../shared/paytm-checkout.js';
import {
  footerMarkup,
  headerMarkup,
  itemThumbnail,
  mobileMoreMarkup,
  mobileTabbarMarkup,
  renderRouteView
} from './views.js';

const BAG_KEY = 'ycswu-bag-v1';
const CHEV_L = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>`;
const CHEV_R = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>`;

let siteData = normalizeContent(DEFAULT_CONTENT);
let bag = loadBag();
let checkoutState = { confirmedOrder: null, failedMessage: '', formValues: {}, coupon: null, couponError: '' };
const carouselIndex = new Map();
let slideshowIdx = 0;
let autoplayTimers = new Map();
let pausedCarousels = new Set();
let revealObserver = null;
let lightboxState = { list: [], index: 0 };
let scrollRaf = 0;

function loadBag() {
  try {
    const parsed = JSON.parse(localStorage.getItem(BAG_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveBag() {
  try { localStorage.setItem(BAG_KEY, JSON.stringify(bag)); } catch { /* ignore */ }
}

function parseRoute(hash = location.hash) {
  const clean = String(hash || '#home').replace(/^#\/?/, '').split('?')[0].trim();
  if (!clean) return { page: 'home', id: '' };
  const [head, ...rest] = clean.split('/');
  const allowed = new Set([
    'home', 'about', 'events', 'event', '1-on-1', 'courses',
    'wizard-plus', 'wizard', 'checkout', 'contact', 'terms', 'privacy',
    'shipping', 'usage-guidelines', 'site-rules'
  ]);
  return allowed.has(head) ? { page: head, id: rest.join('/') } : { page: 'home', id: '' };
}

function showToast(msg, isError = false) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle('is-error', Boolean(isError));
  el.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { el.hidden = true; }, 3200);
}

function updateScrollEffects() {
  scrollRaf = 0;
  const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const progress = Math.min(1, Math.max(0, window.scrollY / maxScroll));
  const bar = document.getElementById('scroll-progress');
  if (bar) bar.style.setProperty('--scroll-p', progress.toFixed(4));

  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const field = document.querySelector('.hero-polaroid-field');
  if (field) {
    if (window.innerWidth > 1140 && !reduced) {
      const spread = Math.min(1.4, Math.max(0, window.scrollY / 280));
      field.style.setProperty('--spread', spread.toFixed(3));
    } else {
      field.style.setProperty('--spread', '0');
    }
  }
}

function onScroll() {
  if (scrollRaf) return;
  scrollRaf = requestAnimationFrame(updateScrollEffects);
}

window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll, { passive: true });

function closeDrawers() {
  document.getElementById('drawer-backdrop')?.setAttribute('hidden', '');
  for (const id of ['bag-drawer', 'mobile-more-sheet']) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.classList.remove('is-open');
    el.setAttribute('aria-hidden', 'true');
  }
}

function openBag() {
  closeDrawers();
  renderBag();
  document.getElementById('drawer-backdrop')?.removeAttribute('hidden');
  const drawer = document.getElementById('bag-drawer');
  drawer?.classList.add('is-open');
  drawer?.setAttribute('aria-hidden', 'false');
}

function openMoreSheet() {
  closeDrawers();
  const body = document.getElementById('more-sheet-body');
  if (body) body.innerHTML = mobileMoreMarkup(siteData, parseRoute());
  document.getElementById('drawer-backdrop')?.removeAttribute('hidden');
  const sheet = document.getElementById('mobile-more-sheet');
  sheet?.classList.add('is-open');
  sheet?.setAttribute('aria-hidden', 'false');
}

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
    body.innerHTML = `<p class="muted" style="margin:0">Your bag is empty. Add a course or session:</p>
      ${wizPlus ? `<div class="bag-item">
        <img class="bag-item-thumb" src="${e(itemThumbnail(siteData, wizPlus.id))}" alt="">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <div><strong>${e(wizPlus.name)}</strong><div class="small muted tabular">${e(formatINR(wizPlus.price))}</div></div>
          <button type="button" class="btn-lime btn-sm" data-action="enroll-course" data-course-id="${e(wizPlus.id)}">Add</button>
        </div>
      </div>` : ''}
      ${wiz ? `<div class="bag-item">
        <img class="bag-item-thumb" src="${e(itemThumbnail(siteData, wiz.id))}" alt="">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <div><strong>${e(wiz.name)}</strong><div class="small muted tabular">${e(formatINR(wiz.price))}</div></div>
          <button type="button" class="btn btn-outline btn-sm" data-action="enroll-course" data-course-id="${e(wiz.id)}">Add</button>
        </div>
      </div>` : ''}
      <div class="bag-item">
        <img class="bag-item-thumb" src="${e(itemThumbnail(siteData, 'one-on-1'))}" alt="">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <div><strong>1:1 Session</strong><div class="small muted">${e(siteData.oneOnOne.priceLabel)}</div></div>
          <button type="button" class="btn btn-dark btn-sm" data-action="book-session">Book</button>
        </div>
      </div>`;
    return;
  }

  const total = bag.reduce((s, i) => s + Number(i.price || 0) * Number(i.qty || 1), 0);
  const hasWizardOnly = bag.some(i => i.id === 'wizard') && !bag.some(i => i.id === 'wizard-plus');

  body.innerHTML = `${bag.map((item, idx) => `<div class="bag-item">
    <img class="bag-item-thumb" src="${e(itemThumbnail(siteData, item.id))}" alt="">
    <div>
      <strong>${e(item.name)}</strong>
      <div class="small muted">${e(item.note || '')}</div>
      <div class="bag-item-controls">
        <div class="qty-stepper">
          <button type="button" data-action="bag-qty" data-idx="${idx}" data-delta="-1" aria-label="Decrease">−</button>
          <span class="tabular">${e(item.qty || 1)}</span>
          <button type="button" data-action="bag-qty" data-idx="${idx}" data-delta="1" aria-label="Increase">+</button>
        </div>
        <span class="small tabular" style="font-weight:700">${e(formatINR(Number(item.price) * Number(item.qty || 1)))}</span>
        <button type="button" class="text-link small" data-action="remove-bag-item" data-idx="${idx}">Remove</button>
      </div>
    </div>
  </div>`).join('')}
  ${hasWizardOnly ? `<div class="bag-upsell">
    <strong>Upgrade to Wizard Plus (+₹1,000)</strong>
    <span>Includes 30+ modules, needle painting, personal mentorship &amp; 15% off Hoopables.</span>
    <button type="button" class="btn btn-dark btn-sm" data-action="upgrade-wizard-plus">Upgrade Bag</button>
  </div>` : ''}`;

  foot.hidden = false;
  foot.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:baseline">
    <span class="muted small">Subtotal</span>
    <strong class="tabular" style="font-size:1.35rem">${e(formatINR(total))}</strong>
  </div>
  <button type="button" class="btn-lime" style="width:100%;justify-content:center" data-action="go-checkout">
    <span>Proceed to Checkout</span><span class="btn-lime-circle">→</span>
  </button>`;
}

function syncSlideshowUI(nextIdx, animate = false) {
  const photos = siteData.galleries.homeCommunity || [];
  const img = document.querySelector('[data-slide-img]');
  const counter = document.querySelector('[data-slide-counter]');
  if (!photos.length || !img) return;
  slideshowIdx = ((nextIdx % photos.length) + photos.length) % photos.length;
  const target = photos[slideshowIdx];
  const src = safeImage(target.src);
  const cap = target.caption || `Community snapshot #${slideshowIdx + 1}`;
  if (animate) img.classList.add('is-fading');
  img.src = src;
  img.alt = cap;
  img.setAttribute('data-src', src);
  img.setAttribute('data-caption', cap);
  img.setAttribute('data-lightbox-idx', String(slideshowIdx));
  if (counter) counter.textContent = `${slideshowIdx + 1}/${photos.length}`;
  document.querySelectorAll('[data-slide-to]').forEach((b, i) => b.classList.toggle('is-active', i === slideshowIdx));
  if (animate) setTimeout(() => img.classList.remove('is-fading'), 200);
}

function syncCarouselUI(id, nextIdx, animate = false) {
  const list = id === 'home-meetups' ? siteData.testimonials.meetups : siteData.testimonials.learners;
  const host = document.querySelector(`[data-carousel="${id}"]`);
  if (!list.length || !host) return;
  const safe = ((nextIdx % list.length) + list.length) % list.length;
  carouselIndex.set(id, safe);
  host.querySelectorAll('[data-carousel-slot]').forEach(slotEl => {
    const slot = Number(slotEl.getAttribute('data-carousel-slot') || 0);
    const item = list[(safe + slot) % list.length];
    const q = slotEl.querySelector('[data-slot-quote]');
    const a = slotEl.querySelector('[data-slot-author]');
    if (animate && q) q.classList.add('is-swapping');
    if (q) q.textContent = item.quote;
    if (a) a.textContent = item.author;
    if (animate && q) setTimeout(() => q.classList.remove('is-swapping'), 180);
  });
  host.querySelectorAll('[data-carousel-dot]').forEach((d, i) => d.classList.toggle('is-active', i === safe));
}

function stopCarousels() {
  for (const t of autoplayTimers.values()) clearInterval(t.id);
  autoplayTimers.clear();
  pausedCarousels.clear();
}

function bindSwipe(el, onLeft, onRight) {
  let x0 = 0;
  let y0 = 0;
  el.addEventListener('touchstart', ev => {
    const t = ev.changedTouches?.[0];
    if (t) { x0 = t.clientX; y0 = t.clientY; }
  }, { passive: true });
  el.addEventListener('touchend', ev => {
    const t = ev.changedTouches?.[0];
    if (!t) return;
    const dx = t.clientX - x0;
    const dy = t.clientY - y0;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) onLeft();
      else onRight();
    }
  }, { passive: true });
}

function startCarousels() {
  stopCarousels();
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const slideEl = document.querySelector('[data-slideshow]');
  if (slideEl) {
    const key = 'slide';
    slideEl.addEventListener('mouseenter', () => pausedCarousels.add(key));
    slideEl.addEventListener('mouseleave', () => pausedCarousels.delete(key));
    bindSwipe(slideEl, () => syncSlideshowUI(slideshowIdx + 1, true), () => syncSlideshowUI(slideshowIdx - 1, true));
    if (!reduced) {
      autoplayTimers.set(key, {
        id: setInterval(() => { if (!pausedCarousels.has(key) && !document.hidden) syncSlideshowUI(slideshowIdx + 1, true); }, 4200)
      });
    }
  }
  document.querySelectorAll('[data-carousel]').forEach(el => {
    const id = el.getAttribute('data-carousel');
    const key = `c:${id}`;
    el.addEventListener('mouseenter', () => pausedCarousels.add(key));
    el.addEventListener('mouseleave', () => pausedCarousels.delete(key));
    bindSwipe(el, () => syncCarouselUI(id, (carouselIndex.get(id) || 0) + 1, true), () => syncCarouselUI(id, (carouselIndex.get(id) || 0) - 1, true));
    if (!reduced) {
      autoplayTimers.set(key, {
        id: setInterval(() => { if (!pausedCarousels.has(key) && !document.hidden) syncCarouselUI(id, (carouselIndex.get(id) || 0) + 1, true); }, 5200)
      });
    }
  });
}

function observeReveals(instant = false) {
  revealObserver?.disconnect();
  const targets = [...document.querySelectorAll('.char-reveal, [data-reveal], .polaroid-inset')];
  if (!targets.length) return;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  if (instant || reduced || typeof IntersectionObserver === 'undefined') {
    targets.forEach(el => el.classList.add('is-revealed'));
    return;
  }
  revealObserver = new IntersectionObserver(entries => {
    let idx = 0;
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.style.setProperty('--stagger', String(Math.min(idx, 5)));
      entry.target.classList.add('is-revealed');
      revealObserver.unobserve(entry.target);
      idx += 1;
    }
  }, { threshold: 0.08, rootMargin: '0px 0px -16px 0px' });
  targets.forEach(el => revealObserver.observe(el));
}

function renderLightbox() {
  const modal = document.getElementById('app-modal');
  if (!modal || !lightboxState.list.length) return;
  const item = lightboxState.list[lightboxState.index];
  modal.classList.add('is-lightbox');
  modal.innerHTML = `<div class="modal-inner">
    <div class="lightbox-head">
      <span class="small">${e(item.caption)} (${lightboxState.index + 1}/${lightboxState.list.length})</span>
      <button type="button" class="icon-close" data-action="close-modal" aria-label="Close" style="background:#1a2e32;color:#fff;border-color:#41595e">✕</button>
    </div>
    <div class="lightbox-stage">
      <button type="button" class="lightbox-nav prev" data-action="lightbox-prev" aria-label="Previous">${CHEV_L}</button>
      <img class="lightbox-img" src="${e(safeImage(item.src))}" alt="${e(item.caption)}">
      <button type="button" class="lightbox-nav next" data-action="lightbox-next" aria-label="Next">${CHEV_R}</button>
    </div>
  </div>`;
  if (!modal.open) modal.showModal();
}

function openLightbox(src, caption = '', group = '', startIdx = 0) {
  const groupList = siteData.galleries?.[group];
  if (Array.isArray(groupList) && groupList.length) {
    lightboxState = {
      list: groupList.map((g, i) => ({ src: g.src, caption: g.caption || `Photo #${i + 1}` })),
      index: ((Number(startIdx) % groupList.length) + groupList.length) % groupList.length
    };
  } else {
    lightboxState = { list: [{ src, caption }], index: 0 };
  }
  renderLightbox();
}

function openPaymentDialog(initResult) {
  const modal = document.getElementById('app-modal');
  if (!modal) return;
  modal.classList.remove('is-lightbox');
  modal.innerHTML = `<div class="modal-inner">
    <p class="eyebrow">Test Payment Gateway</p>
    <h2 style="font-weight:800;margin:0 0 8px">Simulate Payment Result</h2>
    <p class="small muted" style="margin:0 0 16px">Order <strong>${e(initResult.orderId)}</strong> · <strong>${e(formatINR(initResult.amount))}</strong></p>
    <div style="display:grid;gap:10px">
      <button type="button" class="btn-lime" style="justify-content:center" data-sim="paid">Simulate Payment Successful</button>
      <button type="button" class="btn btn-outline" data-sim="failed">Simulate Payment Failed</button>
      <button type="button" class="text-link small" data-action="close-modal" style="justify-self:start">Cancel</button>
    </div>
  </div>`;
  modal.showModal();
  modal.querySelectorAll('[data-sim]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const outcome = btn.getAttribute('data-sim');
      modal.close();
      try {
        const done = await completeTestPayment(initResult.orderId, outcome);
        if (done?.order?.paymentStatus === 'paid') {
          checkoutState = { confirmedOrder: done.order, failedMessage: '', formValues: {}, coupon: null, couponError: '' };
          bag = [];
          saveBag();
          renderApp();
          showToast('Payment successful!');
        } else {
          checkoutState.failedMessage = 'Payment Failed. You can retry or switch to Manual Payment.';
          renderApp();
          showToast('Payment failed.', true);
        }
      } catch (err) {
        showToast(err?.message || 'Payment update failed.', true);
      }
    });
  });
}

function renderApp(opts = {}) {
  const silent = Boolean(opts?.silent);
  const savedY = silent ? window.scrollY : null;
  stopCarousels();
  const route = parseRoute();
  const bagCount = bag.reduce((s, i) => s + Number(i.qty || 1), 0);

  document.getElementById('site-header-root').innerHTML = headerMarkup(siteData, route, bagCount);
  document.getElementById('mobile-tabbar-root').innerHTML = mobileTabbarMarkup(siteData, route, bagCount);

  const main = document.getElementById('main');
  const footer = document.getElementById('footer');
  main.innerHTML = renderRouteView(siteData, route, { bag, checkoutState });
  footer.innerHTML = footerMarkup(siteData);
  document.title = `${siteData.brand.name} · Studio`;
  if (slideshowIdx > 0) syncSlideshowUI(slideshowIdx, false);
  observeReveals(silent);
  startCarousels();
  requestAnimationFrame(updateScrollEffects);
  if (savedY !== null) window.scrollTo({ top: savedY, behavior: 'instant' });
}

document.addEventListener('click', async ev => {
  const dropdown = document.querySelector('[data-dropdown]');
  const moreBtn = ev.target.closest?.('[data-action="toggle-more-menu"]');
  if (moreBtn && dropdown) {
    const menu = dropdown.querySelector('.nav-dropdown-menu');
    const nextOpen = menu.hidden;
    menu.hidden = !nextOpen;
    moreBtn.setAttribute('aria-expanded', String(nextOpen));
    return;
  }
  if (dropdown && !ev.target.closest?.('[data-dropdown]')) {
    const menu = dropdown.querySelector('.nav-dropdown-menu');
    if (menu) menu.hidden = true;
  }

  if (ev.target.id === 'drawer-backdrop' || ev.target.closest?.('[data-action="close-drawers"]') || ev.target.closest?.('#mobile-more-sheet a')) {
    closeDrawers();
    return;
  }

  const railBtn = ev.target.closest?.('[data-rail-scroll]');
  if (railBtn) {
    const rail = document.getElementById('showcase-rail');
    rail?.scrollBy({ left: Number(railBtn.getAttribute('data-rail-scroll') || 340), behavior: 'smooth' });
    return;
  }

  const filterBtn = ev.target.closest?.('[data-event-filter]');
  if (filterBtn) {
    const mode = filterBtn.getAttribute('data-event-filter');
    document.querySelectorAll('[data-event-filter]').forEach(b => b.classList.toggle('is-active', b === filterBtn));
    document.querySelectorAll('.event-card').forEach(c => {
      const st = c.getAttribute('data-event-status');
      c.hidden = mode !== 'all' && (mode === 'open' ? st !== 'open' : st === 'open');
    });
    return;
  }

  const slideBtn = ev.target.closest?.('[data-slide]');
  if (slideBtn) { syncSlideshowUI(slideshowIdx + Number(slideBtn.getAttribute('data-slide') || 1), true); return; }
  const slideTo = ev.target.closest?.('[data-slide-to]');
  if (slideTo) { syncSlideshowUI(Number(slideTo.getAttribute('data-slide-to') || 0), true); return; }

  const cPrev = ev.target.closest?.('[data-carousel-prev]');
  if (cPrev) { const id = cPrev.getAttribute('data-carousel-prev'); syncCarouselUI(id, (carouselIndex.get(id) || 0) - 1, true); return; }
  const cNext = ev.target.closest?.('[data-carousel-next]');
  if (cNext) { const id = cNext.getAttribute('data-carousel-next'); syncCarouselUI(id, (carouselIndex.get(id) || 0) + 1, true); return; }
  const cDot = ev.target.closest?.('[data-carousel-dot]');
  if (cDot) { syncCarouselUI(cDot.getAttribute('data-carousel-dot'), Number(cDot.getAttribute('data-index') || 0), true); return; }

  const actEl = ev.target.closest?.('[data-action]');
  if (!actEl) return;
  const act = actEl.getAttribute('data-action');
  if (act === 'open-bag') { openBag(); return; }
  if (act === 'open-more-sheet') { openMoreSheet(); return; }
  if (act === 'close-modal') {
    const modal = document.getElementById('app-modal');
    modal?.classList.remove('is-lightbox');
    modal?.close();
    return;
  }
  if (act === 'lightbox-prev' && lightboxState.list.length) {
    lightboxState.index = (lightboxState.index - 1 + lightboxState.list.length) % lightboxState.list.length;
    renderLightbox();
    return;
  }
  if (act === 'lightbox-next' && lightboxState.list.length) {
    lightboxState.index = (lightboxState.index + 1) % lightboxState.list.length;
    renderLightbox();
    return;
  }
  if (act === 'open-lightbox') {
    openLightbox(actEl.getAttribute('data-src'), actEl.getAttribute('data-caption') || '', actEl.getAttribute('data-lightbox-group') || '', Number(actEl.getAttribute('data-lightbox-idx') || 0));
    return;
  }
  if (act === 'enroll-course') {
    const cid = actEl.getAttribute('data-course-id');
    const c = (siteData.courses || []).find(x => x.id === cid);
    if (c) {
      checkoutState.confirmedOrder = null;
      checkoutState.failedMessage = '';
      if (!bag.some(b => b.id === c.id)) {
        bag.push({ id: c.id, name: c.name, price: c.price, qty: 1, note: c.subtitle });
        saveBag();
      }
      closeDrawers();
      location.hash = '#checkout';
    }
    return;
  }
  if (act === 'book-session') {
    checkoutState.confirmedOrder = null;
    checkoutState.failedMessage = '';
    if (!bag.some(b => b.id === 'one-on-1')) {
      const price = Number(String(siteData.oneOnOne.priceLabel || '1600').replace(/[^0-9]/g, '')) || 1600;
      bag.push({ id: 'one-on-1', name: siteData.oneOnOne.title || '1:1 Session', price, qty: 1, note: siteData.oneOnOne.duration });
      saveBag();
    }
    closeDrawers();
    location.hash = '#checkout';
    return;
  }
  if (act === 'go-checkout') { closeDrawers(); location.hash = '#checkout'; return; }
  if (act === 'bag-qty') {
    const idx = Number(actEl.getAttribute('data-idx'));
    const delta = Number(actEl.getAttribute('data-delta'));
    if (bag[idx]) {
      const nextQ = Number(bag[idx].qty || 1) + delta;
      if (nextQ <= 0) bag.splice(idx, 1);
      else bag[idx].qty = nextQ;
      saveBag();
      renderApp({ silent: true });
      renderBag();
    }
    return;
  }
  if (act === 'remove-bag-item') {
    bag.splice(Number(actEl.getAttribute('data-idx')), 1);
    saveBag();
    renderApp({ silent: true });
    renderBag();
    return;
  }
  if (act === 'upgrade-wizard-plus') {
    const wp = (siteData.courses || []).find(c => c.id === 'wizard-plus');
    if (wp) {
      bag = bag.filter(i => i.id !== 'wizard');
      bag.push({ id: wp.id, name: wp.name, price: wp.price, qty: 1, note: wp.subtitle });
      saveBag();
      renderBag();
      renderApp({ silent: true });
      showToast('Upgraded to Wizard Plus!');
    }
    return;
  }
  if (act === 'apply-coupon') {
    const code = String(document.querySelector('[data-coupon-input]')?.value || '').trim();
    try {
      const res = await applyCheckoutCoupon({ code, items: bag });
      checkoutState.coupon = res.valid ? res : null;
      checkoutState.couponError = '';
      renderApp({ silent: true });
      showToast(`Applied ${res.code} (${res.discountPercent}% off)!`);
    } catch (err) {
      checkoutState.coupon = null;
      checkoutState.couponError = err?.message || 'Invalid promo code.';
      renderApp({ silent: true });
    }
    return;
  }
  if (act === 'clear-coupon') {
    checkoutState.coupon = null;
    checkoutState.couponError = '';
    renderApp({ silent: true });
    return;
  }
  if (act === 'copy-order-id') {
    try { await navigator.clipboard.writeText(actEl.getAttribute('data-order-id') || ''); showToast('Order ID copied!'); } catch { showToast('Copy unavailable.', true); }
    return;
  }
  if (act === 'print-receipt') { window.print(); return; }
  if (act === 'event-rsvp') {
    const slug = actEl.getAttribute('data-event-slug');
    const evObj = (siteData.events || []).find(x => x.slug === slug);
    const modal = document.getElementById('app-modal');
    if (evObj && modal) {
      modal.classList.remove('is-lightbox');
      modal.innerHTML = `<div class="modal-inner">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
          <h2 style="font-weight:800;font-size:1.3rem;margin:0">${evObj.status === 'open' ? 'RSVP' : 'Join Waitlist'}</h2>
          <button type="button" class="icon-close" data-action="close-modal">✕</button>
        </div>
        <form class="form-stack" data-form="rsvp">
          <input type="hidden" name="eventTitle" value="${e(evObj.title)}">
          <label class="field">Your Name<input name="name" required placeholder="Full name"></label>
          <label class="field">Email<input type="email" name="email" required placeholder="you@example.com"></label>
          <label class="field">WhatsApp<input name="phone" required placeholder="+91 ..."></label>
          <button type="submit" class="btn-lime" style="justify-content:center">Submit</button>
        </form>
      </div>`;
      modal.showModal();
    }
  }
});

document.addEventListener('submit', async ev => {
  const form = ev.target.closest?.('form[data-form]');
  if (!form) return;
  ev.preventDefault();
  const kind = form.getAttribute('data-form');
  const payload = Object.fromEntries(new FormData(form).entries());

  if (kind === 'checkout') {
    checkoutState.formValues = payload;
    checkoutState.failedMessage = '';
    try {
      const res = await createCheckoutOrder({
        items: bag,
        customer: payload,
        paymentMethod: payload.paymentMethod || 'paytm',
        couponCode: checkoutState.coupon?.code || ''
      });
      if (payload.paymentMethod === 'manual') {
        checkoutState = { confirmedOrder: res.order, failedMessage: '', formValues: {}, coupon: null, couponError: '' };
        bag = [];
        saveBag();
        renderApp();
        showToast('Manual enrollment request saved!');
        return;
      }
      openPaymentDialog(res);
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
  const st = form.querySelector(`[data-form-status="${kind}"]`);
  const msg = kind === 'newsletter' ? siteData.footer.newsletterSuccess : siteData.contact.successMessage;
  if (st) { st.textContent = msg; st.hidden = false; }
  showToast(msg);
});

document.addEventListener('keydown', ev => {
  const modal = document.getElementById('app-modal');
  if (modal?.open && modal.classList.contains('is-lightbox') && lightboxState.list.length) {
    if (ev.key === 'ArrowLeft') {
      ev.preventDefault();
      lightboxState.index = (lightboxState.index - 1 + lightboxState.list.length) % lightboxState.list.length;
      renderLightbox();
    } else if (ev.key === 'ArrowRight') {
      ev.preventDefault();
      lightboxState.index = (lightboxState.index + 1) % lightboxState.list.length;
      renderLightbox();
    }
  }
  if (ev.key === 'Escape') closeDrawers();
});

window.addEventListener('hashchange', () => {
  closeDrawers();
  window.scrollTo({ top: 0, behavior: 'instant' });
  renderApp();
});

async function init() {
  const loaded = await loadSiteContent();
  siteData = normalizeContent(loaded.data || DEFAULT_CONTENT);
  renderApp();

  const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  subscribeSiteContent(next => {
    siteData = normalizeContent(next || DEFAULT_CONTENT);
    renderApp({ silent: true });
  }, { enableServerStream: loaded.source === 'server' || isLocal });
}

init();
