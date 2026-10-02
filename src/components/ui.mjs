import { site, destinations, services, vehicles, faqs } from '../data/site.mjs';
import imageManifest from '../data/image-manifest.json' with { type: 'json' };
import { miniForm } from './forms.mjs';

export const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

const ICON_PATHS = {
    arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>', left: '<path d="m15 18-6-6 6-6"/>', right: '<path d="m9 18 6-6-6-6"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    car: '<path d="M5 17h14M3 17v-4.5L5.5 7A2 2 0 0 1 7.3 6h9.4a2 2 0 0 1 1.8 1l2.5 5.5V17"/><path d="M3 12.5h18"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
    bed: '<path d="M3 4v17m18-11v11M3 17h18M3 10h15a3 3 0 0 1 3 3v4M7 10V7h5v3"/>',
    binoculars: '<path d="m4 8 2-5h3v10m6 0V3h3l2 5M9 10h6"/><circle cx="6" cy="15" r="5"/><circle cx="18" cy="15" r="5"/>',
    map: '<path d="m2 5 6-3 8 3 6-3v17l-6 3-8-3-6 3V5Zm6-3v17m8-14v17"/>',
    mountain: '<path d="m1 21 8-16 5 9 3-6 6 13H1Zm5-10 3 2 3-2"/>', leaf: '<path d="M20 3C8 1 2 9 5 16s17 7 15-13ZM4 21 16 8"/>',
    shield: '<path d="m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6l9-4Z"/><path d="m8 12 3 3 6-6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>', check: '<path d="m5 12 4 4L19 6"/>',
    people: '<circle cx="9" cy="7" r="4"/><path d="M1 22v-3a8 8 0 0 1 16 0v3m0-19a4 4 0 0 1 0 8m3 4a7 7 0 0 1 3 5v2"/>',
    chat: '<path d="M21 11a9 9 0 0 1-13 8l-6 3 2-6a9 9 0 1 1 17-5Z"/><path d="M8 10h8m-8 4h5"/>',
    phone: '<path d="m5 2 4 5-3 3a16 16 0 0 0 8 8l3-3 5 4-2 4C9 24 0 14 1 4l4-2Z"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 5 10 8L22 5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
    snow: '<path d="M12 2v20M4 6l16 12M4 18 20 6M9 3l3 3 3-3M9 21l3-3 3 3"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    route: '<circle cx="6" cy="19" r="3"/><circle cx="18" cy="5" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/>',
    compass: '<circle cx="12" cy="12" r="10"/><path d="m16 8-2 6-6 2 2-6 6-2Z"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/>',
    up: '<path d="M12 19V5m-6 6 6-6 6 6"/>',
    // Outline by default; CSS fills it (fill: currentColor or a colour) for selected/awarded stars.
    star: '<path d="m12 2.5 2.94 5.96 6.56.95-4.75 4.63 1.12 6.54L12 17.5l-5.87 3.08 1.12-6.54L2.5 9.41l6.56-.95L12 2.5Z"/>',
    whatsapp: '<path d="M12 2.5a9.5 9.5 0 0 0-8.2 14.3L2.5 21.5l4.8-1.3A9.5 9.5 0 1 0 12 2.5Z"/><path fill="currentColor" stroke="none" d="M8.6 7.3c.3-.5.6-.5.9-.5h.6c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.4 0 .6l-.5.7c-.1.2-.2.3 0 .6a6 6 0 0 0 2.2 2.1c.3.2.4.1.6 0l.7-.8c.2-.2.3-.2.6-.1l1.8.9c.3.1.4.2.4.4 0 .6-.2 1.3-.7 1.7-.6.4-1.4.6-2.3.3a9.2 9.2 0 0 1-5.4-5.2c-.4-1-.3-1.9.1-2.5Z"/>', hotel: '<path d="M3 21h18M5 21V4h14v17M9 8h1m4 0h1M9 12h1m4 0h1M10 21v-4h4v4"/>'
};
export const icon = (name, cls = '') => `<svg class="icon ${cls}" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ICON_PATHS.arrow}</svg>`;
export const arrow = icon('arrow', 'btn-arrow');

