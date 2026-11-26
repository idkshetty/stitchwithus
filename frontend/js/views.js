import {
  escapeHTML as e,
  formatINR,
  parseKitItems,
  safeImage,
  safeLink
} from './site-content.js';

const CHEVRON_LEFT = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>`;
const CHEVRON_RIGHT = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>`;

const SOCIAL_ICONS = {
  instagram: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>`,
  facebook: `<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5z"/></svg>`,
  youtube: `<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.58 7.19a2.75 2.75 0 0 0-1.94-1.95C17.93 4.78 12 4.78 12 4.78s-5.93 0-7.64.46A2.75 2.75 0 0 0 2.42 7.19 28.6 28.6 0 0 0 2 12a28.6 28.6 0 0 0 .42 4.81 2.75 2.75 0 0 0 1.94 1.95c1.71.46 7.64.46 7.64.46s5.93 0 7.64-.46a2.75 2.75 0 0 0 1.94-1.95A28.6 28.6 0 0 0 22 12a28.6 28.6 0 0 0-.42-4.81zM10 15.25V8.75L15.5 12 10 15.25z"/></svg>`,
  email: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`
};

const TAB_ICONS = {
  home: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5.5v-6h-5v6H4a1 1 0 0 1-1-1z"/></svg>`,
  courses: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5" stroke-dasharray="3 3"/></svg>`,
  events: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>`,
  '1-on-1': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg>`,
  bag: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 7h14l1 14H4L5 7Z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/></svg>`
};

function isActive(route, targets) {
  return targets.includes(route?.page);
}

/** Splits heading copy into per-character animated spans while keeping words intact. */
function splitChars(text = '') {
  let idx = 0;
  return String(text).split('\n').map(line => {
    const words = line.trim().split(/\s+/).filter(Boolean);
    return words.map(word => {
      const chars = [...word].map(ch => {
        const span = `<span class="ch" style="--ci:${idx}">${e(ch)}</span>`;
        idx += 1;
        return span;
      }).join('');
      idx += 1;
      return `<span class="cw">${chars}</span>`;
    }).join(' ');
  }).join('<br>');
}

export function headerMarkup(data, route = { page: 'home' }, bagCount = 0) {
  const n = data.navigation;
  return `<header class="site-header">
    <div class="header-inner">
      <a href="#home" class="brand-script" aria-label="${e(data.brand.name)} home">
        <img class="brand-logo-img" src="${e(safeImage(data.brand.logo, 'assets/images/logo-nav.png'))}" alt="" width="38" height="38">
        <span data-edit="brand.name">${e(data.brand.name)}</span>
      </a>
      <nav class="dark-pill-nav" aria-label="Primary navigation">
        <a href="#courses" class="nav-micro-link ${isActive(route, ['courses']) ? 'is-active' : ''}" data-edit="navigation.courses">${e(n.courses)}</a>
        <a href="#events" class="nav-micro-link ${isActive(route, ['events', 'event']) ? 'is-active' : ''}" data-edit="navigation.events">${e(n.events)}</a>
        <a href="#1-on-1" class="nav-micro-link ${isActive(route, ['1-on-1']) ? 'is-active' : ''}" data-edit="navigation.oneOnOne">${e(n.oneOnOne)}</a>
        <a href="#about" class="nav-micro-link ${isActive(route, ['about']) ? 'is-active' : ''}" data-edit="navigation.about">${e(n.about)}</a>
        <div class="nav-dropdown" data-dropdown>
          <button type="button" class="nav-dropdown-btn" data-action="toggle-more-menu" aria-expanded="false">${e(n.more)} ▾</button>
          <div class="nav-dropdown-menu" hidden>
            <a href="#wizard-plus" class="${isActive(route, ['wizard-plus']) ? 'is-active' : ''}">${e(n.wizardPlus)}</a>
            <a href="#wizard" class="${isActive(route, ['wizard']) ? 'is-active' : ''}">${e(n.wizard)}</a>
            <a href="#contact" class="${isActive(route, ['contact']) ? 'is-active' : ''}">${e(data.footer.contactLabel)}</a>
            <a href="#site-rules" class="${isActive(route, ['site-rules']) ? 'is-active' : ''}">${e(data.policies.rulesTitle)}</a>
            <div class="nav-sep"></div>
            <a href="#admin" class="${isActive(route, ['admin']) ? 'is-active' : ''}">Admin Studio ↗</a>
          </div>
        </div>
        <button type="button" class="nav-cta-pill" data-action="open-bag" aria-label="Open Stitch Bag">
          <span>Stitch Bag</span>
          <span class="nav-cta-dot tabular">${bagCount || '→'}</span>
        </button>
      </nav>
      <button type="button" class="mobile-menu-trigger" data-action="open-more-sheet" aria-label="Open menu">
        <span>Menu</span>
        <span>☰</span>
      </button>
    </div>
  </header>`;
}

export function mobileTabbarMarkup(data, route = { page: 'home' }, bagCount = 0) {
  const n = data.navigation;
  return `<nav class="mobile-tabbar" aria-label="Mobile quick navigation">
    <a href="#home" class="tab-btn ${isActive(route, ['home']) ? 'is-active' : ''}">${TAB_ICONS.home}<span>${e(n.home)}</span></a>
    <a href="#courses" class="tab-btn ${isActive(route, ['courses', 'wizard', 'wizard-plus']) ? 'is-active' : ''}">${TAB_ICONS.courses}<span>${e(n.courses)}</span></a>
    <a href="#events" class="tab-btn ${isActive(route, ['events', 'event']) ? 'is-active' : ''}">${TAB_ICONS.events}<span>${e(n.events)}</span></a>
    <a href="#1-on-1" class="tab-btn ${isActive(route, ['1-on-1']) ? 'is-active' : ''}">${TAB_ICONS['1-on-1']}<span>${e(n.oneOnOne)}</span></a>
    <button type="button" class="tab-btn ${isActive(route, ['checkout']) ? 'is-active' : ''}" data-action="open-bag">
      ${TAB_ICONS.bag}<span>Bag</span>
      <span class="tab-badge tabular" ${bagCount ? '' : 'hidden'}>${bagCount}</span>
    </button>
  </nav>`;
}

export function mobileMoreMarkup(data, route = { page: 'home' }) {
  const n = data.navigation;
  const f = data.footer;
  const items = [
    ['#about', n.about, isActive(route, ['about'])],
    ['#wizard-plus', n.wizardPlus, isActive(route, ['wizard-plus'])],
    ['#wizard', n.wizard, isActive(route, ['wizard'])],
    ['#contact', f.contactLabel, isActive(route, ['contact'])],
    ['#terms', f.termsLabel, isActive(route, ['terms'])],
    ['#privacy', f.privacyLabel, isActive(route, ['privacy'])],
    ['#shipping', f.shippingLabel, isActive(route, ['shipping'])],
    ['#usage-guidelines', f.usageLabel, isActive(route, ['usage-guidelines'])],
    ['#site-rules', data.policies.rulesTitle, isActive(route, ['site-rules'])]
  ];
  return `<div class="mobile-more-list">
    ${items.map(([href, label, active]) => `<a href="${href}" class="mobile-more-item ${active ? 'is-active' : ''}"><span>${e(label)}</span><span>→</span></a>`).join('')}
    <a href="#admin" class="mobile-more-item ${isActive(route, ['admin']) ? 'is-active' : ''}"><span>Admin Studio</span><span>↗</span></a>
  </div>`;
}

export function testimonialCarouselMarkup(items = [], { id, variant = '', title = '', titleEditKey = '' } = {}) {
  const list = Array.isArray(items) && items.length ? items : [{ quote: 'Thank you for stitching with us!', author: 'Community Member' }];
  const visibleCount = Math.min(3, list.length);
  const cards = Array.from({ length: visibleCount }, (_, slot) => {
    const item = list[slot % list.length];
    return `<article class="quote-card ${slot > 0 ? 'is-desktop-extra' : ''}" data-carousel-slot="${slot}">
      <p class="quote-text" ${slot === 0 ? `data-carousel-quote="${e(id)}"` : ''} data-slot-quote="${slot}">${e(item.quote)}</p>
      <p class="quote-author" ${slot === 0 ? `data-carousel-author="${e(id)}"` : ''} data-slot-author="${slot}">${e(item.author)}</p>
    </article>`;
  }).join('');

  return `<section class="testimonial-band ${variant}" data-carousel="${e(id)}">
    <div class="container">
      ${title ? `<h2 class="char-reveal" ${titleEditKey ? `data-edit="${e(titleEditKey)}"` : ''} style="font-size:clamp(1.7rem,3vw,2.4rem);font-weight:700;letter-spacing:-0.03em;margin:0 0 26px">${splitChars(title)}</h2>` : ''}
      <div class="testimonial-carousel">
        <button type="button" class="carousel-arrow" data-carousel-prev="${e(id)}" aria-label="Previous testimonial">${CHEVRON_LEFT}</button>
        <div class="testimonial-grid">${cards}</div>
        <button type="button" class="carousel-arrow" data-carousel-next="${e(id)}" aria-label="Next testimonial">${CHEVRON_RIGHT}</button>
      </div>
      <div class="carousel-dots" role="tablist" aria-label="Testimonials">
        ${list.map((_, i) => `<button type="button" class="carousel-dot ${i === 0 ? 'is-active' : ''}" data-carousel-dot="${e(id)}" data-index="${i}" aria-label="Quote ${i + 1}"></button>`).join('')}
      </div>
    </div>
  </section>`;
}

export function itemThumbnail(data, id) {
  if (id === 'one-on-1') return safeImage(data.oneOnOne?.heroImage, 'assets/images/session-hero.jpg');
  const course = (data.courses || []).find(c => c.id === id);
  return safeImage(course?.heroImage, 'assets/images/wizard-plus-banner.jpg');
}

export function homeMarkup(data) {
  const h = data.home;
  const photos = data.galleries.homeCommunity || [];
  const a = data.about;
  const s = data.oneOnOne;
  const cp = data.coursesPage;
  const courses = data.courses || [];
  const kitItems = parseKitItems(data);
  const heroTitle = `${h.heroTitlePrefix}${h.heroStitchText}\n${h.heroTitleSuffix.trim()}`;

  return `<section class="hero-stage">
    <div class="hero-center">
      <div class="hero-kicker" data-edit="home.heroSubtitle">${e(h.heroSubtitle)}</div>
      <h1 class="hero-title char-reveal" data-edit="home.heroStitchText">${splitChars(heroTitle)}</h1>
      <p class="hero-sub" data-edit="home.makersBody1">${e(h.makersBody1)}</p>
      <a href="#courses" class="btn-lime btn-ticker">
        <span class="ticker-window">
          <span class="ticker-track">
            <span>Start Stitching Today ·</span>
            <span>Explore Courses ·</span>
            <span>Start Stitching Today ·</span>
            <span>Explore Courses ·</span>
          </span>
        </span>
        <span class="btn-lime-circle" aria-hidden="true">→</span>
      </a>
    </div>
  </section>

  <section class="teal-band">
    <div class="container teal-grid">
      <div class="teal-copy" data-reveal>
        <h2 class="teal-title char-reveal" data-edit="home.tealHeading">${splitChars(h.tealHeading)}</h2>
        <p data-edit="about.communityP3">${e(a.communityP3)}</p>
        <a href="#courses" class="btn-lime">
          <span data-edit="home.tealCtaLabel">${e(h.tealCtaLabel)}</span>
          <span class="btn-lime-circle" aria-hidden="true">→</span>
        </a>
        <div class="hand-note-wrap">
          <span class="hand-note-text" data-edit="home.tealHandNote">${e(h.tealHandNote).replace(/\n/g, '<br>')}</span>
          <svg class="hand-arrow-desktop" width="84" height="34" viewBox="0 0 84 34" fill="none" aria-hidden="true">
            <path d="M78 24 C50 26, 26 20, 10 8 M11 19 L9 7 L21 8" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <svg class="hand-arrow-mobile" width="58" height="58" viewBox="0 0 58 58" fill="none" aria-hidden="true">
            <path d="M18 50 C48 48, 52 14, 8 14 M16 7 L7 14 L16 21" stroke="#ffffff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>

      <div class="teal-media-wrap" data-reveal>
        <img class="teal-photo" src="${e(safeImage(a.founderPhoto, 'assets/images/founder-anupama.jpeg'))}" alt="Founder ${e(a.founderName)}">
      </div>
    </div>
  </section>

  <section class="rail-band">
    <div class="container">
      <div class="rail-header" data-reveal>
        <div class="rail-index tabular">01–04</div>
        <h2 class="rail-title char-reveal" data-edit="home.railHeading">${splitChars(h.railHeading)}</h2>
        <div class="rail-nav-btns">
          <button type="button" class="circle-arrow-btn" data-rail-scroll="-340" aria-label="Scroll left">←</button>
          <button type="button" class="circle-arrow-btn" data-rail-scroll="340" aria-label="Scroll right">→</button>
        </div>
      </div>
    </div>

    <div class="rail-viewport" id="showcase-rail">
      <div class="rail-cluster" data-reveal>
        <a href="#wizard-plus" class="rail-photo-card" aria-label="${e(courses[0]?.name || 'Wizard Plus')}">
          <img src="${e(safeImage(courses[0]?.heroImage))}" alt="${e(courses[0]?.name)}">
        </a>
        <div class="rail-ui-card">
          <div class="rail-ui-head">
            <span class="rail-icon-chip">★</span>
            <span class="small muted">Most Popular</span>
          </div>
          <a href="#wizard-plus" class="rail-card-title">${e(courses[0]?.name || 'Wizard Plus')} →</a>
          <div class="rail-row-pill"><span>30+ modules · 17 stitches</span><span class="tabular rail-pill-val">${e(formatINR(courses[0]?.price || 4999))}</span></div>
          <button type="button" class="btn btn-dark btn-sm" data-action="enroll-course" data-course-id="wizard-plus">Join Wizard Plus</button>
        </div>
      </div>

      <div class="rail-cluster" data-reveal>
        <a href="#courses" class="rail-photo-card" aria-label="${e(cp.kitHeading)}">
          <img src="${e(safeImage(cp.kitImage))}" alt="Welcome kit">
        </a>
        <div class="rail-ui-card">
          <div class="rail-ui-head">
            <span class="rail-icon-chip is-wide">7 Items</span>
            <span class="small muted">Indian Residents</span>
          </div>
          <a href="#courses" class="rail-card-title">${e(cp.kitHeading)} →</a>
          ${kitItems.slice(0, 3).map((item, idx) => `<div class="rail-row-pill"><span>0${idx + 1} · ${e(item)}</span><span class="rail-pill-val">Included</span></div>`).join('')}
          ${kitItems.length > 3 ? `<a href="#courses" class="rail-more-pill">+ ${kitItems.length - 3} more items included →</a>` : ''}
        </div>
      </div>

      <div class="rail-cluster" data-reveal>
        <a href="#1-on-1" class="rail-photo-card" aria-label="${e(s.title)}">
          <img src="${e(safeImage(s.heroImage))}" alt="${e(s.title)}">
        </a>
        <div class="rail-ui-card">
          <div class="rail-ui-head">
            <span class="rail-icon-chip">1:1</span>
            <span class="small muted">${e(s.duration)}</span>
          </div>
          <a href="#1-on-1" class="rail-card-title">${e(s.title)} →</a>
          <div class="rail-row-pill"><span>Live Online Session</span><span class="tabular rail-pill-val">${e(s.priceLabel)}</span></div>
          <button type="button" class="btn btn-dark btn-sm" data-action="book-session">${e(s.ctaLabel)}</button>
        </div>
      </div>

      <div class="rail-cluster" data-reveal>
        <a href="#wizard" class="rail-photo-card" aria-label="${e(courses[1]?.name || 'Wizard')}">
          <img src="${e(safeImage(courses[1]?.heroImage))}" alt="${e(courses[1]?.name)}">
        </a>
        <div class="rail-ui-card">
          <div class="rail-ui-head">
            <span class="rail-icon-chip">02</span>
            <span class="small muted">Beginner Starter</span>
          </div>
          <a href="#wizard" class="rail-card-title">${e(courses[1]?.name || 'Wizard')} →</a>
          <div class="rail-row-pill"><span>25 modules · 12 stitches</span><span class="tabular rail-pill-val">${e(formatINR(courses[1]?.price || 3999))}</span></div>
          <button type="button" class="btn btn-outline btn-sm" data-action="enroll-course" data-course-id="wizard">Join Wizard</button>
        </div>
      </div>
    </div>
  </section>

  ${data.sections.showCommunityGallery !== false && photos.length ? `<section class="section-pad" style="padding-top:16px">
    <div class="container">
      <div style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:12px;margin-bottom:20px" data-reveal>
        <div>
          <p class="eyebrow" data-edit="home.galleryEyebrow">${e(h.galleryEyebrow)}</p>
          <h2 class="char-reveal" data-edit="home.makersHeading" style="font-size:clamp(1.75rem,3.4vw,2.6rem);font-weight:700;letter-spacing:-0.03em;margin:0">${splitChars(h.makersHeading)}</h2>
        </div>
        <a href="#events" class="btn btn-outline btn-sm">See workshops →</a>
      </div>
      <div class="showcase-stage" data-slideshow data-reveal>
        <img class="showcase-img" data-slide-img src="${e(safeImage(photos[0].src))}" alt="${e(photos[0].caption || '')}" data-action="open-lightbox" data-lightbox-group="homeCommunity" data-lightbox-idx="0" data-src="${e(safeImage(photos[0].src))}" data-caption="${e(photos[0].caption || '')}">
        <button type="button" class="showcase-arrow prev" data-slide="-1" aria-label="Previous photo">${CHEVRON_LEFT}</button>
        <button type="button" class="showcase-arrow next" data-slide="1" aria-label="Next photo">${CHEVRON_RIGHT}</button>
        <span class="showcase-counter tabular" data-slide-counter>1/${photos.length}</span>
      </div>
      <div class="showcase-thumbs" role="tablist" aria-label="Community photo thumbnails">
        ${photos.map((p, idx) => `<button type="button" class="showcase-thumb ${idx === 0 ? 'is-active' : ''}" data-slide-to="${idx}" aria-label="Photo ${idx + 1}"><img src="${e(safeImage(p.src))}" alt="" loading="lazy"></button>`).join('')}
      </div>
    </div>
  </section>` : ''}

  ${data.sections.showMeetupTestimonials !== false ? testimonialCarouselMarkup(data.testimonials.meetups, { id: 'home-meetups', title: h.meetupsTitle, titleEditKey: 'home.meetupsTitle' }) : ''}

  <section class="closing-band">
    <div class="closing-inner">
      <div class="hero-kicker" data-edit="home.closingKicker">${e(h.closingKicker)}</div>
      <h2 class="closing-title char-reveal" data-edit="home.closingHeading">${splitChars(h.closingHeading)}</h2>
      <p class="hero-sub"><span data-edit="home.makersSignoff">${e(h.makersSignoff)}</span> — <span data-edit="home.collabBody">${e(h.collabBody)}</span></p>
      <div class="closing-cta-row">
        <a href="#courses" class="btn-lime">
          <span data-edit="home.closingCtaLabel">${e(h.closingCtaLabel)}</span>
          <span class="btn-lime-circle" aria-hidden="true">→</span>
        </a>
        ${data.sections.showCollaborate !== false ? `<a href="${e(safeLink(h.collabFormUrl))}" target="_blank" rel="noopener noreferrer" class="btn btn-outline" data-edit="home.collabButton">${e(h.collabButton)}</a>` : ''}
        <div class="closing-hand-note">
          <svg class="closing-arrow" width="64" height="44" viewBox="0 0 64 44" fill="none" aria-hidden="true">
            <path d="M56 36 C28 36, 16 24, 12 6 M5 14 L12 5 L20 12" stroke="#0c1a1c" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="hand-note-text" data-edit="home.closingHandNote" style="font-size:1.3rem">${e(h.closingHandNote).replace(/\n/g, '<br>')}</span>
        </div>
      </div>
    </div>
  </section>`;
}

export function aboutMarkup(data) {
  const a = data.about;
  return `<section class="page-banner"><div class="container"><p class="eyebrow">Our Community</p><h1 data-edit="about.pageTitle">${e(a.pageTitle)}</h1></div></section>
  <section class="section-pad">
    <div class="container split-grid">
      <div data-reveal>
        <h2 data-edit="about.communityHeading" style="font-size:2rem;font-weight:800;letter-spacing:-0.03em;margin-top:0">${e(a.communityHeading)}</h2>
        <p data-edit="about.communityP1">${e(a.communityP1)}</p>
        <p data-edit="about.communityP2">${e(a.communityP2)}</p>
        <p data-edit="about.communityP3">${e(a.communityP3)}</p>
        <p data-edit="about.communityP4" style="font-weight:700;white-space:pre-line">${e(a.communityP4)}</p>
      </div>
      <div class="surface-card" style="justify-self:center;max-width:340px" data-reveal>
        <img src="${e(safeImage(data.brand.squareLogo, 'assets/images/logo-square.png'))}" alt="${e(data.brand.name)}">
      </div>
    </div>
  </section>
  <section class="teal-band">
    <div class="container split-grid">
      <img src="${e(safeImage(a.founderPhoto, 'assets/images/founder-anupama.jpeg'))}" alt="Founder ${e(a.founderName)}" style="border-radius:24px;border:var(--stroke);aspect-ratio:4/4.2;object-fit:cover;max-width:420px;width:100%">
      <div data-reveal>
        <p class="eyebrow" data-edit="about.founderRole" style="color:var(--lime)">${e(a.founderRole)}</p>
        <h2 data-edit="about.founderName" style="font-size:2.3rem;font-weight:800;letter-spacing:-0.03em;margin:0 0 14px">${e(a.founderName)}</h2>
        <p data-edit="about.founderBio" style="color:rgba(255,255,255,0.82)">${e(a.founderBio)}</p>
        <a href="${e(safeLink(data.brand.founderInstagramUrl))}" target="_blank" rel="noopener noreferrer" class="btn-lime" style="margin-top:10px">
          <span data-edit="about.founderNote">${e(a.founderNote)}</span>
          <span class="btn-lime-circle">↗</span>
        </a>
      </div>
    </div>
  </section>`;
}

export function coursesMarkup(data) {
  const cp = data.coursesPage;
  const kitItems = parseKitItems(data);
  const videoUrl = String(cp.videoUrl || '').trim();
  const isMp4 = /\.(?:mp4|webm|ogg)(?:\?.*)?$/i.test(videoUrl);
  let videoBlock = `<img src="${e(safeImage(cp.videoPoster, 'assets/images/welcome-kit.jpeg'))}" alt="Course kit preview" style="width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:14px">`;
  if (videoUrl && isMp4) {
    videoBlock = `<video controls playsinline poster="${e(safeImage(cp.videoPoster))}" src="${e(safeLink(videoUrl))}" style="width:100%;aspect-ratio:16/9;border-radius:14px"></video>`;
  } else if (videoUrl) {
    videoBlock = `<iframe src="${e(safeLink(videoUrl))}" title="Course overview" allowfullscreen loading="lazy" style="width:100%;aspect-ratio:16/9;border:0;border-radius:14px"></iframe>`;
  }

  return `<section class="page-banner"><div class="container"><p class="eyebrow">Pre-recorded Courses</p><h1 data-edit="coursesPage.heading">${e(cp.heading)}</h1><p data-edit="coursesPage.subheading">${e(cp.subheading)}</p></div></section>
  <section class="section-pad">
    <div class="container">
      <div class="courses-grid">
        ${(data.courses || []).map(c => `<article class="tier-card ${c.featured ? 'is-featured' : ''}" data-reveal>
          ${c.badge ? `<span class="tier-badge">${e(c.badge)}</span>` : ''}
          <h2 style="font-size:1.75rem;font-weight:800;margin:0">${e(c.name)}</h2>
          <div class="tier-price tabular">${e(formatINR(c.price, c.currency))}</div>
          <p class="small muted" style="margin:0 0 12px">${e(c.subtitle)} · ${e(c.validity)}</p>
          <button type="button" class="${c.featured ? 'btn-lime' : 'btn btn-dark'}" style="justify-content:center;width:100%" data-action="enroll-course" data-course-id="${e(c.id)}">
            <span>${e(c.ctaLabel)} · ${e(formatINR(c.price, c.currency))}</span>
            ${c.featured ? '<span class="btn-lime-circle">→</span>' : ''}
          </button>
          <ul class="tier-features">${(c.features || []).map(f => `<li><span>✓</span><span>${e(f)}</span></li>`).join('')}</ul>
          <a href="${e(c.route)}" class="text-link small" style="margin-top:auto">Open ${e(c.name)} details →</a>
        </article>`).join('')}
      </div>
      <p class="surface-card small" data-edit="coursesPage.paymentNote" style="margin-top:20px;text-align:center">${e(cp.paymentNote)}</p>
    </div>
  </section>
  <section class="section-pad" style="background:var(--surface);border-top:1px solid var(--line);border-bottom:1px solid var(--line)">
    <div class="container kit-grid">
      <div data-reveal>
        <p class="eyebrow">Shipped to Indian Residents</p>
        <h2 data-edit="coursesPage.kitHeading" style="font-size:2rem;font-weight:800;letter-spacing:-0.03em;margin:0 0 18px">${e(cp.kitHeading)}</h2>
        <ul class="kit-items-grid">
          ${kitItems.map((item, idx) => `<li class="kit-item-chip"><span class="tabular">0${idx + 1}</span><span>${e(item)}</span></li>`).join('')}
        </ul>
        <a class="btn-lime" href="${e(safeLink(data.brand.hoopablesStoreUrl))}" target="_blank" rel="noopener noreferrer">
          <span data-edit="coursesPage.kitButtonLabel">${e(cp.kitButtonLabel)}</span><span class="btn-lime-circle">↗</span>
        </a>
      </div>
      <img src="${e(safeImage(cp.kitImage, 'assets/images/welcome-kit.jpeg'))}" alt="Welcome kit" style="border-radius:22px;border:var(--stroke);aspect-ratio:4/3;object-fit:cover;width:100%">
    </div>
  </section>
  <section class="section-pad">
    <div class="container" style="max-width:860px;text-align:center" data-reveal>
      <div class="surface-card">${videoBlock}<p class="small muted" data-edit="coursesPage.videoCaption" style="margin:12px 0 0">${e(cp.videoCaption)}</p></div>
    </div>
  </section>
  <section class="section-pad" style="padding-top:0">
    <div class="container">
      <h2 data-edit="coursesPage.howToHeading" style="font-size:2rem;font-weight:800;letter-spacing:-0.03em;margin:0 0 22px">${e(cp.howToHeading)}</h2>
      <div class="steps-grid">
        <div class="step-card" data-reveal><span class="step-num">01</span><h3 data-edit="coursesPage.step1Title" style="margin:0 0 6px">${e(cp.step1Title)}</h3><p class="small muted" data-edit="coursesPage.step1Desc" style="margin:0">${e(cp.step1Desc)}</p></div>
        <div class="step-card" data-reveal><span class="step-num">02</span><h3 data-edit="coursesPage.step2Title" style="margin:0 0 6px">${e(cp.step2Title)}</h3><p class="small muted" data-edit="coursesPage.step2Desc" style="margin:0">${e(cp.step2Desc)}</p></div>
        <div class="step-card" data-reveal><span class="step-num">03</span><h3 data-edit="coursesPage.step3Title" style="margin:0 0 6px">${e(cp.step3Title)}</h3><p class="small muted" data-edit="coursesPage.step3Desc" style="margin:0">${e(cp.step3Desc)}</p></div>
        <div class="step-card" data-reveal><span class="step-num">04</span><h3 data-edit="coursesPage.step4Title" style="margin:0 0 6px">${e(cp.step4Title)}</h3><p class="small muted" data-edit="coursesPage.step4Desc" style="margin:0">${e(cp.step4Desc)}</p></div>
      </div>
    </div>
  </section>
  ${testimonialCarouselMarkup(data.testimonials.learners, { id: 'courses-learners', variant: 'is-light', title: data.eventsPage.testimonialsHeading })}`;
}

export function courseDetailMarkup(data, courseId) {
  const course = (data.courses || []).find(c => c.id === courseId) || data.courses?.[0];
  if (!course) return coursesMarkup(data);
  return `<section class="page-banner"><div class="container"><p><a class="text-link small" href="#courses">← Compare all courses</a></p><h1>${e(course.name)}</h1><p>${e(course.subtitle)}</p></div></section>
  <section class="section-pad">
    <div class="container" style="max-width:860px">
      <div class="surface-card" style="padding:0;overflow:hidden" data-reveal>
        <img src="${e(safeImage(course.heroImage))}" alt="${e(course.name)}" style="width:100%;height:240px;object-fit:cover;border-bottom:var(--stroke)">
        <div style="padding:clamp(20px,4vw,34px)">
          <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:14px;padding-bottom:18px;border-bottom:1px solid var(--line);margin-bottom:18px">
            <div><div class="tier-price tabular" style="margin:0">${e(formatINR(course.price, course.currency))}</div><p class="small muted" style="margin:0">${e(course.validity)}</p></div>
            <button type="button" class="btn-lime" data-action="enroll-course" data-course-id="${e(course.id)}"><span>${e(course.ctaLabel)}</span><span class="btn-lime-circle">→</span></button>
          </div>
          <ul class="tier-features" style="margin:0">${(course.features || []).map(f => `<li><span>✓</span><span>${e(f)}</span></li>`).join('')}</ul>
        </div>
      </div>
    </div>
  </section>`;
}

export function eventsMarkup(data) {
  const ep = data.eventsPage;
  const events = data.events || [];
  const photos = data.galleries.workshops || [];
  return `<section class="page-banner"><div class="container"><p class="eyebrow">Gatherings</p><h1 data-edit="eventsPage.heading">${e(ep.heading)}</h1></div></section>
  <section class="section-pad">
    <div class="container">
      <div class="filter-pills" role="group" aria-label="Filter events">
        <button type="button" class="filter-chip is-active" data-event-filter="all">All (${events.length})</button>
        <button type="button" class="filter-chip" data-event-filter="open">Open (${events.filter(x => x.status === 'open').length})</button>
        <button type="button" class="filter-chip" data-event-filter="closed">Past (${events.filter(x => x.status !== 'open').length})</button>
      </div>
      <div class="events-grid">
        ${events.map(ev => `<article class="event-card" data-event-status="${e(ev.status)}" data-reveal>
          <a href="#event/${e(ev.slug)}" class="event-poster"><img src="${e(safeImage(ev.image))}" alt="${e(ev.title)}" loading="lazy"></a>
          <div class="event-body">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
              <span class="small muted" style="font-weight:700">${e(ev.shortDate)}</span>
              <div>${(ev.badges || []).map(b => `<span class="event-badge ${/0 tickets/i.test(b) ? 'is-closed' : ''}">${e(b)}</span>`).join(' ')}</div>
            </div>
            <h2 style="font-size:1.15rem;font-weight:800;margin:0"><a href="#event/${e(ev.slug)}">${e(ev.title)}</a></h2>
            <p class="small muted" style="margin:0 0 8px">${e(ev.venueShort)}</p>
            <a class="btn ${ev.status === 'open' ? 'btn-dark' : 'btn-outline'} btn-sm" style="margin-top:auto" href="#event/${e(ev.slug)}">${e(ev.buttonLabel)}</a>
          </div>
        </article>`).join('')}
      </div>
    </div>
  </section>
  <section class="section-pad" style="padding-top:0">
    <div class="container">
      <h2 style="font-size:1.85rem;font-weight:800;letter-spacing:-0.03em;margin:0 0 20px">Workshop &amp; Meetup Snapshots</h2>
      <div class="masonry-grid">
        ${photos.map((p, idx) => `<figure class="masonry-item" data-reveal data-action="open-lightbox" data-lightbox-group="workshops" data-lightbox-idx="${idx}" data-src="${e(safeImage(p.src))}" data-caption="${e(p.caption || `Workshop #${idx + 1}`)}"><img src="${e(safeImage(p.src))}" alt="${e(p.caption || 'Workshop photo')}" loading="lazy"></figure>`).join('')}
      </div>
    </div>
  </section>
  ${testimonialCarouselMarkup(data.testimonials.learners, { id: 'events-learners', title: ep.testimonialsHeading })}`;
}

export function eventDetailMarkup(data, slug) {
  const ev = (data.events || []).find(item => item.slug === slug) || data.events?.[0];
  if (!ev) return eventsMarkup(data);
  return `<section class="page-banner"><div class="container"><p><a class="text-link small" href="#events">← All workshops &amp; meetups</a></p><h1>${e(ev.title)}</h1><p>${e(ev.shortDate)} · ${e(ev.venueShort)}</p></div></section>
  <section class="section-pad">
    <div class="container split-grid" style="align-items:start">
      <img src="${e(safeImage(ev.image))}" alt="${e(ev.title)}" style="border-radius:22px;border:var(--stroke);width:100%">
      <div class="surface-card" data-reveal>
        <p>${e(ev.summary)}</p>
        <div style="background:var(--bg);border:var(--stroke);border-radius:14px;padding:16px;font-size:14px;display:grid;gap:4px;margin:16px 0">
          <strong>Time &amp; Location</strong><span>${e(ev.fullDateTime)}</span><span class="muted">${e(ev.venueFull)}</span>
        </div>
        <button type="button" class="btn-lime" data-action="event-rsvp" data-event-slug="${e(ev.slug)}">
          <span>${ev.status === 'open' ? 'RSVP / Book your spot' : `${e(ev.buttonLabel)} · Join waitlist`}</span><span class="btn-lime-circle">→</span>
        </button>
        <hr style="border:0;height:1px;background:var(--line);margin:20px 0">
        <div class="policy-body">${e(ev.details)}</div>
      </div>
    </div>
  </section>`;
}

export function oneOnOneMarkup(data) {
  const s = data.oneOnOne;
  const gallery = data.galleries.sessions || [];
  return `<section class="page-banner"><div class="container"><p class="eyebrow">${e(s.badge)} · ${e(s.duration)}</p><h1 data-edit="oneOnOne.title">${e(s.title)}</h1><p data-edit="oneOnOne.priceLabel">${e(s.priceLabel)}</p></div></section>
  <section class="section-pad">
    <div class="container split-grid">
      <img src="${e(safeImage(s.heroImage, 'assets/images/session-hero.jpg'))}" alt="${e(s.title)}" style="border-radius:24px;border:var(--stroke);width:100%;aspect-ratio:16/11;object-fit:cover">
      <div class="surface-card" data-reveal>
        <p class="eyebrow">Service Description</p>
        <p data-edit="oneOnOne.serviceDescription" style="margin:0 0 20px">${e(s.serviceDescription)}</p>
        <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:14px">
          <span style="font-size:1.5rem;font-weight:800">${e(s.priceLabel)}</span>
          <button type="button" class="btn-lime" data-action="book-session"><span data-edit="oneOnOne.ctaLabel">${e(s.ctaLabel)}</span><span class="btn-lime-circle">→</span></button>
        </div>
      </div>
    </div>
  </section>
  ${testimonialCarouselMarkup(data.testimonials.learners, { id: 'session-learners', title: 'What learners say' })}
  <section class="section-pad">
    <div class="container split-grid">
      <div class="surface-card" data-reveal><h2 data-edit="oneOnOne.learnHeading" style="font-weight:800;margin-top:0">${e(s.learnHeading)}</h2><p data-edit="oneOnOne.learnP1">${e(s.learnP1)}</p><p data-edit="oneOnOne.learnP2" style="margin-bottom:0">${e(s.learnP2)}</p></div>
      <img src="${e(safeImage(s.learnImage, 'assets/images/session-what-you-learn.jpeg'))}" alt="What you learn" style="border-radius:22px;border:var(--stroke);width:100%;aspect-ratio:4/3;object-fit:cover">
    </div>
  </section>
  <section class="section-pad" style="padding-top:0">
    <div class="container split-grid">
      <img src="${e(safeImage(s.hostImage, 'assets/images/founder-anupama.jpeg'))}" alt="Host Anupama" style="border-radius:22px;border:var(--stroke);width:100%;max-width:420px;aspect-ratio:4/4.2;object-fit:cover">
      <div class="surface-card" data-reveal><h2 data-edit="oneOnOne.hostHeading" style="font-weight:800;margin-top:0">${e(s.hostHeading)}</h2><p data-edit="oneOnOne.hostP1">${e(s.hostP1)}</p><p data-edit="oneOnOne.hostP2">${e(s.hostP2)}</p><p data-edit="oneOnOne.hostP3" style="margin-bottom:0">${e(s.hostP3)}</p></div>
    </div>
  </section>
  <section class="section-pad" style="padding-top:0">
    <div class="container">
      <div class="session-gallery">
        ${gallery.map((g, idx) => `<figure class="session-gallery-item" data-reveal data-action="open-lightbox" data-lightbox-group="sessions" data-lightbox-idx="${idx}" data-src="${e(safeImage(g.src))}" data-caption="${e(g.caption || `Session #${idx + 1}`)}"><img src="${e(safeImage(g.src))}" alt="${e(g.caption || 'Session photo')}" loading="lazy"></figure>`).join('')}
      </div>
    </div>
  </section>`;
}

export function contactMarkup(data) {
  const c = data.contact;
  const b = data.brand;
  const waNum = String(b.whatsapp || '+919633400597').replace(/[^0-9]/g, '');
  return `<section class="page-banner"><div class="container"><p class="eyebrow">Contact</p><h1 data-edit="contact.heading">${e(c.heading)}</h1></div></section>
  <section class="section-pad">
    <div class="container split-grid" style="align-items:start">
      <div class="surface-card" data-reveal>
        <h2 data-edit="contact.subheading" style="font-weight:800;margin-top:0">${e(c.subheading)}</h2><p data-edit="contact.p1">${e(c.p1)}</p><p data-edit="contact.p2">${e(c.p2)}</p>
        <hr style="border:0;height:1px;background:var(--line);margin:20px 0">
        <p style="margin:0 0 6px;font-weight:700">${e(c.emailPrefix)}</p>
        <p style="margin:0 0 8px"><a class="text-link" href="mailto:${e(b.email)}">${e(b.email)}</a></p>
        <p style="margin:0 0 8px">WhatsApp: <a class="text-link" href="https://wa.me/${e(waNum)}" target="_blank" rel="noopener noreferrer">${e(b.whatsapp)}</a></p>
        <p class="small muted" style="margin:0">${e(b.location)}</p>
      </div>
      <div class="surface-card" data-reveal>
        <form class="form-stack" data-form="contact">
          <label class="field">Name<input name="name" required maxlength="100" placeholder="Your full name"></label>
          <label class="field">Email<input type="email" name="email" required maxlength="140" placeholder="you@example.com"></label>
          <label class="field">Phone / WhatsApp<input name="phone" maxlength="40" placeholder="+91 ..."></label>
          <label class="field">Message<textarea name="message" required rows="4" maxlength="2000" placeholder="Tell us about your stitching goals or question…"></textarea></label>
          <button type="submit" class="btn-lime" style="justify-content:center"><span data-edit="contact.submitLabel">${e(c.submitLabel)}</span><span class="btn-lime-circle">→</span></button>
          <p class="small" data-form-status="contact" hidden></p>
        </form>
      </div>
    </div>
  </section>`;
}

export function policyMarkup(data, key) {
  const map = {
    terms: { pKey: 'terms', title: data.policies.termsTitle, updated: data.policies.termsUpdated, body: data.policies.termsBody },
    privacy: { pKey: 'privacy', title: data.policies.privacyTitle, updated: data.policies.privacyUpdated, body: data.policies.privacyBody },
    shipping: { pKey: 'shipping', title: data.policies.shippingTitle, updated: data.policies.shippingUpdated, body: data.policies.shippingBody },
    'usage-guidelines': { pKey: 'usage', title: data.policies.usageTitle, updated: data.policies.usageUpdated, body: data.policies.usageBody },
    'site-rules': { pKey: 'rules', title: data.policies.rulesTitle, updated: data.policies.rulesUpdated, body: data.policies.rulesBody }
  };
  const doc = map[key] || map.terms;
  return `<section class="section-pad">
    <div class="container policy-layout">
      <aside class="policy-nav" aria-label="Policies">
        <a href="#terms" class="${key === 'terms' ? 'is-active' : ''}">${e(data.footer.termsLabel)}</a>
        <a href="#privacy" class="${key === 'privacy' ? 'is-active' : ''}">${e(data.footer.privacyLabel)}</a>
        <a href="#shipping" class="${key === 'shipping' ? 'is-active' : ''}">${e(data.footer.shippingLabel)}</a>
        <a href="#usage-guidelines" class="${key === 'usage-guidelines' ? 'is-active' : ''}">${e(data.footer.usageLabel)}</a>
        <a href="#site-rules" class="${key === 'site-rules' ? 'is-active' : ''}">${e(data.policies.rulesTitle)}</a>
        <a href="#contact">${e(data.footer.contactLabel)}</a>
      </aside>
      <article class="surface-card" data-reveal>
        <p class="eyebrow">${e(doc.updated)}</p>
        <h1 data-edit="policies.${doc.pKey}Title" style="font-size:2rem;font-weight:800;margin-top:0">${e(doc.title)}</h1>
        <div class="policy-body" data-edit="policies.${doc.pKey}Body">${e(doc.body)}</div>
      </article>
    </div>
  </section>`;
}

export function checkoutMarkup(data, bag = [], checkoutState = {}) {
  const confirmed = checkoutState.confirmedOrder;
  const failedMessage = checkoutState.failedMessage || '';
  const formValues = checkoutState.formValues || {};
  const coupon = checkoutState.coupon || null;
  const couponError = checkoutState.couponError || '';
  const b = data.brand;
  const waNum = String(b.whatsapp || '+919633400597').replace(/[^0-9]/g, '');

  const stepBar = (activeStep = 1) => `<div class="checkout-steps">
    <span class="checkout-step ${activeStep === 1 ? 'is-active' : activeStep > 1 ? 'is-done' : ''}"><span class="checkout-step-num">${activeStep > 1 ? '✓' : '1'}</span><span>Details</span></span>
    <span aria-hidden="true">→</span>
    <span class="checkout-step ${activeStep === 2 ? 'is-active' : activeStep > 2 ? 'is-done' : ''}"><span class="checkout-step-num">${activeStep > 2 ? '✓' : '2'}</span><span>Payment</span></span>
    <span aria-hidden="true">→</span>
    <span class="checkout-step ${activeStep === 3 ? 'is-active' : ''}"><span class="checkout-step-num">3</span><span>Confirmation</span></span>
  </div>`;

  if (confirmed) {
    const itemNames = (confirmed.items || []).map(i => `${i.name}${i.qty > 1 ? ` × ${i.qty}` : ''}`).join(', ');
    const isManual = confirmed.paymentMethod === 'manual';
    const waText = encodeURIComponent(`Hi Anupama! I submitted my order (${formatINR(confirmed.amount)}) for ${itemNames}. Order ID: ${confirmed.orderId}`);
    return `<section class="page-banner"><div class="container"><p class="eyebrow">${isManual ? 'Request Received' : 'Payment Confirmed'}</p><h1>Thank you for joining!</h1></div></section>
    <section class="section-pad"><div class="container" style="max-width:740px">${stepBar(3)}
      <div class="surface-card">
        <h2 style="font-weight:800;margin-top:0">${isManual ? 'Manual Payment Instructions' : 'Order Summary'}</h2>
        <div style="background:var(--bg);border:var(--stroke);border-radius:14px;padding:18px;display:grid;gap:8px;font-size:14px;margin-bottom:18px">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
            <span><strong>Order ID:</strong> ${e(confirmed.orderId)}</span>
            <button type="button" class="btn btn-outline btn-sm" data-action="copy-order-id" data-order-id="${e(confirmed.orderId)}">Copy ID</button>
          </div>
          ${confirmed.paytmTxnId ? `<div><strong>Test Transaction:</strong> ${e(confirmed.paytmTxnId)}</div>` : ''}
          <div><strong>Items:</strong> ${e(itemNames)}</div>
          ${confirmed.discountAmount ? `<div><strong>Subtotal:</strong> ${e(formatINR(confirmed.subtotal))} · <strong>Promo (${e(confirmed.couponCode)}):</strong> −${e(formatINR(confirmed.discountAmount))}</div>` : ''}
          <div><strong>Total:</strong> ${e(formatINR(confirmed.amount))}</div>
          <div><strong>Status:</strong> ${e(String(confirmed.paymentStatus || 'pending').toUpperCase())}</div>
          ${confirmed.customer?.address ? `<div><strong>Address:</strong> ${e(confirmed.customer.address)}</div>` : ''}
        </div>
        <p class="small muted">${isManual ? e(data.coursesPage.paymentNote) : `Module access / session details will reach ${e(confirmed.customer?.email || 'your email')} within 24–48 hours.`}</p>
        <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:18px">
          <a class="btn-lime" href="https://wa.me/${e(waNum)}?text=${waText}" target="_blank" rel="noopener noreferrer"><span>Confirm on WhatsApp</span><span class="btn-lime-circle">→</span></a>
          <button type="button" class="btn btn-outline" data-action="print-receipt">Print Receipt</button>
          <a class="btn btn-outline" href="#home">Back to Home</a>
        </div>
      </div>
    </div></section>`;
  }

  if (!bag.length) {
    return `<section class="page-banner"><div class="container"><h1>Checkout</h1><p>Your stitch bag is empty.</p></div></section>
    <section class="section-pad"><div class="container" style="display:flex;flex-wrap:wrap;justify-content:center;gap:12px">
      <a href="#courses" class="btn-lime"><span>Explore Courses</span><span class="btn-lime-circle">→</span></a>
      <a href="#1-on-1" class="btn btn-outline">Book 1:1 Session</a>
    </div></section>`;
  }

  const subtotal = bag.reduce((sum, i) => sum + Number(i.price || 0) * Number(i.qty || 1), 0);
  const discountAmount = coupon?.valid ? Math.round((subtotal * Number(coupon.discountPercent || 0)) / 100) : 0;
  const total = Math.max(1, subtotal - discountAmount);
  const hasCourse = bag.some(i => i.id !== 'one-on-1');
  const hasSession = bag.some(i => i.id === 'one-on-1');
  const chosenMethod = formValues.paymentMethod === 'manual' ? 'manual' : 'paytm';

  const summaryItems = `<div style="display:grid;gap:10px;margin-bottom:14px">
    ${bag.map((item, idx) => `<div class="bag-item">
      <img class="bag-item-thumb" src="${e(itemThumbnail(data, item.id))}" alt="">
      <div>
        <strong>${e(item.name)}</strong>
        <div class="small muted">${e(item.id === 'one-on-1' ? 'Live 1:1 Online' : 'Pre-recorded · Kit Included')}</div>
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
  </div>`;

  return `<section class="page-banner"><div class="container"><h1>Checkout</h1><p>Complete your details below to confirm your seat.</p></div></section>
  <section class="section-pad"><div class="container">
    ${stepBar(1)}
    <details class="checkout-mobile-summary">
      <summary><span>Order Summary (${bag.reduce((s, bItem) => s + Number(bItem.qty || 1), 0)} items)</span><span class="tabular">${e(formatINR(total))} ▾</span></summary>
      <div style="margin-top:12px">${summaryItems}</div>
    </details>
    <div class="checkout-grid">
      <div class="surface-card">
        ${failedMessage ? `<div class="checkout-alert" role="alert">${e(failedMessage)}</div>` : ''}
        <form class="form-stack" data-form="checkout">
          <h2 style="font-weight:800;margin:0;font-size:1.3rem">1 · Contact Details</h2>
          <label class="field">Full Name<input name="name" required maxlength="120" value="${e(formValues.name || '')}" placeholder="Your full name"></label>
          <div class="checkout-two-col">
            <label class="field">Email<input type="email" name="email" required maxlength="160" value="${e(formValues.email || '')}" placeholder="you@example.com"></label>
            <label class="field">WhatsApp Number<input name="phone" required maxlength="40" value="${e(formValues.phone || '')}" placeholder="+91 ..."></label>
          </div>
          ${hasCourse ? `<h3 style="font-weight:800;margin:4px 0 0;font-size:1.1rem">Shipping Address (Indian Residents · Kit)</h3>
          <label class="field">Street Address<input name="street" required maxlength="300" value="${e(formValues.street || '')}" placeholder="House/flat, building, street"></label>
          <div class="checkout-two-col">
            <label class="field">City<input name="city" required maxlength="100" value="${e(formValues.city || '')}" placeholder="e.g. New Delhi"></label>
            <label class="field">State<input name="state" required maxlength="100" value="${e(formValues.state || '')}" placeholder="e.g. Delhi"></label>
          </div>
          <div class="checkout-two-col">
            <label class="field">PIN Code<input name="pinCode" required maxlength="6" pattern="[1-9][0-9]{5}" inputmode="numeric" value="${e(formValues.pinCode || '')}" placeholder="e.g. 110017"></label>
            <p class="small muted" style="align-self:end;margin:0 0 8px">Kit ships free within India in 7–14 days.</p>
          </div>` : ''}
          ${hasSession ? `<h3 style="font-weight:800;margin:4px 0 0;font-size:1.1rem">1:1 Session Preferences</h3>
          <label class="field">Preferred Date &amp; Time<input type="datetime-local" name="preferredSlot" required value="${e(formValues.preferredSlot || '')}"></label>
          <label class="field">Skill Level &amp; Goals<textarea name="notes" rows="2" maxlength="1000" placeholder="Beginner, specific stitches…">${e(formValues.notes || '')}</textarea></label>` : ''}
          <hr style="border:0;height:1px;background:var(--line)">
          <h2 style="font-weight:800;margin:0;font-size:1.3rem">2 · Payment Option</h2>
          <div class="pay-options">
            <label class="pay-option-card">
              <input type="radio" name="paymentMethod" value="paytm" ${chosenMethod === 'paytm' ? 'checked' : ''}>
              <span><strong>Online Payment</strong> <span class="pay-mode-tag">Test Mode</span><br><span class="small muted">Opens a test payment dialog (Successful / Failed)</span></span>
            </label>
            <label class="pay-option-card">
              <input type="radio" name="paymentMethod" value="manual" ${chosenMethod === 'manual' ? 'checked' : ''}>
              <span><strong>Manual Payment</strong><br><span class="small muted">UPI / Bank Transfer · Confirm on Instagram @youcanstitchwithus</span></span>
            </label>
          </div>
          <button type="submit" class="btn-lime" style="justify-content:center" data-checkout-submit>
            <span>${chosenMethod === 'manual' ? `Request Manual Payment · ${e(formatINR(total))}` : `Pay ${e(formatINR(total))}`}</span>
            <span class="btn-lime-circle">→</span>
          </button>
        </form>
      </div>
      <aside class="surface-card checkout-summary">
        <h2 style="font-weight:800;margin:0 0 14px;font-size:1.3rem">Order Summary</h2>
        ${summaryItems}
        <div class="coupon-row">
          <input type="text" data-coupon-input value="${e(coupon?.code || '')}" placeholder="Promo code (HOOPABLES15)" aria-label="Promo code">
          ${coupon?.valid ? `<button type="button" class="btn btn-outline btn-sm" data-action="clear-coupon">Remove</button>` : `<button type="button" class="btn btn-outline btn-sm" data-action="apply-coupon">Apply</button>`}
        </div>
        ${couponError ? `<p class="small" style="color:var(--rose-deep);margin:4px 0">${e(couponError)}</p>` : ''}
        ${coupon?.valid ? `<p class="small" style="color:var(--teal);margin:4px 0">✓ ${e(coupon.code)} applied (${e(coupon.discountPercent)}% off)</p>` : ''}
        <div style="border-top:1px solid var(--line);padding-top:14px;display:grid;gap:6px;margin-top:8px">
          <div style="display:flex;justify-content:space-between;font-size:14px"><span>Subtotal</span><span class="tabular">${e(formatINR(subtotal))}</span></div>
          ${discountAmount ? `<div style="display:flex;justify-content:space-between;font-size:14px;color:var(--teal)"><span>Discount</span><span class="tabular">−${e(formatINR(discountAmount))}</span></div>` : ''}
          <div style="display:flex;justify-content:space-between;font-size:1.15rem;font-weight:800;padding-top:8px;border-top:1px solid var(--line)"><span>Total</span><span class="tabular">${e(formatINR(total))}</span></div>
        </div>
      </aside>
    </div>
  </div></section>`;
}

export function footerMarkup(data) {
  const f = data.footer;
  const b = data.brand;
  const showNews = data.sections.showFooterNewsletter !== false;
  return `<div class="container">
    <div class="footer-top-row">
      <div>
        <p style="font-weight:600;max-width:44ch;margin:0 0 6px">${e(data.home.heroSubtitle)} — ${e(f.copyrightLine1)} (${e(f.copyrightLine2)})</p>
        ${showNews ? `<form data-form="newsletter">
          <div class="newsletter-row">
            <input type="email" name="email" required placeholder="${e(f.newsletterPlaceholder)}" aria-label="${e(f.newsletterHeading)}">
            <button type="submit" class="btn btn-dark btn-sm" data-edit="footer.newsletterButton">${e(f.newsletterButton)}</button>
          </div>
          <p class="small" data-form-status="newsletter" style="margin:6px 0 0;color:var(--teal)" hidden></p>
        </form>` : ''}
      </div>
      <div class="footer-socials-round">
        <a class="round-social-btn" href="${e(safeLink(b.instagramUrl))}" target="_blank" rel="noopener noreferrer" aria-label="Instagram">${SOCIAL_ICONS.instagram}</a>
        <a class="round-social-btn" href="${e(safeLink(b.facebookUrl))}" target="_blank" rel="noopener noreferrer" aria-label="Facebook">${SOCIAL_ICONS.facebook}</a>
        <a class="round-social-btn" href="${e(safeLink(b.youtubeUrl))}" target="_blank" rel="noopener noreferrer" aria-label="YouTube">${SOCIAL_ICONS.youtube}</a>
        <a class="round-social-btn" href="mailto:${e(b.email)}" aria-label="Email">${SOCIAL_ICONS.email}</a>
      </div>
    </div>
    <div class="footer-policy-links">
      <a href="#terms" data-edit="footer.termsLabel">${e(f.termsLabel)}</a>
      <a href="#privacy" data-edit="footer.privacyLabel">${e(f.privacyLabel)}</a>
      <a href="#contact" data-edit="footer.contactLabel">${e(f.contactLabel)}</a>
      <a href="#shipping" data-edit="footer.shippingLabel">${e(f.shippingLabel)}</a>
      <a href="#usage-guidelines" data-edit="footer.usageLabel">${e(f.usageLabel)}</a>
      <a href="#site-rules">${e(data.policies.rulesTitle)}</a>
      <a href="#admin">Admin Studio ↗</a>
    </div>
  </div>
  <div class="footer-giant-mark" aria-hidden="true">${e(b.name)}</div>`;
}

export function renderRouteView(data, route = { page: 'home', id: '' }, extras = {}) {
  switch (route.page) {
    case 'about': return aboutMarkup(data);
    case 'courses': return coursesMarkup(data);
    case 'wizard-plus': return courseDetailMarkup(data, 'wizard-plus');
    case 'wizard': return courseDetailMarkup(data, 'wizard');
    case 'events': return eventsMarkup(data);
    case 'event': return eventDetailMarkup(data, route.id);
    case '1-on-1': return oneOnOneMarkup(data);
    case 'checkout': return checkoutMarkup(data, extras.bag || [], extras.checkoutState || {});
    case 'contact': return contactMarkup(data);
    case 'terms':
    case 'privacy':
    case 'shipping':
    case 'usage-guidelines':
    case 'site-rules':
      return policyMarkup(data, route.page);
    case 'home':
    default:
      return homeMarkup(data);
  }
}
