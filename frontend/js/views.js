import { escapeHTML as e, formatINR, parseKitItems, safeImage, safeLink } from './site-content.js';

const BERRY_SPRIG_SVG = `<svg class="botanical-sprig" viewBox="0 0 90 160" fill="none" aria-hidden="true">
  <path d="M46 150 C44 114, 48 64, 43 16" stroke="#7d6f5c" stroke-width="2" stroke-linecap="round"/>
  <path d="M45 124 C29 116, 20 105, 16 95" stroke="#7d6f5c" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M45 96 C62 86, 70 76, 74 63" stroke="#7d6f5c" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M45 66 C30 57, 23 46, 20 35" stroke="#7d6f5c" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M44 40 C58 34, 66 26, 70 18" stroke="#7d6f5c" stroke-width="1.6" stroke-linecap="round"/>
  <circle cx="15" cy="92" r="7" fill="#e0a619"/>
  <circle cx="24" cy="108" r="5.5" fill="#f5c94c"/>
  <circle cx="75" cy="60" r="7.5" fill="#e0a619"/>
  <circle cx="66" cy="76" r="5" fill="#f5c94c"/>
  <circle cx="19" cy="33" r="6.5" fill="#e0a619"/>
  <circle cx="71" cy="17" r="6" fill="#e0a619"/>
  <circle cx="43" cy="14" r="7" fill="#f5c94c"/>
</svg>`;

const CHEVRON_LEFT_SVG = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>`;
const CHEVRON_RIGHT_SVG = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>`;

function isActiveRoute(route, targets) {
  return targets.includes(route?.page);
}

export function headerMarkup(data, route = { page: 'home' }, bagCount = 0) {
  const b = data.brand;
  const n = data.navigation;
  return `<header class="site-header">
    <div class="header-inner">
      <button type="button" class="mobile-menu-btn" data-action="toggle-mobile-menu" aria-label="Open menu" aria-expanded="false">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
      </button>
      <a href="#home" class="brand" aria-label="${e(b.name)} home">
        <img class="brand-logo" src="${e(safeImage(b.logo, 'assets/images/logo-nav.png'))}" alt="${e(b.name)} Logo" width="52" height="52">
      </a>
      <nav class="desktop-nav" aria-label="Primary navigation">
        <a href="#home" class="nav-link ${isActiveRoute(route, ['home']) ? 'is-active' : ''}" data-nav="home">${e(n.home)}</a>
        <a href="#about" class="nav-link ${isActiveRoute(route, ['about']) ? 'is-active' : ''}" data-nav="about">${e(n.about)}</a>
        <a href="#events" class="nav-link ${isActiveRoute(route, ['events', 'event']) ? 'is-active' : ''}" data-nav="events">${e(n.events)}</a>
        <a href="#1-on-1" class="nav-link ${isActiveRoute(route, ['1-on-1']) ? 'is-active' : ''}" data-nav="1-on-1">${e(n.oneOnOne)}</a>
        <a href="#courses" class="nav-link ${isActiveRoute(route, ['courses']) ? 'is-active' : ''}" data-nav="courses">${e(n.courses)}</a>
        <div class="nav-dropdown" data-dropdown>
          <button type="button" class="nav-dropdown-btn" data-action="toggle-more-menu" aria-expanded="false">${e(n.more)} <span aria-hidden="true">▾</span></button>
          <div class="nav-dropdown-menu" hidden>
            <a href="#wizard" class="${isActiveRoute(route, ['wizard']) ? 'is-active' : ''}">${e(n.wizard)}</a>
            <a href="#wizard-plus" class="${isActiveRoute(route, ['wizard-plus']) ? 'is-active' : ''}">${e(n.wizardPlus)}</a>
            <a href="#contact" class="${isActiveRoute(route, ['contact']) ? 'is-active' : ''}">${e(data.footer.contactLabel)}</a>
            <a href="#site-rules" class="${isActiveRoute(route, ['site-rules']) ? 'is-active' : ''}">${e(data.policies.rulesTitle)}</a>
            <div class="nav-dropdown-sep"></div>
            <a href="#admin">Admin Studio ↗</a>
          </div>
        </div>
      </nav>
      <div class="header-actions">
        <button type="button" class="bag-btn" data-action="open-bag" aria-label="Open Stitch Bag">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 7h14l1 14H4L5 7Z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/></svg>
          <span>Bag</span>
          <span class="bag-count" ${bagCount ? '' : 'hidden'}>${bagCount}</span>
        </button>
      </div>
    </div>
    <nav id="mobile-menu" class="mobile-menu" aria-label="Mobile navigation" hidden>
      <a href="#home" class="${isActiveRoute(route, ['home']) ? 'is-active' : ''}">${e(n.home)}</a>
      <a href="#about" class="${isActiveRoute(route, ['about']) ? 'is-active' : ''}">${e(n.about)}</a>
      <a href="#events" class="${isActiveRoute(route, ['events', 'event']) ? 'is-active' : ''}">${e(n.events)}</a>
      <a href="#1-on-1" class="${isActiveRoute(route, ['1-on-1']) ? 'is-active' : ''}">${e(n.oneOnOne)}</a>
      <a href="#courses" class="${isActiveRoute(route, ['courses']) ? 'is-active' : ''}">${e(n.courses)}</a>
      <a href="#wizard-plus" class="${isActiveRoute(route, ['wizard-plus']) ? 'is-active' : ''}">${e(n.wizardPlus)}</a>
      <a href="#wizard" class="${isActiveRoute(route, ['wizard']) ? 'is-active' : ''}">${e(n.wizard)}</a>
      <a href="#contact" class="${isActiveRoute(route, ['contact']) ? 'is-active' : ''}">${e(data.footer.contactLabel)}</a>
      <a href="#site-rules" class="${isActiveRoute(route, ['site-rules']) ? 'is-active' : ''}">${e(data.policies.rulesTitle)}</a>
      <a href="#admin">Admin Studio ↗</a>
    </nav>
  </header>`;
}

