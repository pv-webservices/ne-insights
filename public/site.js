const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Navigation ---------- */
const menu = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
const overlay = document.querySelector('[data-nav-overlay]');
const closeDropdowns = (except) => document.querySelectorAll('.nav-dropdown.is-open').forEach(item => {
  if (item === except) return;
  item.classList.remove('is-open');
  item.querySelector('button').setAttribute('aria-expanded', 'false');
});
const setMenu = (open) => {
  if (!menu || !navigation) return;
  menu.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  navigation.classList.toggle('is-open', open);
  document.body.classList.toggle('nav-open', open);
  if (overlay) {
    if (open) { overlay.hidden = false; requestAnimationFrame(() => overlay.classList.add('is-visible')); }
    else { overlay.classList.remove('is-visible'); setTimeout(() => { if (!navigation.classList.contains('is-open')) overlay.hidden = true; }, 350); }
  }
  if (!open) closeDropdowns();
};
menu?.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
overlay?.addEventListener('click', () => setMenu(false));
document.querySelector('[data-nav-close]')?.addEventListener('click', () => { setMenu(false); menu?.focus(); });
navigation?.addEventListener('click', e => { if (e.target.closest('a') && menu?.getAttribute('aria-expanded') === 'true') setMenu(false); });
document.querySelectorAll('.dropdown-toggle').forEach(toggle => {
  toggle.addEventListener('click', () => {
    const parent = toggle.closest('.nav-dropdown');
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    closeDropdowns(parent);
    toggle.setAttribute('aria-expanded', String(open));
    parent.classList.toggle('is-open', open);
  });
});
document.addEventListener('click', e => { if (!e.target.closest('.nav-dropdown')) closeDropdowns(); });
document.addEventListener('focusin', e => {
  document.querySelectorAll('.nav-dropdown.is-open').forEach(item => {
    if (!item.contains(e.target)) { item.classList.remove('is-open'); item.querySelector('button').setAttribute('aria-expanded', 'false'); }
  });
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const activeDropdown = document.querySelector('.nav-dropdown.is-open');
  if (activeDropdown) { activeDropdown.querySelector('button').focus(); closeDropdowns(); }
  else if (menu?.getAttribute('aria-expanded') === 'true') { setMenu(false); menu.focus(); }
});
window.matchMedia('(min-width: 1024px)').addEventListener('change', e => { if (e.matches) setMenu(false); });

/* ---------- Header state, back-to-top ---------- */
const siteTop = document.querySelector('[data-site-top]');
const toTop = document.querySelector('[data-to-top]');
let lastY = window.scrollY;
const onScrollHeader = () => {
  const y = window.scrollY;
  siteTop?.classList.toggle('is-scrolled', y > 40);
  const navOpen = navigation?.classList.contains('is-open');
  siteTop?.classList.toggle('is-hidden', !navOpen && y > 500 && y > lastY + 4);
  if (y < lastY - 4 || y < 500) siteTop?.classList.remove('is-hidden');
  lastY = y;
  if (toTop) { toTop.hidden = false; toTop.classList.toggle('is-visible', y > 900); }
};
toTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));

/* ---------- Parallax (sets --py on elements) ---------- */
const parallaxItems = reduceMotion ? [] : [...document.querySelectorAll('[data-parallax]')];
const updateParallax = () => {
  const vh = window.innerHeight;
  parallaxItems.forEach(el => {
    const host = el.parentElement.getBoundingClientRect();
    if (host.bottom < -200 || host.top > vh + 200) return;
    const limit = Math.max(0, (el.offsetHeight - host.height) / 2 - 2);
    const raw = (host.top + host.height / 2 - vh / 2) * parseFloat(el.dataset.parallax) * -1;
    const offset = Math.max(-limit, Math.min(limit, raw));
    el.style.setProperty('--py', `${offset.toFixed(1)}px`);
  });
};
let ticking = false;
const onScroll = () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => { onScrollHeader(); updateParallax(); ticking = false; });
};
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll, { passive: true });
onScrollHeader(); updateParallax();

/* ---------- Hero slideshow ---------- */
const hero = document.querySelector('[data-hero]');
if (hero) {
  const SLIDE_MS = 7000;
  const slides = [...hero.querySelectorAll('[data-slide]')];
  const dots = [...hero.querySelectorAll('[data-dot]')];
  const caption = hero.querySelector('[data-hero-caption]');
  hero.style.setProperty('--slide-ms', `${SLIDE_MS}ms`);
  let index = 0, timer;
  const show = (next) => {
    index = (next + slides.length) % slides.length;
    slides.forEach((s, i) => {
      s.classList.toggle('is-prev', s.classList.contains('is-active') && i !== index);
      if (i !== index && !s.classList.contains('is-prev')) s.classList.remove('is-prev');
      s.classList.toggle('is-active', i === index);
      if (i === index) s.classList.add('was-shown');
    });
    dots.forEach((d, i) => {
      d.classList.remove('is-active'); d.removeAttribute('aria-current');
      if (i === index) { void d.offsetWidth; d.classList.add('is-active'); d.setAttribute('aria-current', 'true'); }
    });
    if (caption) caption.textContent = dots[index]?.dataset.caption || '';
  };
  const play = () => { clearInterval(timer); if (!reduceMotion) timer = setInterval(() => show(index + 1), SLIDE_MS); };
  dots.forEach((dot, i) => dot.addEventListener('click', () => { show(i); play(); }));
  document.addEventListener('visibilitychange', () => document.hidden ? clearInterval(timer) : play());
  if (reduceMotion) hero.classList.add('is-paused');
  play();
}