/** Typical rendered width of card images; full-bleed images pass '100vw'. */
export const CARD_SIZES = '(min-width: 1200px) 400px, (min-width: 768px) 45vw, 100vw';
const imageEntry = (key) => {
    const entry = imageManifest[key];
    if (!entry) throw new Error(`Unknown image "${key}": add a master to source-files/images and run npm run images`);
    return entry;
};
/** URL of one generated size (the closest at or above `width`). */
export const imageUrl = (key, width = 800, format = 'webp') => {
    const { dir, widths } = imageEntry(key);
    const chosen = widths.find(w => w >= width) ?? widths.at(-1);
    return `/images/${dir}/${key}-${chosen}.${format}`;
};
export const imageSrcset = (key, format) => imageEntry(key).widths.map(w => `/images/${imageEntry(key).dir}/${key}-${w}.${format} ${w}w`).join(', ');
/** Open Graph crop (1200×630 JPEG) for a photo or illustration. */
export const ogImage = (key) => imageEntry(key).og ? `/images/og/${key}.jpg` : '/images/og/hero-journey.jpg';

/**
 * Responsive AVIF/WebP picture with intrinsic width/height (no layout shift).
 * Only the LCP image should be `eager`; everything else lazy-loads.
 */
export const image = (key, alt, cls = '', eager = false, sizes = CARD_SIZES) => {
    const { width, height } = imageEntry(key);
    return `<picture><source type="image/avif" srcset="${imageSrcset(key, 'avif')}" sizes="${sizes}"><img${cls ? ` class="${cls}"` : ''} src="${imageUrl(key)}" srcset="${imageSrcset(key, 'webp')}" sizes="${sizes}" alt="${esc(alt)}" width="${width}" height="${height}" loading="${eager ? 'eager' : 'lazy'}"${eager ? ' fetchpriority="high"' : ' decoding="async"'}></picture>`;
};

export const telHref = `tel:${site.phone.replace(/\s/g, '')}`;
export const waHref = (message = 'Hello NE Insights, I would like help planning a Northeast India trip.') => `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(message)}`;
/** WhatsApp + Call button pair. `topic` personalises the prefilled WhatsApp message. */
export const contactActions = (topic = '', cls = '') => `<div class="contact-actions ${cls}"><a class="button whatsapp small" href="${esc(waHref(topic ? `Hello NE Insights, I would like to enquire about ${topic}.` : undefined))}" target="_blank" rel="noopener noreferrer"${topic ? ` aria-label="WhatsApp us about ${esc(topic)}"` : ''}>${icon('whatsapp')}<span>WhatsApp</span></a><a class="button call small" href="${telHref}"${topic ? ` aria-label="Call now about ${esc(topic)}"` : ''}>${icon('phone')}<span>Call now</span></a></div>`;
/** Compact list of related internal links (cross-linking between overview and detail pages). */
export const relatedLinks = (items) => `<ul class="related-links">${items.map(([text, href]) => `<li><a href="${esc(href)}">${text} ${arrow}</a></li>`).join('')}</ul>`;
const SERVICE_LINKS = [['Car rental with driver', '/car-rental/'], ['Hotels & homestays', '/hotel-booking/'], ['Jungle safari planning', '/jungle-safari/'], ['Tour packages', '/tour-packages/']];
/** Links to the other services, for the bottom of each service page. */
export const otherServices = (current) => relatedLinks(SERVICE_LINKS.filter(([, href]) => href !== current));
export const button = (text, href, kind = 'primary') => `<a class="button ${kind}" href="${esc(href)}"><span>${text}</span>${arrow}</a>`;
/** Tour Operators Association of Assam associate-membership badge. */
export const membership = (cls = '') => `<div class="membership ${cls}">${image('toaa', 'Tour Operators Association of Assam (TOAA) logo', '', false, '96px')}<p><small>Associate Member</small><strong>Tour Operators Association of Assam</strong><span>TOAA</span></p></div>`;
/** Header/footer logo. Eager because it is above the fold on every page; it is small (≤ 240px wide). */
export const logo = (cls = '') => `<a class="brand ${cls}" href="/"><picture><source type="image/avif" srcset="${imageSrcset('logo', 'avif')}" sizes="120px"><img src="${imageUrl('logo', 240)}" srcset="${imageSrcset('logo', 'webp')}" sizes="120px" alt="NE Insights home" width="${imageManifest.logo.width}" height="${imageManifest.logo.height}"></picture></a>`;

const current = (on) => on ? ' aria-current="page"' : '';
const destinationMenu = () => `<div class="dropdown dropdown-destinations">${destinations.map(d => `<a href="/destinations/${d.slug}/">${image(d.image, '', 'dd-thumb', false, '64px')}<span>${d.name}<small>${d.tag}</small></span></a>`).join('')}<a class="dropdown-all" href="/destinations/">View all destinations ${arrow}</a></div>`;
const serviceMenu = () => `<div class="dropdown">${services.map(s => `<a href="/${s.slug}/">${icon(s.icon)}<span>${s.name}</span></a>`).join('')}</div>`;