export function testimonialCarouselMarkup(items = [], { id, variant = 'is-gold', title = '', bgImage = '' } = {}) {
  const list = Array.isArray(items) && items.length ? items : [{ quote: 'Thank you for stitching with us!', author: 'Community Member' }];
  const visibleCount = Math.min(3, list.length);
  const bgStyle = variant === 'is-photo' && bgImage ? ` style="background-image:url('${e(safeImage(bgImage))}')"` : '';
  const cards = Array.from({ length: visibleCount }, (_, slot) => {
    const item = list[slot % list.length];
    return `<article class="testimonial-card ${slot > 0 ? 'is-desktop-extra' : ''}" data-carousel-slot="${slot}" aria-live="${slot === 0 ? 'polite' : 'off'}">
      <p class="testimonial-quote" ${slot === 0 ? `data-carousel-quote="${e(id)}"` : ''} data-slot-quote="${slot}">${e(item.quote)}</p>
      <p class="testimonial-author" ${slot === 0 ? `data-carousel-author="${e(id)}"` : ''} data-slot-author="${slot}">${e(item.author)}</p>
    </article>`;
  }).join('');

  return `<section class="testimonial-band ${variant}" data-carousel="${e(id)}"${bgStyle}>
    <div class="container">
      ${title ? `<h2 class="testimonial-band-title">${e(title)}</h2>` : ''}
      <div class="testimonial-carousel">
        <button type="button" class="carousel-arrow" data-carousel-prev="${e(id)}" aria-label="Previous testimonial">${CHEVRON_LEFT_SVG}</button>
        <div class="testimonial-grid">${cards}</div>
        <button type="button" class="carousel-arrow" data-carousel-next="${e(id)}" aria-label="Next testimonial">${CHEVRON_RIGHT_SVG}</button>
      </div>
      <div class="carousel-dots" role="tablist" aria-label="Testimonial slides">
        ${list.map((_, i) => `<button type="button" class="carousel-dot ${i === 0 ? 'is-active' : ''}" data-carousel-dot="${e(id)}" data-index="${i}" aria-label="Testimonial ${i + 1}"></button>`).join('')}
      </div>
    </div>
  </section>`;
}

export function homeMarkup(data) {
  const h = data.home;
  const photos = data.galleries.homeCommunity || [];
  const firstPhoto = photos[0]?.src || 'assets/images/community/01.jpeg';
  const heroStrip = photos.slice(0, 4);
  const showGallery = data.sections.showCommunityGallery !== false;
  const showMeetups = data.sections.showMeetupTestimonials !== false;
  const showCollab = data.sections.showCollaborate !== false;
  const showInsta = data.sections.showInstagramBand !== false;

  return `<section class="home-hero">
    <div class="container">
      <div class="home-hero-card">
        <h1 class="home-hero-title"><span class="home-hero-prefix">${e(h.heroTitlePrefix)}</span><span class="home-hero-stitch">${e(h.heroStitchText)}</span><span class="home-hero-suffix">${e(h.heroTitleSuffix)}</span></h1>
        <p class="home-hero-subtitle">${e(h.heroSubtitle)}</p>
        <div class="home-hero-actions">
          <a href="#courses" class="btn btn-olive">${e(h.ctaCourses)}</a>
          <a href="#events" class="btn btn-olive">${e(h.ctaEvents)}</a>
          <a href="#1-on-1" class="btn btn-olive">${e(h.ctaPrivate)}</a>
        </div>
      </div>
      ${heroStrip.length ? `<div class="hero-photo-strip" aria-label="Community snapshots">
        ${heroStrip.map((p, idx) => `<button type="button" class="hero-strip-item" data-reveal data-action="open-lightbox" data-lightbox-group="homeCommunity" data-lightbox-idx="${idx}" data-src="${e(safeImage(p.src))}" data-caption="${e(p.caption || `Community photo ${idx + 1}`)}">
          <img src="${e(safeImage(p.src))}" alt="${e(p.caption || 'Community stitch meetup')}">
        </button>`).join('')}
      </div>` : ''}
    </div>
  </section>

  <section class="makers-section" data-reveal>
    <div class="container">
      <h2 class="makers-heading">${e(h.makersHeading)}</h2>
      <div class="makers-copy">
        <p class="makers-p1">${e(h.makersBody1)}</p>
        <p class="makers-p2">${e(h.makersBody2)}</p>
        <p class="makers-signoff">${e(h.makersSignoff)}</p>
      </div>
    </div>
  </section>

  ${showGallery && photos.length ? `<section class="community-band" aria-label="Community photos" data-reveal>
    <div class="container">
      <div class="community-stage">
        ${BERRY_SPRIG_SVG}
        <div class="slideshow-card" data-slideshow="home">
          <div class="slideshow-viewport">
            <img class="slideshow-img" data-slideshow-img="home" data-action="open-lightbox" data-lightbox-group="homeCommunity" data-lightbox-idx="0" src="${e(safeImage(firstPhoto))}" alt="${e(photos[0]?.caption || 'Community stitch meetup')}">
            <span class="slideshow-counter" data-slideshow-counter="home">1/${photos.length}</span>
            <button type="button" class="slideshow-nav prev" data-slideshow-prev="home" aria-label="Previous photo">${CHEVRON_LEFT_SVG}</button>
            <button type="button" class="slideshow-nav next" data-slideshow-next="home" aria-label="Next photo">${CHEVRON_RIGHT_SVG}</button>
          </div>
          <div class="slideshow-thumbs">
            ${photos.map((p, idx) => `<button type="button" class="slideshow-thumb ${idx === 0 ? 'is-active' : ''}" data-slideshow-dot="home" data-index="${idx}" aria-label="View photo ${idx + 1}"><img src="${e(safeImage(p.src))}" alt="" loading="lazy"></button>`).join('')}
          </div>
        </div>
        ${BERRY_SPRIG_SVG.replace('class="botanical-sprig"', 'class="botanical-sprig is-right"')}
      </div>
    </div>
  </section>` : ''}

  ${showMeetups ? testimonialCarouselMarkup(data.testimonials.meetups, { id: 'home-meetups', variant: 'is-gold' }) : ''}

  ${(showCollab || showInsta) ? `<section class="home-bottom-band" data-reveal>
    <div class="container home-bottom-grid ${showCollab && showInsta ? '' : 'is-single'}">
      ${showCollab ? `<div class="collaborate-card">
        <h2>${e(h.collabHeading)}</h2>
        <p>${e(h.collabBody)}</p>
        <div class="collaborate-actions">
          <a class="btn btn-sage" href="${e(safeLink(h.collabFormUrl))}" target="_blank" rel="noopener noreferrer">${e(h.collabButton)}</a>
        </div>
      </div>` : ''}
      ${showInsta ? `<div class="instagram-card">
        <h2><span class="brush-highlight brush-blush">${e(h.instaHeading)}</span></h2>
        <p class="insta-subtext"><a class="insta-link" href="${e(safeLink(data.brand.instagramUrl))}" target="_blank" rel="noopener noreferrer">${e(h.instaSubtext)}</a></p>
      </div>` : ''}
    </div>
  </section>` : ''}`;
}