/* ---------- Scroll reveal ---------- */
const revealItems = document.querySelectorAll('[data-reveal]');
const settle = (el) => {
  el.classList.add('is-visible');
  const delay = (parseFloat(getComputedStyle(el).getPropertyValue('--d')) || 0) * 110;
  setTimeout(() => { el.removeAttribute('data-reveal'); el.classList.remove('is-visible'); }, 1200 + delay);
};
if ('IntersectionObserver' in window && !reduceMotion) {
  const io = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    settle(entry.target); io.unobserve(entry.target);
  }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  revealItems.forEach(el => io.observe(el));
} else revealItems.forEach(el => el.removeAttribute('data-reveal'));

/* ---------- Animated counters ---------- */
const counters = document.querySelectorAll('[data-count]');
if ('IntersectionObserver' in window && !reduceMotion) {
  const countIo = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target, target = +el.dataset.count, start = performance.now(), DURATION = 1400;
    const step = (now) => {
      const p = Math.min((now - start) / DURATION, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step); countIo.unobserve(el);
  }), { threshold: 0.6 });
  counters.forEach(el => countIo.observe(el));
}

/* ---------- Carousels & drag-to-scroll ---------- */
document.querySelectorAll('[data-carousel]').forEach(carousel => {
  const track = carousel.querySelector('.carousel-track');
  const section = carousel.closest('section');
  const prev = section.querySelector('[data-carousel-prev]');
  const next = section.querySelector('[data-carousel-next]');
  const bar = carousel.querySelector('[data-carousel-bar]');
  const stepSize = () => (track.firstElementChild?.getBoundingClientRect().width || 300) + parseFloat(getComputedStyle(track).columnGap || 0);
  const update = () => {
    const max = track.scrollWidth - track.clientWidth;
    const ratio = track.clientWidth / track.scrollWidth;
    if (bar) { bar.style.width = `${ratio * 100}%`; bar.style.transform = `translateX(${max > 0 ? (track.scrollLeft / max) * ((1 / ratio) - 1) * 100 : 0}%)`; }
    if (prev) prev.disabled = track.scrollLeft < 4;
    if (next) next.disabled = track.scrollLeft > max - 4;
  };
  prev?.addEventListener('click', () => track.scrollBy({ left: -stepSize() }));
  next?.addEventListener('click', () => track.scrollBy({ left: stepSize() }));
  track.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
  window.addEventListener('resize', update);
  update();
});
document.querySelectorAll('[data-drag-scroll]').forEach(track => {
  let startX = 0, startScroll = 0, moved = false, down = false;
  track.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || track.scrollWidth <= track.clientWidth) return;
    down = true; moved = false; startX = e.clientX; startScroll = track.scrollLeft;
  });
  window.addEventListener('pointermove', e => {
    if (!down) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 6) { moved = true; track.classList.add('is-dragging'); }
    if (moved) track.scrollLeft = startScroll - dx;
  });
  window.addEventListener('pointerup', () => { if (!down) return; down = false; setTimeout(() => track.classList.remove('is-dragging'), 0); });
  track.addEventListener('click', e => { if (moved) { e.preventDefault(); moved = false; } }, true);
  track.addEventListener('dragstart', e => e.preventDefault());
});

/* ---------- Button colour fill follows the pointer ---------- */
document.addEventListener('pointerover', e => {
  const btn = e.target.closest('.button');
  if (!btn) return;
  const r = btn.getBoundingClientRect();
  btn.style.setProperty('--x', `${e.clientX - r.left}px`);
  btn.style.setProperty('--y', `${e.clientY - r.top}px`);
});

/* ---------- Touch feedback for cards and buttons ---------- */
const TOUCH_TARGETS = '.button,.dest-card,.service-card,.package-card,.safari-card,.vehicle-card,.moment,.destination-item,.benefit,.service-dock a';
document.addEventListener('touchstart', e => {
  const el = e.target.closest(TOUCH_TARGETS);
  if (!el) return;
  el.classList.add('is-touched');
  setTimeout(() => el.classList.remove('is-touched'), 650);
}, { passive: true });