export const header = (path) => `<a class="skip-link" href="#main">Skip to content</a><div class="site-top" data-site-top><div class="topbar"><div class="container topbar-inner"><span class="topbar-note">${icon('pin')} Exclusive travel services for Northeast India</span><div class="topbar-links"><a href="${telHref}">${icon('phone')} ${esc(site.phone)}</a><a href="mailto:${esc(site.email)}">${icon('mail')} ${esc(site.email)}</a><a class="topbar-pill" href="${esc(waHref())}" target="_blank" rel="noopener noreferrer">${icon('whatsapp')} Chat on WhatsApp</a></div></div></div><header class="site-header"><div class="container nav-wrap">${logo()}<nav id="navigation" aria-label="Main navigation"><div class="nav-panel-head">${logo('brand-small')}<button type="button" class="nav-close" data-nav-close aria-label="Close navigation"><span></span><span></span></button></div><a${current(path === '/')} href="/">Home</a><div class="nav-dropdown"><a${current(path.startsWith('/destinations'))} href="/destinations/">Destinations</a><button aria-label="Show destinations" aria-expanded="false" class="dropdown-toggle">${icon('chevron')}</button>${destinationMenu()}</div><div class="nav-dropdown"><a${current(['/services/', '/car-rental/', '/hotel-booking/', '/jungle-safari/'].includes(path))} href="/services/">Services</a><button class="dropdown-toggle" aria-label="Show services" aria-expanded="false">${icon('chevron')}</button>${serviceMenu()}</div><a${current(path.startsWith('/tour-packages'))} href="/tour-packages/">Packages</a><a${current(path === '/about/')} href="/about/">About</a><a${current(path === '/faq/')} href="/faq/">FAQs</a><a${current(path === '/contact/')} href="/contact/">Contact</a><div class="nav-panel-foot">${button('Plan My Trip', '/plan-my-trip/')}${contactActions()}<a href="${telHref}">${icon('phone')} ${esc(site.phone)}</a><a href="mailto:${esc(site.email)}">${icon('mail')} ${esc(site.email)}</a></div></nav><div class="nav-actions">${button('Plan My Trip', '/plan-my-trip/', 'primary nav-cta')}<button class="menu-toggle" aria-controls="navigation" aria-expanded="false" aria-label="Open navigation"><span></span><span></span><span></span></button></div></div></header></div><div class="nav-overlay" data-nav-overlay hidden></div>`;

const footerLinks = (title, links) => `<div class="footer-col"><h2>${title}</h2><ul>${links.map(([t, h]) => `<li><a href="${h}">${t}</a></li>`).join('')}</ul></div>`;
export const footer = () => `<footer class="footer"><svg class="footer-ridge" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true"><path d="M0 90V52l120-26 110 30 150-44 140 38 120-22 170 40 140-50 150 34 130-20 110 26 100-18v110Z"/></svg><div class="container footer-grid"><div class="footer-brand">${logo()}<p>Your trusted travel partner for exploring the natural beauty, rich culture and unique experiences of Northeast India.</p>${button('Plan My Trip', '/plan-my-trip/', 'primary small')}${membership('membership-footer')}</div>${footerLinks('Quick links', [['Home', '/'], ['Destinations', '/destinations/'], ['Tour packages', '/tour-packages/'], ['About us', '/about/'], ['FAQs', '/faq/'], ['Contact', '/contact/']])}${footerLinks('Our services', [...services.map(s => [s.name, `/${s.slug}/`]), ['Summer packages', '/tour-packages/summer/'], ['Winter packages', '/tour-packages/winter/'], ['Signature tours', '/tour-packages/signature/']])}<div class="footer-col footer-destinations"><h2>Top destinations</h2><ul>${destinations.map(d => `<li><a href="/destinations/${d.slug}/">${d.name}</a></li>`).join('')}</ul></div><div class="footer-col footer-contact"><h2>Contact us</h2><ul><li><a href="${telHref}">${icon('phone')} ${esc(site.phone)}</a></li><li><a href="${esc(waHref())}" target="_blank" rel="noopener noreferrer">${icon('whatsapp')} WhatsApp ${esc(site.phone)}</a></li><li><a href="mailto:${esc(site.email)}">${icon('mail')} ${esc(site.email)}</a></li><li><span>${icon('pin')} Northeast India</span></li></ul>${contactActions()}</div></div><div class="container footer-bottom"><span>© ${new Date().getFullYear()} NE Insights. All rights reserved.</span><div><a href="/privacy-policy/">Privacy policy</a><a href="/terms/">Terms &amp; conditions</a><a href="/image-credits/">Image credits</a><a href="/sitemap/">Sitemap</a></div></div></footer>${waWidget()}<button class="to-top" type="button" data-to-top aria-label="Back to top" hidden>${icon('up')}</button>`;