export function aboutMarkup(data) {
  const a = data.about;
  return `<section class="page-banner">
    <div class="container">
      <h1>${e(a.pageTitle)}</h1>
    </div>
  </section>
  <section class="about-band">
    <div class="container about-panel" data-reveal>
      <div class="about-panel-copy">
        <h2><span class="brush-highlight brush-gold">${e(a.communityHeading)}</span></h2>
        <p class="about-p1">${e(a.communityP1)}</p>
        <p class="about-p2">${e(a.communityP2)}</p>
        <p class="about-p3">${e(a.communityP3)}</p>
        <p class="about-p4">${e(a.communityP4)}</p>
      </div>
      <div class="about-panel-media">
        <div class="about-logo-frame">
          <img src="${e(safeImage(data.brand.squareLogo, 'assets/images/logo-square.png'))}" alt="You Can Stitch With Us Logo">
        </div>
      </div>
    </div>
  </section>
  <section class="about-band is-alt">
    <div class="container about-panel" data-reveal>
      <div class="about-panel-copy">
        <h2><span class="brush-highlight brush-gold">${e(a.founderName)}</span></h2>
        <p class="eyebrow">${e(a.founderRole)}</p>
        <p class="founder-bio">${e(a.founderBio)}</p>
        <p class="founder-note"><a class="text-link" href="${e(safeLink(data.brand.founderInstagramUrl))}" target="_blank" rel="noopener noreferrer">${e(a.founderNote)}</a></p>
      </div>
      <div class="about-panel-media">
        <img class="founder-photo" src="${e(safeImage(a.founderPhoto, 'assets/images/founder-anupama.jpeg'))}" alt="Image of Founder, Anupama Nandakumar">
      </div>
    </div>
  </section>`;
}

export function courseCardMarkup(course, { compact = false } = {}) {
  return `<article class="course-card ${course.featured ? 'is-featured' : ''}" data-course-id="${e(course.id)}" data-reveal>
    ${course.badge ? `<span class="course-badge">${e(course.badge)}</span>` : ''}
    <div class="course-card-head">
      <h2>${e(course.name)}</h2>
      <p class="course-price">${e(formatINR(course.price, course.currency))}</p>
      <p class="course-subtitle">${e(course.subtitle)}</p>
      ${course.id === 'wizard-plus' && !compact ? `<p class="course-highlight-note">30+ modules · 17 stitches + needle painting · Personal Mentorship &amp; 15% off Hoopables</p>` : ''}
      <div class="course-card-actions">
        <button type="button" class="btn btn-gold" data-action="enroll-course" data-course-id="${e(course.id)}">${e(course.ctaLabel)}</button>
        ${compact ? '' : `<a class="btn btn-outline btn-sm" href="${e(course.route)}">View plan details</a>`}
      </div>
    </div>
    <ul class="course-features">
      ${(course.features || []).map(f => `<li><span class="course-check" aria-hidden="true">✓</span><span>${e(f)}</span></li>`).join('')}
    </ul>
  </article>`;
}

export function coursesMarkup(data) {
  const cp = data.coursesPage;
  const kitItems = parseKitItems(data);
  const videoUrl = String(cp.videoUrl || '').trim();
  let videoEmbed = '';
  const ytMatch = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/.exec(videoUrl);
  if (ytMatch) {
    videoEmbed = `<iframe src="https://www.youtube-nocookie.com/embed/${e(ytMatch[1])}" title="Course introduction video" allowfullscreen></iframe>`;
  } else if (/^https?:\/\/|\.mp4$/i.test(videoUrl)) {
    videoEmbed = `<video controls poster="${e(safeImage(cp.videoPoster, 'assets/images/welcome-kit.jpeg'))}" src="${e(safeLink(videoUrl))}"></video>`;
  } else {
    videoEmbed = `<div class="course-video-poster">
      <img src="${e(safeImage(cp.videoPoster, 'assets/images/welcome-kit.jpeg'))}" alt="Pre-recorded hand embroidery kit and course preview">
    </div>`;
  }

  const featuredCourse = (data.courses || [])[0];

  return `<section class="page-banner">
    <div class="container">
      <h1>${e(cp.heading)}</h1>
      <p>${e(cp.subheading)}</p>
    </div>
  </section>

  <section class="container">
    <div class="pricing-grid">
      ${(data.courses || []).map(c => courseCardMarkup(c)).join('')}
    </div>
    <p class="payment-note">${e(cp.paymentNote)}</p>
  </section>

  <section class="kit-band" data-reveal>
    <div class="container">
      <h2>${e(cp.kitHeading)}</h2>
      <div class="kit-grid">
        <div>
          <ol class="kit-list">
            ${kitItems.map(item => `<li>${e(item)}</li>`).join('')}
          </ol>
          <a class="btn btn-sage" href="${e(safeLink(data.brand.hoopablesStoreUrl))}" target="_blank" rel="noopener noreferrer">${e(cp.kitButtonLabel)}</a>
        </div>
        <img class="kit-photo" src="${e(safeImage(cp.kitImage, 'assets/images/welcome-kit.jpeg'))}" alt="Picture of the DIY kit that is sent to the participants">
      </div>
    </div>
  </section>

  <section class="course-video-section" data-reveal>
    <div class="container">
      <div class="course-video-frame">
        ${videoEmbed}
        <p class="course-video-caption">${e(cp.videoCaption)}</p>
      </div>
    </div>
  </section>

  <section class="steps-band" data-reveal>
    <div class="container">
      <h2>${e(cp.howToHeading)}</h2>
      <div class="steps-grid">
        <div class="step-card"><span class="step-num">01</span><h3 class="step1-title">${e(cp.step1Title)}</h3><p class="step1-desc">${e(cp.step1Desc)}</p></div>
        <div class="step-card"><span class="step-num">02</span><h3 class="step2-title">${e(cp.step2Title)}</h3><p class="step2-desc">${e(cp.step2Desc)}</p></div>
        <div class="step-card"><span class="step-num">03</span><h3 class="step3-title">${e(cp.step3Title)}</h3><p class="step3-desc">${e(cp.step3Desc)}</p></div>
        <div class="step-card"><span class="step-num">04</span><h3 class="step4-title">${e(cp.step4Title)}</h3><p class="step4-desc">${e(cp.step4Desc)}</p></div>
      </div>
    </div>
  </section>

  ${testimonialCarouselMarkup(data.testimonials.learners, { id: 'courses-learners', variant: 'is-photo', bgImage: cp.testimonialBg })}

  ${featuredCourse ? `<div class="mobile-sticky-cta">
    <div><strong>${e(featuredCourse.name)}</strong> · ${e(formatINR(featuredCourse.price, featuredCourse.currency))}</div>
    <button type="button" class="btn btn-gold btn-sm" data-action="enroll-course" data-course-id="${e(featuredCourse.id)}">${e(featuredCourse.ctaLabel)}</button>
  </div>` : ''}`;
}

