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
  // Measure everything first, then write, so one element's update doesn't force layout for the next.
  const updates = parallaxItems.map(el => {
    const host = el.parentElement.getBoundingClientRect();
    if (host.bottom < -200 || host.top > vh + 200) return null;
    const limit = Math.max(0, (el.offsetHeight - host.height) / 2 - 2);
    const raw = (host.top + host.height / 2 - vh / 2) * parseFloat(el.dataset.parallax) * -1;
    return [el, Math.max(-limit, Math.min(limit, raw))];
  });
  updates.forEach(update => { if (update) update[0].style.setProperty('--py', `${update[1].toFixed(1)}px`); });
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
  // Read the stagger index from the inline style: getComputedStyle here would force a full style
  // recalculation for every revealed element (hundreds of milliseconds on phones).
  const delay = (parseFloat(el.style.getPropertyValue('--d')) || 0) * 110;
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
  // Measure only when the carousel nears the viewport: measuring at start-up would force layout of
  // below-the-fold content that the browser otherwise skips (content-visibility: auto).
  if ('IntersectionObserver' in window) {
    const seen = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { update(); seen.disconnect(); } }, { rootMargin: '200px 0px' });
    seen.observe(carousel);
  } else update();
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


/* ---------- Enquiry forms ----------
   Without JavaScript the forms POST to /api/enquiry and the server redirects to /thank-you/.
   With JavaScript: inline validation (rules shared with the server), background sending with a
   20-second timeout, error states that never clear the visitor's entries, and a WhatsApp option. */
const rulesScript = document.getElementById('enquiry-rules');
const enquiryConfig = rulesScript ? JSON.parse(rulesScript.textContent) : null;
const REQUEST_TIMEOUT_MS = 20000;
const WHATSAPP_TEXT_LIMIT = 1500;
const EMAIL_PATTERN = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:".]+(\.[^\s@<>()[\]\\,;:".]+)+$/;
const PHONE_CHARACTERS = /^[+()\-.\s0-9]+$/;
const DRAFT_EXCLUDE = new Set(['ts', 'page', 'website', 'consent', 'form_type']);
const SUMMARY_LABELS = [['name', 'Name'], ['phone', 'Phone'], ['email', 'Email'], ['date', 'Travel date'], ['adults', 'Travellers'], ['destinations', 'Destinations'], ['message', 'Message']];

const sessionStore = (() => {
  try { const store = window.sessionStorage; store.setItem('__ne', '1'); store.removeItem('__ne'); return store; } catch { return null; }
})();
const pad = (n) => String(n).padStart(2, '0');
const localDate = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Same checks and messages as the server (src/lib/enquiry-rules.mjs). Min/max lengths are checked
    by hand because validity.tooShort does not fire for autofilled or scripted values. */
const checkValue = (rule, value) => {
  const m = rule.messages;
  if (!value) return rule.required ? m.required : '';
  if (rule.format === 'consent') return '';
  if (rule.minLength && value.length < rule.minLength) return m.minLength;
  if (rule.maxLength && value.length > rule.maxLength) return m.maxLength;
  if (rule.format === 'email' && !EMAIL_PATTERN.test(value)) return m.format;
  if (rule.format === 'phone') {
    const digits = (value.match(/\d/g) || []).length;
    if (!PHONE_CHARACTERS.test(value) || digits < rule.minDigits || digits > rule.maxDigits) return m.format;
  }
  if (rule.format === 'integer' && (!/^\d+$/.test(value) || +value < rule.min || +value > rule.max)) return m.format;
  if (rule.format === 'date') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) return m.format;
    const today = localDate();
    if (value < today) return m.past;
    if (value > `${+today.slice(0, 4) + 3}${today.slice(4)}`) return m.far;
  }
  return '';
};