export const sectionHead = (eyebrow, title, desc = '', link = '', label = 'Explore more') => `<div class="section-head" data-reveal><div><p class="eyebrow">${eyebrow}</p><h2>${title}</h2></div>${desc ? `<p class="section-description">${desc}</p>` : ''}${link ? button(label, link, 'outline small') : ''}</div>`;

export const destinationCard = (d, full = false, i = 0) => full
    ? `<article class="destination-item" data-reveal style="--d:${i % 4}"><a class="destination-card" href="/destinations/${d.slug}/">${image(d.image, `${d.name}, Northeast India`)}<div class="destination-card-label"><small>${d.tag}</small><h3>${d.name}</h3><span class="circle-arrow">${arrow}</span></div></a><div class="destination-copy"><p>${d.intro}</p><p class="fine">${d.places.join(' · ')}</p><span class="info-line">${icon('clock')} ${d.days} <span>${icon('calendar')} ${d.season}</span></span></div></article>`
    : `<a class="dest-card" href="/destinations/${d.slug}/" data-reveal style="--d:${i}">${image(d.image, `${d.name}, Northeast India`)}<span class="dest-card-body"><small>${d.tag}</small><strong>${d.name}</strong><span class="dest-card-places">${d.places.slice(0, 3).join(' · ')}</span></span><span class="circle-arrow">${arrow}</span></a>`;

const COLLECTION_ICONS = { Summer: 'sun', Winter: 'snow', Signature: 'compass' };
export const packageCard = (p, i = 0) => `<article class="package-card" data-region="${esc(p.regions.join('|'))}" data-season="${p.season}" data-style="${esc(p.style)}" data-days="${p.days}"><a class="package-image" href="/tour-packages/${p.slug}/" tabindex="-1" aria-hidden="true">${image(p.image, '')}<span class="badge badge-${p.season.toLowerCase()}">${icon(COLLECTION_ICONS[p.season])} ${p.season} · ${p.code}</span>${p.featured ? '<span class="badge badge-tag">Featured</span>' : ''}</a><div class="package-copy"><h3><a href="/tour-packages/${p.slug}/">${p.name}</a></h3><div class="package-meta">${icon('clock')} ${p.days} Days / ${p.nights} Nights <span>${p.style}</span></div><p>${icon('route')} ${p.places}</p><a class="button navy small" href="/tour-packages/${p.slug}/"><span>View details</span>${arrow}</a></div></article>`;

export const serviceCard = (s, i = 0) => `<article class="service-card" data-reveal style="--d:${i}"><div class="service-copy"><span class="service-icon">${icon(s.icon)}</span><h3><a class="stretched-link" href="/${s.slug}/">${s.name}</a></h3><p>${s.text}</p><span class="text-link" aria-hidden="true">${s.cta} ${arrow}</span>${contactActions(s.name)}</div><div class="service-media">${image(s.image, s.name === 'Hotel Booking' ? 'Illustrative homestay cottage in the hills' : s.name)}</div></article>`;

export const trust = () => `<section class="trust-strip" aria-label="Our travel approach"><h2 class="sr-only">Our travel approach</h2><div class="container trust-grid">${[['mountain', 'Local Northeast expertise', 'Deep local knowledge & a trusted network'], ['hotel', 'Handpicked stays', 'Comfortable & authentic experiences'], ['car', 'Reliable vehicles', 'Well-maintained rides for every terrain'], ['map', 'Custom itineraries', 'Travel your way with expert planning']].map(([i, t, d], n) => `<div class="trust-item" data-reveal style="--d:${n}"><span class="trust-icon">${icon(i)}</span><div><h3>${t}</h3><p>${d}</p></div></div>`).join('')}</div></section>`;