export function courseDetailMarkup(data, courseId) {
  const course = (data.courses || []).find(c => c.id === courseId) || data.courses?.[0];
  if (!course) return coursesMarkup(data);
  return `<section class="page-banner">
    <div class="container">
      <h1>${e(course.name.toUpperCase())}</h1>
      <p><a class="text-link" href="#courses">← Compare all courses</a></p>
    </div>
  </section>
  <section class="container plan-detail-wrap">
    <div class="plan-detail-card" data-reveal>
      <img class="plan-detail-banner" src="${e(safeImage(course.heroImage))}" alt="${e(course.name)} banner">
      <div class="plan-detail-body">
        <div class="plan-detail-top">
          <h2>${e(course.name)}</h2>
          <p class="course-price">${e(formatINR(course.price, course.currency))}</p>
          <p class="course-subtitle">${e(course.subtitle)}</p>
          <p class="small muted">${e(course.validity)}</p>
          <button type="button" class="btn btn-sage" style="width:100%;margin-top:14px" data-action="enroll-course" data-course-id="${e(course.id)}">${e(course.ctaLabel)}</button>
        </div>
        <ul class="course-features">
          ${(course.features || []).map(f => `<li><span class="course-check" aria-hidden="true">✓</span><span>${e(f)}</span></li>`).join('')}
        </ul>
      </div>
    </div>
  </section>
  <div class="mobile-sticky-cta">
    <div><strong>${e(course.name)}</strong> · ${e(formatINR(course.price, course.currency))}</div>
    <button type="button" class="btn btn-sage btn-sm" data-action="enroll-course" data-course-id="${e(course.id)}">${e(course.ctaLabel)}</button>
  </div>`;
}

export function eventsMarkup(data) {
  const ep = data.eventsPage;
  const events = data.events || [];
  const photos = data.galleries.workshops || [];

  return `<section class="page-banner">
    <div class="container">
      <h1>${e(ep.heading)}</h1>
    </div>
  </section>

  <section class="container">
    <div class="events-toolbar" role="group" aria-label="Filter events">
      <button type="button" class="filter-chip is-active" data-event-filter="all">All (${events.length})</button>
      <button type="button" class="filter-chip" data-event-filter="open">Open (${events.filter(x => x.status === 'open').length})</button>
      <button type="button" class="filter-chip" data-event-filter="closed">Past (${events.filter(x => x.status !== 'open').length})</button>
    </div>
    <div class="events-grid">
      ${events.map(ev => `<article class="event-card" data-event-slug="${e(ev.slug)}" data-event-status="${e(ev.status)}" data-reveal>
        <a class="event-poster-wrap" href="#event/${e(ev.slug)}">
          <img src="${e(safeImage(ev.image))}" alt="${e(ev.title)}" loading="lazy">
        </a>
        <div class="event-card-body">
          <div class="event-meta-row">
            <span class="event-date">${e(ev.shortDate)}</span>
            ${(ev.badges || []).length ? `<div class="event-badges-inline">${ev.badges.map((b, idx) => `<span class="event-badge ${idx === 0 && /0 tickets/i.test(b) ? 'is-soldout' : ''}">${e(b)}</span>`).join('')}</div>` : ''}
          </div>
          <h2 class="event-title"><a href="#event/${e(ev.slug)}">${e(ev.title)}</a></h2>
          <p class="event-venue">${e(ev.venueShort)}</p>
          <a class="btn ${ev.status === 'open' ? 'btn-sage' : 'btn-outline'}" href="#event/${e(ev.slug)}">${e(ev.buttonLabel)}</a>
        </div>
      </article>`).join('')}
    </div>
  </section>

  <section class="container masonry-section" aria-label="Workshop and meetup photo gallery">
    <div class="masonry-grid">
      ${photos.map((p, idx) => `<figure class="masonry-item" data-reveal data-action="open-lightbox" data-lightbox-group="workshops" data-lightbox-idx="${idx}" data-src="${e(safeImage(p.src))}" data-caption="${e(p.caption || `Workshop moment #${idx + 1}`)}">
        <img src="${e(safeImage(p.src))}" alt="${e(p.caption || 'Workshop community photo')}" loading="lazy">
      </figure>`).join('')}
    </div>
  </section>

  ${testimonialCarouselMarkup(data.testimonials.learners, {
    id: 'events-learners',
    variant: 'is-olive',
    title: ep.testimonialsHeading
  })}`;
}