/* ---------- WhatsApp chat widget ---------- */
const waWidget = document.querySelector('[data-wa-widget]');
if (waWidget) {
  const toggle = waWidget.querySelector('[data-wa-toggle]');
  const panel = waWidget.querySelector('.wa-panel');
  toggle.setAttribute('role', 'button');
  toggle.setAttribute('aria-controls', panel.id);
  toggle.setAttribute('aria-expanded', 'false');
  const setOpen = (open) => {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) panel.querySelector('.wa-topics a')?.focus({ preventScroll: true });
  };
  toggle.addEventListener('click', e => { e.preventDefault(); setOpen(panel.hidden); });
  waWidget.querySelector('[data-wa-close]').addEventListener('click', () => { setOpen(false); toggle.focus(); });
  document.addEventListener('click', e => { if (!panel.hidden && !waWidget.contains(e.target)) setOpen(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) { setOpen(false); toggle.focus(); } });
}

/* ---------- Package filters ---------- */
const filters = document.querySelector('[data-filters]');
if (filters) {
  const cards = [...document.querySelectorAll('.package-card')];
  const update = () => {
    const {region, style, duration, season} = Object.fromEntries(new FormData(filters));
    let count = 0;
    cards.forEach(card => {
      const matches = (!season || card.dataset.season === season) && (!region || card.dataset.region.split('|').includes(region)) && (!style || card.dataset.style === style) && (!duration || (duration === 'short' ? +card.dataset.days <= 6 : +card.dataset.days >= 7));
      card.hidden = !matches;
      if (matches) count++;
    });
    document.querySelector('[data-filter-count]').textContent = `${count} ${count === 1 ? 'journey' : 'journeys'} to inspire you`;
    document.querySelector('[data-no-results]').hidden = count !== 0;
  };
  filters.addEventListener('change', update);
  filters.addEventListener('reset', () => setTimeout(update, 0));
  filters.addEventListener('submit', e => e.preventDefault());
  const query = new URLSearchParams(location.search);
  for (const select of filters.querySelectorAll('select')) {
    const value = query.get(select.name);
    if (value && [...select.options].some(option => option.value === value)) select.value = value;
  }
  update();
}

document.querySelectorAll('[data-enquiry]').forEach(form => {
  form.querySelector('[data-enable-form]').disabled = false;
  const date = form.elements.date;
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  date.min = today;
  const interest = new URLSearchParams(location.search).get('interest');
  if (interest) {
    const safeInterest = interest.slice(0, 200);
    form.elements.message.value = `I’m interested in ${safeInterest}.`;
    form.querySelectorAll('[name="destinations"]').forEach(field => { if (field.value === safeInterest) field.checked = true; });
  }
  let previousUrl;
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    if (data.get('website')) return;
    const labels = { name:'Name', phone:'Phone', email:'Email', city:'Starting city', date:'Preferred date', duration:'Trip duration (days)', adults:'Adults / travellers', children:'Children', destinations:'Preferred destinations', services:'Services', style:'Travel style', budget:'Budget preference', requirements:'Special requirements', message:'Message' };
    const rows = ['NC INSIGHTS — TRAVEL ENQUIRY', '', ...Object.entries(labels).flatMap(([key, label]) => {
      const values = data.getAll(key).map(value => String(value).trim()).filter(Boolean);
      return values.length ? [`${label}: ${values.join(', ')}`] : [];
    }), '', 'This is an enquiry, not a confirmed booking.'];
    const summary = rows.join('\n');
    const feedback = form.querySelector('.form-feedback');
    feedback.querySelector('[data-enquiry-summary]').textContent = summary;
    if (previousUrl) URL.revokeObjectURL(previousUrl);
    previousUrl = URL.createObjectURL(new Blob([summary], { type: 'text/plain;charset=utf-8' }));
    feedback.querySelector('[data-download]').href = previousUrl;
    const send = feedback.querySelector('[data-send]');
    const email = form.dataset.email;
    const whatsapp = form.dataset.whatsapp;
    if (whatsapp || email) {
      send.hidden = false;
      send.href = whatsapp ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(summary)}` : `mailto:${email}?subject=${encodeURIComponent('My Northeast India travel enquiry')}&body=${encodeURIComponent(summary)}`;
      send.textContent = whatsapp ? 'Open WhatsApp to send →' : 'Open email to send →';
      feedback.querySelector('[data-feedback-message]').textContent = 'Your enquiry has not been sent. Review the details, then open your email or WhatsApp app to send it. You can also download a copy.';
    } else {
      send.hidden = true;
      feedback.querySelector('[data-feedback-message]').textContent = 'Your details have not been sent. Business contact details are still being added. Download this summary to keep your plans, then contact NC Insights once its contact information is available.';
    }
    feedback.hidden = false;
    feedback.focus({preventScroll:true});
    feedback.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});
  });
});