export const fleet = () => `<div class="fleet-grid">${vehicles.map((v, i) => `<a class="vehicle-card" href="/car-rental/#${v.type}" data-reveal style="--d:${i}"><div class="vehicle-media">${image(v.image, `${v.name} — representative vehicle`)}</div><div class="vehicle-copy"><h3>${v.name}</h3><span class="vehicle-capacity">${icon('people')} ${v.capacity}</span><p>${v.use}</p><span class="text-link">Enquire ${arrow}</span></div></a>`).join('')}</div><p class="fine fleet-note">Photos show representative vehicle categories. Exact models are confirmed in your quotation.</p>`;

export const faqList = (items = faqs) => `<div class="faq-list">${items.map(([q, a]) => `<details><summary><span>${q}</span><i aria-hidden="true"></i></summary><div class="faq-answer"><p>${a}</p></div></details>`).join('')}</div>`;


export const cta = (mini = false) => `<section class="trip-cta${mini ? ' has-form' : ''}"><div class="trip-cta-bg" data-parallax="0.18">${image('traveller', 'Traveller looking out over misty valleys in Meghalaya', '', false, '100vw')}</div><div class="container trip-cta-inner"><div class="trip-cta-copy" data-reveal="left"><p class="eyebrow light">A JOURNEY WITH YOUR NAME ON IT</p><h2>Plan your custom<br><em>Northeast India trip.</em></h2><p>Share your travel plans and we’ll create a personalised itinerary just for you — at no extra cost.</p>${mini ? '' : `<div class="hero-buttons">${button('Plan My Northeast Trip', '/plan-my-trip/')}<a class="button whatsapp" href="${esc(waHref())}" target="_blank" rel="noopener noreferrer">${icon('whatsapp')}<span>Chat on WhatsApp</span></a></div>`}</div>${mini ? `<div data-reveal="right">${miniForm()}</div>` : ''}</div></section>`;

export const pageHero = (title, desc, img = 'hero', eyebrow = 'EXPLORE WITH NE INSIGHTS') => `<section class="page-hero"><div class="page-hero-media">${image(img, '', '', true, '100vw')}</div><div class="container page-hero-inner"><p class="eyebrow light">${eyebrow}</p><h1>${title}</h1><p>${desc}</p></div></section>`;
export const breadcrumbs = (items) => `<nav class="breadcrumbs" aria-label="Breadcrumb"><div class="container"><a href="/">Home</a>${items.map(([text, url]) => `<span aria-hidden="true">/</span>${url ? `<a href="${url}">${text}</a>` : `<span aria-current="page">${text}</span>`}`).join('')}</div></nav>`;

const WA_TOPICS = [['Tour packages', 'a Northeast India tour package'], ['Car rental', 'a car rental with driver'], ['Hotel booking', 'hotel booking'], ['Jungle safari', 'a jungle safari']];
/** Floating WhatsApp chat widget. Without JavaScript the toggle is a plain wa.me link. */
export const waWidget = () => `<div class="wa-widget" data-wa-widget><div class="wa-panel" id="wa-panel" role="dialog" aria-modal="false" aria-labelledby="wa-title" hidden><div class="wa-panel-head"><span class="wa-avatar"><img src="${imageUrl('logo', 120)}" alt="" width="${imageManifest.logo.width}" height="${imageManifest.logo.height}" loading="lazy" decoding="async"></span><div><strong id="wa-title">NE Insights</strong><small><i></i> Northeast India travel team</small></div><button type="button" class="wa-close" data-wa-close aria-label="Close WhatsApp chat"><span></span><span></span></button></div><div class="wa-panel-body"><p class="wa-bubble">Hello! Planning a trip to Northeast India? Tell us your dates, group size and interests — we’ll help you plan it.</p><p class="wa-label">Choose a topic to start:</p><div class="wa-topics">${WA_TOPICS.map(([t, msg]) => `<a href="${esc(waHref(`Hello NE Insights, I would like to enquire about ${msg}.`))}" target="_blank" rel="noopener noreferrer">${t}</a>`).join('')}</div></div><div class="wa-panel-foot"><a class="button whatsapp" href="${esc(waHref())}" target="_blank" rel="noopener noreferrer">${icon('whatsapp')}<span>Start WhatsApp chat</span></a><a class="wa-call" href="${telHref}">${icon('phone')} Or call ${esc(site.phone)}</a></div></div><a class="wa-toggle" href="${esc(waHref())}" target="_blank" rel="noopener noreferrer" data-wa-toggle aria-label="Chat with NE Insights on WhatsApp">${icon('whatsapp')}<span>Chat with us</span></a></div>`;