export function eventDetailMarkup(data, slug) {
  const ev = (data.events || []).find(item => item.slug === slug) || data.events?.[0];
  if (!ev) return eventsMarkup(data);
  return `<section class="container event-detail-wrap">
    <p class="small" style="margin-bottom:18px"><a class="text-link" href="#events">← See other events</a></p>
    <div class="event-detail-hero">
      <img class="event-detail-poster" src="${e(safeImage(ev.image))}" alt="${e(ev.title)}">
      <div class="event-detail-meta">
        <p class="eyebrow">${e(ev.shortDate)} · ${e(ev.venueShort)}</p>
        <h1>${e(ev.title)}</h1>
        <p>${e(ev.summary)}</p>
        <div class="event-detail-facts">
          <div><strong>Time &amp; Location</strong></div>
          <div>${e(ev.fullDateTime)}</div>
          <div>${e(ev.venueFull)}</div>
        </div>
        <button type="button" class="btn ${ev.status === 'open' ? 'btn-sage' : 'btn-outline'}" data-action="event-rsvp" data-event-slug="${e(ev.slug)}">
          ${ev.status === 'open' ? 'RSVP / Book your spot' : `${e(ev.buttonLabel)} · Join waitlist`}
        </button>
      </div>
    </div>
    <div class="event-detail-prose">
      <h2 style="font-family:var(--font-display);margin-top:0">About the event</h2>
      ${e(ev.details)}
    </div>
  </section>`;
}

export function oneOnOneMarkup(data) {
  const s = data.oneOnOne;
  const gallery = data.galleries.sessions || [];

  return `<section class="container">
    <div class="session-hero-card" data-reveal>
      <img class="session-hero-img" src="${e(safeImage(s.heroImage, 'assets/images/session-hero.jpg'))}" alt="${e(s.title)}">
      <div class="session-hero-copy">
        <h1>${e(s.title)}</h1>
        <span class="session-pill">${e(s.badge)}</span>
        <p class="small muted" style="margin:0 0 4px">${e(s.duration)}</p>
        <p style="font-size:1.25rem;font-weight:700;margin:0 0 18px">${e(s.priceLabel)}</p>
        <button type="button" class="btn btn-sage" data-action="book-session">${e(s.ctaLabel)}</button>
      </div>
    </div>

    <div class="narrow" style="margin-bottom:48px;text-align:center" data-reveal>
      <p class="eyebrow">Service Description</p>
      <p class="session-desc" style="margin:0;color:var(--muted)">${e(s.serviceDescription)}</p>
    </div>
  </section>

  ${testimonialCarouselMarkup(data.testimonials.learners, { id: 'session-learners', variant: 'is-olive' })}

  <section class="session-split-band" data-reveal>
    <div class="session-split">
      <img class="session-split-img" src="${e(safeImage(s.learnImage, 'assets/images/session-what-you-learn.jpeg'))}" alt="Participants learning embroidery stitches">
      <div class="session-split-copy is-sage">
        <h2>${e(s.learnHeading)}</h2>
        <p class="learn-p1">${e(s.learnP1)}</p>
        <p class="learn-p2">${e(s.learnP2)}</p>
      </div>
    </div>
  </section>

  <section class="session-split-band" data-reveal>
    <div class="session-split">
      <div class="session-split-copy is-butter">
        <h2>${e(s.hostHeading)}</h2>
        <p class="host-p1">${e(s.hostP1)}</p>
        <p class="host-p2">${e(s.hostP2)}</p>
        <p class="host-p3">${e(s.hostP3)}</p>
      </div>
      <img class="session-split-img" src="${e(safeImage(s.hostImage, 'assets/images/founder-anupama.jpeg'))}" alt="Founder & Instructor Anupama">
    </div>
  </section>

  <section class="container" style="padding-top:48px">
    <div class="session-gallery">
      ${gallery.map((g, idx) => `<figure class="session-gallery-item" data-reveal data-action="open-lightbox" data-lightbox-group="sessions" data-lightbox-idx="${idx}" data-src="${e(safeImage(g.src))}" data-caption="${e(g.caption || `Session snapshot #${idx + 1}`)}">
        <img src="${e(safeImage(g.src))}" alt="${e(g.caption || 'Hand embroidery session photo')}" loading="lazy">
      </figure>`).join('')}
    </div>
  </section>

  <div class="mobile-sticky-cta">
    <div><strong>1:1 Session</strong> · ${e(s.priceLabel)}</div>
    <button type="button" class="btn btn-sage btn-sm" data-action="book-session">${e(s.ctaLabel)}</button>
  </div>`;
}

export function contactMarkup(data) {
  const c = data.contact;
  const b = data.brand;
  const waNum = String(b.whatsapp || '+919633400597').replace(/[^0-9]/g, '');
  return `<section class="page-banner">
    <div class="container">
      <h1>${e(c.heading)}</h1>
    </div>
  </section>
  <section class="container contact-grid">
    <div class="contact-info-card">
      <h2 style="font-family:var(--font-display);margin-top:0">${e(c.subheading)}</h2>
      <p class="contact-p1">${e(c.p1)}</p>
      <p class="contact-p2">${e(c.p2)}</p>
      <hr class="stitch-divider" style="margin:22px 0">
      <p style="margin:0 0 6px;font-weight:600">${e(c.emailPrefix)}</p>
      <p style="margin:0 0 10px"><a class="text-link" href="mailto:${e(b.email)}">${e(b.email)}</a></p>
      <p style="margin:0 0 10px">Whatsapp: <a class="text-link" href="https://wa.me/${e(waNum)}" target="_blank" rel="noopener noreferrer">${e(b.whatsapp)}</a></p>
      <p class="small muted" style="margin:0">${e(b.location)}</p>
    </div>
    <div class="contact-form-card">
      <form class="form-stack" data-form="contact">
        <label class="field">Name<input name="name" required maxlength="100" placeholder="Your full name"></label>
        <label class="field">Email<input type="email" name="email" required maxlength="140" placeholder="you@example.com"></label>
        <label class="field">Phone / WhatsApp<input name="phone" maxlength="40" placeholder="+91 ..."></label>
        <label class="field">Message<textarea name="message" required rows="4" maxlength="2000" placeholder="Tell us about your stitching goals, workshop idea, or question…"></textarea></label>
        <button type="submit" class="btn btn-sage">${e(c.submitLabel)}</button>
        <p class="small" data-form-status="contact" hidden></p>
      </form>
    </div>
  </section>`;
}