const initEnquiryForm = (form) => {
  const { fields: rules, phone, email, whatsapp } = enquiryConfig;
  const status = form.querySelector('[data-form-status]');
  const submit = form.querySelector('[data-submit]');
  const submitLabel = form.querySelector('[data-submit-label]');
  const idleLabel = submitLabel.textContent;
  const waSend = form.querySelector('[data-whatsapp-send]');
  const draftKey = `ne-enquiry-draft:${form.dataset.formType}`;
  let attempted = false;
  let sending = false;
  let sent = false;
  let draftTimer;

  form.noValidate = true;
  form.elements.ts.value = String(Date.now());
  form.elements.page.value = location.href.split('#')[0];
  if (form.elements.date) form.elements.date.min = localDate();

  const controls = (name) => [...form.querySelectorAll(`[name="${name}"]`)];
  const box = (name) => form.querySelector(`[data-field="${name}"]`);
  const firstControl = (name) => box(name)?.querySelector('input,select,textarea');
  const valueOf = (name) => {
    const els = controls(name);
    if (!els.length) return null;
    if (els[0].type === 'checkbox') return name === 'consent' ? (els[0].checked ? 'on' : '') : els.filter(el => el.checked).map(el => el.value);
    return els[0].value.trim();
  };
  const collect = () => {
    const data = {};
    for (const el of form.elements) if (el.name && !(el.name in data)) data[el.name] = valueOf(el.name);
    return data;
  };

  /* Draft kept in sessionStorage so a reload or failed send never loses what the visitor typed. */
  const saveDraft = () => {
    if (!sessionStore || sent) return;
    const data = Object.fromEntries(Object.entries(collect()).filter(([name]) => !DRAFT_EXCLUDE.has(name)));
    try { sessionStore.setItem(draftKey, JSON.stringify(data)); } catch { /* storage full or blocked */ }
  };
  const clearDraft = () => { try { sessionStore?.removeItem(draftKey); } catch { /* ignore */ } };
  const restoreDraft = () => {
    let data = null;
    try { data = JSON.parse(sessionStore?.getItem(draftKey) || 'null'); } catch { return; }
    if (!data) return;
    for (const [name, value] of Object.entries(data)) {
      const els = controls(name);
      if (!els.length) continue;
      if (Array.isArray(value)) els.forEach(el => { el.checked = value.includes(el.value); });
      else if (typeof value === 'string' && value) els[0].value = value;
    }
  };
  restoreDraft();

  const interest = new URLSearchParams(location.search).get('interest');
  if (interest) {
    const topic = interest.slice(0, 150);
    form.elements.topic.value = topic;
    if (!form.elements.message.value) form.elements.message.value = `I’m interested in ${topic}.`;
    controls('destinations').forEach(el => { if (el.value === topic) el.checked = true; });
  }

  const setFieldError = (name, message) => {
    const container = box(name);
    if (!container) return;
    const error = container.querySelector('.field-error');
    const hint = container.querySelector('.field-hint');
    error.textContent = message;
    error.hidden = !message;
    container.classList.toggle('has-error', !!message);
    container.querySelectorAll('input,select,textarea').forEach(el => {
      const describedBy = [message ? error.id : '', hint?.id].filter(Boolean).join(' ');
      if (message) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
      if (describedBy) el.setAttribute('aria-describedby', describedBy); else el.removeAttribute('aria-describedby');
    });
  };
  const validateField = (name) => {
    const rule = rules[name];
    const value = valueOf(name);
    if (!rule || value === null || Array.isArray(value)) return '';
    const message = checkValue(rule, value);
    setFieldError(name, message);
    return message;
  };
  // Validate in on-screen order so the summary and focus follow the layout.
  const validateAll = () => [...form.querySelectorAll('[data-field]')].map(el => el.dataset.field).filter(name => rules[name]).map(name => [name, validateField(name)]).filter(([, message]) => message);

  const summaryText = () => {
    const data = collect();
    const lines = SUMMARY_LABELS.map(([key, label]) => [label, Array.isArray(data[key]) ? data[key].join(', ') : data[key]]).filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`);
    const topic = data.topic ? ` about ${data.topic}` : '';
    return [`Hello NE Insights, I would like to enquire${topic}.`, ...lines].join('\n').slice(0, WHATSAPP_TEXT_LIMIT);
  };
  const link = (text, href, external = false) => {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = text;
    if (external) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    return a;
  };
  const hideStatus = () => { status.hidden = true; status.replaceChildren(); };
  const showStatus = (kind, title, message = '', { errors = [], alternatives = false } = {}) => {
    status.className = `form-status is-${kind}`;
    status.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    const heading = document.createElement('p');
    heading.className = 'form-status-title';
    heading.textContent = title;
    const parts = [heading];
    if (message) { const p = document.createElement('p'); p.textContent = message; parts.push(p); }
    if (errors.length) {
      const list = document.createElement('ul');
      for (const [name, text] of errors) {
        const target = firstControl(name);
        const item = document.createElement('li');
        const a = link(text, `#${target?.id || ''}`);
        a.addEventListener('click', (e) => { e.preventDefault(); target?.focus(); });
        item.append(a);
        list.append(item);
      }
      parts.push(list);
    }
    if (alternatives) {
      const p = document.createElement('p');
      p.className = 'form-status-alt';
      const body = summaryText();
      p.append('Reach us directly: ', link(`call ${phone}`, `tel:${phone.replace(/\s/g, '')}`), ', ', link('WhatsApp', `https://wa.me/${whatsapp}?text=${encodeURIComponent(body)}`, true), ' or ', link(`email ${email}`, `mailto:${email}?subject=${encodeURIComponent('Travel enquiry')}&body=${encodeURIComponent(body)}`), '.');
      parts.push(p);
    }
    status.replaceChildren(...parts);
    status.hidden = false;
  };
  const setSending = (on) => {
    sending = on;
    submit.disabled = on;
    waSend?.setAttribute('aria-disabled', String(on));
    form.setAttribute('aria-busy', String(on));
    submitLabel.textContent = on ? 'Sending…' : idleLabel;
  };
  const showOffline = () => showStatus('warning', 'You appear to be offline.', 'Your details are safe in this form. Reconnect to the internet and press Send again, or contact us directly.', { alternatives: true });

  form.addEventListener('focusout', (e) => {
    const name = e.target.name;
    if (!rules[name] || e.target.type === 'checkbox') return;
    if (attempted || valueOf(name)) validateField(name);
  });
  form.addEventListener('input', (e) => {
    const name = e.target.name;
    if (rules[name] && box(name)?.classList.contains('has-error')) validateField(name);
    clearTimeout(draftTimer);
    draftTimer = setTimeout(saveDraft, 300);
  });
  form.addEventListener('change', (e) => { if (e.target.name === 'consent' && attempted) validateField('consent'); saveDraft(); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sending) return;
    attempted = true;
    const errors = validateAll();
    if (errors.length) {
      showStatus('error', errors.length === 1 ? 'Please correct 1 field:' : `Please correct ${errors.length} fields:`, '', { errors });
      firstControl(errors[0][0])?.focus();
      return;
    }
    if (navigator.onLine === false) { showOffline(); status.focus(); return; }
    hideStatus();
    setSending(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let response;
    let body = {};
    try {
      response = await fetch(form.action, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(collect()), signal: controller.signal, credentials: 'same-origin' });
      body = await response.json().catch(() => ({}));
    } catch (error) {
      clearTimeout(timer);
      setSending(false);
      if (error.name === 'AbortError') showStatus('warning', 'This is taking longer than expected.', 'We stopped waiting after 20 seconds, so your enquiry may not have been sent. Your details are still in the form. Please try again in a moment, or contact us directly.', { alternatives: true });
      else if (navigator.onLine === false) showOffline();
      else showStatus('error', 'We couldn’t reach our server.', 'Please check your connection and try again. Your details are still in the form.', { alternatives: true });
      status.focus();
      return;
    }
    clearTimeout(timer);
    if (response.ok && body.ok) {
      // Stop any pending draft save so the details don't reappear in storage after a successful send.
      sent = true;
      clearTimeout(draftTimer);
      clearDraft();
      location.assign(body.redirect || '/thank-you/');
      return;
    }
    setSending(false);
    if (response.status === 422 && body.errors) {
      const list = Object.entries(body.errors);
      list.forEach(([name, message]) => setFieldError(name, message));
      showStatus('error', list.length === 1 ? 'Please correct 1 field:' : `Please correct ${list.length} fields:`, '', { errors: list });
      firstControl(list[0][0])?.focus();
      return;
    }
    if (response.status === 429) showStatus('warning', 'Please wait a few minutes.', body.message || 'You have sent several enquiries in a short time.', { alternatives: true });
    else showStatus('error', 'Your enquiry was not sent.', body.message || 'Something went wrong on our side. Your details are still in the form.', { alternatives: true });
    status.focus();
  });

  // Returning with the Back button restores the page from cache with the button still disabled.
  window.addEventListener('pageshow', () => { if (sending) setSending(false); sent = false; });

  // WhatsApp alternative: opens WhatsApp with the form contents. Not subject to the bot timer.
  waSend?.addEventListener('click', (e) => {
    if (sending) { e.preventDefault(); return; }
    waSend.href = `https://wa.me/${whatsapp}?text=${encodeURIComponent(summaryText())}`;
  });
};

if (enquiryConfig) document.querySelectorAll('[data-enquiry]').forEach(initEnquiryForm);