export function policyMarkup(data, key) {
  const map = {
    terms: { title: data.policies.termsTitle, updated: data.policies.termsUpdated, body: data.policies.termsBody },
    privacy: { title: data.policies.privacyTitle, updated: data.policies.privacyUpdated, body: data.policies.privacyBody },
    shipping: { title: data.policies.shippingTitle, updated: data.policies.shippingUpdated, body: data.policies.shippingBody },
    'usage-guidelines': { title: data.policies.usageTitle, updated: data.policies.usageUpdated, body: data.policies.usageBody },
    'site-rules': { title: data.policies.rulesTitle, updated: data.policies.rulesUpdated, body: data.policies.rulesBody }
  };
  const doc = map[key] || map.terms;
  return `<section class="container policy-layout">
    <aside class="policy-nav" aria-label="Legal & community pages">
      <a href="#terms" class="${key === 'terms' ? 'is-active' : ''}">${e(data.footer.termsLabel)}</a>
      <a href="#privacy" class="${key === 'privacy' ? 'is-active' : ''}">${e(data.footer.privacyLabel)}</a>
      <a href="#shipping" class="${key === 'shipping' ? 'is-active' : ''}">${e(data.footer.shippingLabel)}</a>
      <a href="#usage-guidelines" class="${key === 'usage-guidelines' ? 'is-active' : ''}">${e(data.footer.usageLabel)}</a>
      <a href="#site-rules" class="${key === 'site-rules' ? 'is-active' : ''}">${e(data.policies.rulesTitle)}</a>
      <a href="#contact">${e(data.footer.contactLabel)}</a>
    </aside>
    <article class="policy-doc">
      <p class="eyebrow">${e(doc.updated)}</p>
      <h1>${e(doc.title)}</h1>
      <div class="policy-body">${e(doc.body)}</div>
    </article>
  </section>`;
}

export function footerMarkup(data) {
  const f = data.footer;
  const b = data.brand;
  const showNews = data.sections.showFooterNewsletter !== false;
  return `<div class="container">
    <div class="footer-grid">
      <div>
        <div class="footer-socials">
          <a class="social-pill" href="${e(safeLink(b.instagramUrl))}" target="_blank" rel="noopener noreferrer">Instagram · ${e(b.instagramHandle)}</a>
          <a class="social-pill" href="${e(safeLink(b.facebookUrl))}" target="_blank" rel="noopener noreferrer">Facebook</a>
          <a class="social-pill" href="${e(safeLink(b.youtubeUrl))}" target="_blank" rel="noopener noreferrer">YouTube</a>
        </div>
        ${showNews ? `<form data-form="newsletter">
          <p class="newsletter-heading" style="font-weight:600;margin:0 0 6px">${e(f.newsletterHeading)}</p>
          <div class="newsletter-row">
            <input type="email" name="email" required placeholder="${e(f.newsletterPlaceholder)}" aria-label="${e(f.newsletterHeading)}">
            <button type="submit" class="btn btn-sage btn-sm">${e(f.newsletterButton)}</button>
          </div>
          <p class="small" data-form-status="newsletter" style="margin:8px 0 0;color:var(--sage-deep)" hidden></p>
        </form>` : ''}
      </div>
      <div class="footer-links-col">
        <a href="#terms">${e(f.termsLabel)}</a>
        <a href="#privacy">${e(f.privacyLabel)}</a>
        <a href="#contact">${e(f.contactLabel)}</a>
        <a href="#shipping">${e(f.shippingLabel)}</a>
        <a href="#usage-guidelines">${e(f.usageLabel)}</a>
        <a href="#site-rules">${e(data.policies.rulesTitle)}</a>
      </div>
    </div>
    <div class="footer-bottom">
      <div>
        <div>${e(f.copyrightLine1)}</div>
        <div>${e(f.copyrightLine2)}</div>
      </div>
      <div>
        <a href="#admin" class="text-link">Admin Studio</a>
      </div>
    </div>
  </div>`;
}

export function itemThumbnail(data, id) {
  if (id === 'one-on-1') return safeImage(data.oneOnOne?.heroImage, 'assets/images/session-hero.jpg');
  const course = (data.courses || []).find(c => c.id === id);
  return safeImage(course?.heroImage, 'assets/images/wizard-plus-banner.jpg');
}

export function checkoutMarkup(data, bag = [], checkoutState = {}) {
  const confirmed = checkoutState.confirmedOrder;
  const failedMessage = checkoutState.failedMessage || '';
  const formValues = checkoutState.formValues || {};
  const coupon = checkoutState.coupon || null;
  const couponError = checkoutState.couponError || '';
  const b = data.brand;
  const waNum = String(b.whatsapp || '+919633400597').replace(/[^0-9]/g, '');

  const stepBar = (activeStep = 1) => `<div class="checkout-steps" aria-label="Checkout progress">
    <span class="checkout-step-item ${activeStep === 1 ? 'is-active' : activeStep > 1 ? 'is-done' : ''}"><span class="checkout-step-num">${activeStep > 1 ? '✓' : '1'}</span><span>Details</span></span>
    <span aria-hidden="true">→</span>
    <span class="checkout-step-item ${activeStep === 2 ? 'is-active' : activeStep > 2 ? 'is-done' : ''}"><span class="checkout-step-num">${activeStep > 2 ? '✓' : '2'}</span><span>Payment</span></span>
    <span aria-hidden="true">→</span>
    <span class="checkout-step-item ${activeStep === 3 ? 'is-active' : ''}"><span class="checkout-step-num">3</span><span>Confirmation</span></span>
  </div>`;

  if (confirmed) {
    const itemNames = (confirmed.items || []).map(i => `${i.name}${i.qty > 1 ? ` × ${i.qty}` : ''}`).join(', ');
    const isManual = confirmed.paymentMethod === 'manual';
    const waText = encodeURIComponent(`Hi Anupama! I submitted my order (${formatINR(confirmed.amount)}) for ${itemNames}. Order ID: ${confirmed.orderId}`);
    return `<section class="page-banner">
      <div class="container">
        <p class="eyebrow" style="color:var(--sage-deep)">${isManual ? 'Enrollment Request Received' : 'Payment Successful'}</p>
        <h1>Thank you for joining!</h1>
      </div>
    </section>
    <section class="container checkout-wrap">
      ${stepBar(3)}
      <div class="checkout-panel" style="max-width:740px;margin-inline:auto">
        <h2 style="font-family:var(--font-display);margin-top:0">${isManual ? 'Manual Payment Instructions' : 'Order Confirmed'}</h2>
        <div style="background:var(--cream);border:1px solid var(--line);border-radius:8px;padding:18px;display:grid;gap:8px;font-size:14px;margin-bottom:20px">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
            <span><strong>Order ID:</strong> ${e(confirmed.orderId)}</span>
            <button type="button" class="btn btn-outline btn-sm" data-action="copy-order-id" data-order-id="${e(confirmed.orderId)}">Copy Order ID</button>
          </div>
          ${confirmed.paytmTxnId ? `<div><strong>Test Transaction ID:</strong> ${e(confirmed.paytmTxnId)}</div>` : ''}
          <div><strong>Items:</strong> ${e(itemNames)}</div>
          ${confirmed.discountAmount ? `<div><strong>Subtotal:</strong> ${e(formatINR(confirmed.subtotal))} · <strong>Promo (${e(confirmed.couponCode)}):</strong> -${e(formatINR(confirmed.discountAmount))}</div>` : ''}
          <div><strong>Total Paid / Payable:</strong> ${e(formatINR(confirmed.amount))}</div>
          <div><strong>Status:</strong> ${e(String(confirmed.paymentStatus || 'pending').toUpperCase())}</div>
          ${confirmed.customer?.address ? `<div><strong>Shipping Address:</strong> ${e(confirmed.customer.address)}</div>` : ''}
        </div>
        <p class="small muted">${isManual
          ? e(data.coursesPage.paymentNote)
          : `Access to pre-recorded modules / session details will be shared within 24–48 hours to ${e(confirmed.customer?.email || 'your email')}.`}</p>
        <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:20px">
          <a class="btn btn-sage" href="https://wa.me/${e(waNum)}?text=${waText}" target="_blank" rel="noopener noreferrer">Confirm on WhatsApp</a>
          <button type="button" class="btn btn-outline" data-action="print-receipt">Print Receipt</button>
          <a class="btn btn-outline" href="#home">Back to Home</a>
        </div>
      </div>
    </section>`;
  }

  if (!bag.length) {
    return `<section class="page-banner">
      <div class="container">
        <h1>Checkout</h1>
        <p>Your stitch bag is empty.</p>
      </div>
    </section>
    <section class="container checkout-wrap" style="text-align:center">
      <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:12px">
        <a href="#courses" class="btn btn-olive">Explore Hand Embroidery Courses</a>
        <a href="#1-on-1" class="btn btn-outline">Book 1:1 Session</a>
      </div>
    </section>`;
  }

  const subtotal = bag.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1), 0);
  const discountAmount = coupon?.valid ? Math.round((subtotal * Number(coupon.discountPercent || 0)) / 100) : 0;
  const total = Math.max(1, subtotal - discountAmount);
  const hasCourse = bag.some(item => item.id !== 'one-on-1');
  const hasSession = bag.some(item => item.id === 'one-on-1');
  const chosenMethod = formValues.paymentMethod === 'manual' ? 'manual' : 'paytm';

  const summaryItemsHtml = `<div style="display:grid;gap:10px;margin-bottom:14px">
    ${bag.map((item, idx) => `<div class="bag-item">
      <img class="bag-item-thumb" src="${e(itemThumbnail(data, item.id))}" alt="">
      <div>
        <strong>${e(item.name)}</strong>
        <div class="small muted">${e(item.id === 'one-on-1' ? 'Live 1:1 Online' : 'Pre-recorded Course · Kit Included')}</div>
        <div class="bag-item-controls">
          <div class="qty-stepper" aria-label="Quantity">
            <button type="button" data-action="bag-qty" data-idx="${idx}" data-delta="-1" aria-label="Decrease quantity">−</button>
            <span>${e(item.qty || 1)}</span>
            <button type="button" data-action="bag-qty" data-idx="${idx}" data-delta="1" aria-label="Increase quantity">+</button>
          </div>
          <span class="small" style="font-weight:700">${e(formatINR(Number(item.price) * Number(item.qty || 1)))}</span>
          <button type="button" class="text-link small" style="color:var(--coral-deep)" data-action="remove-bag-item" data-idx="${idx}">Remove</button>
        </div>
      </div>
    </div>`).join('')}
  </div>`;

  return `<section class="page-banner">
    <div class="container">
      <h1>Checkout</h1>
      <p>Complete your details below to confirm your course enrollment or 1:1 session.</p>
    </div>
  </section>
  <section class="container checkout-wrap">
    ${stepBar(1)}
    <details class="checkout-mobile-summary">
      <summary><span>Order Summary (${bag.reduce((s, bItem) => s + Number(bItem.qty || 1), 0)} items)</span><span>${e(formatINR(total))} ▾</span></summary>
      <div style="margin-top:12px">${summaryItemsHtml}</div>
    </details>

    <div class="checkout-grid">
      <div class="checkout-panel">
        ${failedMessage ? `<div class="checkout-alert" role="alert">${e(failedMessage)}</div>` : ''}
        <form class="form-stack" data-form="checkout">
          <h2 style="font-family:var(--font-display);margin:0 0 4px;font-size:1.35rem">1 · Contact Details</h2>
          <label class="field">Full Name
            <input name="name" required maxlength="120" value="${e(formValues.name || '')}" placeholder="Your full name">
          </label>
          <div class="checkout-two-col">
            <label class="field">Email Address
              <input type="email" name="email" required maxlength="160" value="${e(formValues.email || '')}" placeholder="you@example.com">
            </label>
            <label class="field">WhatsApp Number
              <input name="phone" required maxlength="40" value="${e(formValues.phone || '')}" placeholder="+91 ...">
            </label>
          </div>

          ${hasCourse ? `<h3 style="font-family:var(--font-display);margin:6px 0 0;font-size:1.1rem">Shipping Address (Indian Residents · Embroidery Kit)</h3>
          <label class="field">Street Address &amp; Landmark
            <input name="street" required maxlength="300" value="${e(formValues.street || '')}" placeholder="House/flat, building, street">
          </label>
          <div class="checkout-two-col">
            <label class="field">City
              <input name="city" required maxlength="100" value="${e(formValues.city || '')}" placeholder="e.g. New Delhi">
            </label>
            <label class="field">State
              <input name="state" required maxlength="100" value="${e(formValues.state || '')}" placeholder="e.g. Delhi">
            </label>
          </div>
          <div class="checkout-two-col">
            <label class="field">6-Digit PIN Code
              <input name="pinCode" required maxlength="6" pattern="[1-9][0-9]{5}" inputmode="numeric" value="${e(formValues.pinCode || '')}" placeholder="e.g. 110017">
            </label>
            <p class="small muted" style="align-self:end;margin:0 0 8px">Embroidery kit ships free within India in 7–14 business days.</p>
          </div>` : ''}

          ${hasSession ? `<h3 style="font-family:var(--font-display);margin:6px 0 0;font-size:1.1rem">1:1 Session Preferences</h3>
          <label class="field">Preferred Date &amp; Time
            <input type="datetime-local" name="preferredSlot" required value="${e(formValues.preferredSlot || '')}">
          </label>
          <label class="field">Skill Level &amp; Goals
            <textarea name="notes" rows="2" maxlength="1000" placeholder="Complete beginner, specific stitches, pattern help…">${e(formValues.notes || '')}</textarea>
          </label>` : ''}

          <hr class="stitch-divider" style="margin:6px 0">
          <h2 style="font-family:var(--font-display);margin:0 0 4px;font-size:1.35rem">2 · Payment Option</h2>
          <div class="pay-options">
            <label class="pay-option-card">
              <input type="radio" name="paymentMethod" value="paytm" ${chosenMethod === 'paytm' ? 'checked' : ''}>
              <span class="pay-option-meta">
                <span><strong>Online Payment</strong> <span class="pay-mode-tag">Test Mode</span></span>
                <span class="small muted">Opens a test payment dialog to simulate Payment Successful or Payment Failed</span>
              </span>
            </label>
            <label class="pay-option-card">
              <input type="radio" name="paymentMethod" value="manual" ${chosenMethod === 'manual' ? 'checked' : ''}>
              <span class="pay-option-meta">
                <span><strong>Manual Payment</strong></span>
                <span class="small muted">UPI / Bank Transfer · Confirm on Instagram @youcanstitchwithus / WhatsApp</span>
              </span>
            </label>
          </div>
          <p class="small muted" style="margin:0">${e(data.coursesPage.paymentNote)}</p>
          <button type="submit" class="btn btn-sage" data-checkout-submit>${chosenMethod === 'manual' ? `Request Manual Payment · ${e(formatINR(total))}` : `Pay ${e(formatINR(total))}`}</button>
        </form>
      </div>

      <aside class="checkout-panel checkout-summary">
        <h2 style="font-family:var(--font-display);margin:0 0 16px;font-size:1.35rem">Order Summary</h2>
        ${summaryItemsHtml}
        <div class="coupon-row">
          <input type="text" data-coupon-input value="${e(coupon?.code || '')}" placeholder="Promo code (e.g. HOOPABLES15)" aria-label="Promo code">
          ${coupon?.valid
            ? `<button type="button" class="btn btn-outline btn-sm" data-action="clear-coupon">Remove</button>`
            : `<button type="button" class="btn btn-outline btn-sm" data-action="apply-coupon">Apply</button>`}
        </div>
        ${couponError ? `<p class="small" style="color:var(--coral-deep);margin:4px 0 8px">${e(couponError)}</p>` : ''}
        ${coupon?.valid ? `<p class="small" style="color:var(--sage-deep);margin:4px 0 8px">✓ ${e(coupon.code)} applied (${e(coupon.discountPercent)}% off)</p>` : ''}

        <div style="border-top:1px solid var(--line);padding-top:14px;display:grid;gap:6px">
          <div style="display:flex;justify-content:space-between;font-size:14px">
            <span>Subtotal</span>
            <span>${e(formatINR(subtotal))}</span>
          </div>
          ${discountAmount ? `<div style="display:flex;justify-content:space-between;font-size:14px;color:var(--sage-deep)">
            <span>Promo Discount</span>
            <span>−${e(formatINR(discountAmount))}</span>
          </div>` : ''}
          <div style="display:flex;justify-content:space-between;font-size:14px">
            <span>Kit Shipping (India)</span>
            <span>${hasCourse ? 'Included' : 'Online'}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:1.12rem;font-weight:700;padding-top:6px;border-top:1px solid var(--line)">
            <span>Total</span>
            <span>${e(formatINR(total))}</span>
          </div>
        </div>
        <ul class="checkout-trust-list">
          <li>✓ Lifetime access to pre-recorded modules</li>
          <li>✓ Exclusive WhatsApp support (${e(b.whatsapp)})</li>
          <li>See <a class="text-link" href="#shipping">Shipping &amp; Refunds</a> and <a class="text-link" href="#usage-guidelines">Cancellation Policy</a></li>
        </ul>
      </aside>
    </div>
  </section>`;
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
