// "Traveller stories" homepage section: approved testimonials (src/data/testimonials.mjs) and the
// "Share your experience" feedback dialog. With no approved testimonials the section shows an invitation
// instead of an empty carousel. Submissions are emailed for review and never rendered automatically.
import {testimonials as approved} from '../data/testimonials.mjs';
import {RATING_MAX} from '../lib/enquiry-rules.mjs';
import {feedbackForm} from './forms.mjs';
import {arrow,esc,icon,sectionHead} from './ui.mjs';

/** @typedef {{id:string,name:string,rating:number,text:string,journey?:string,location?:string,date?:string,featured?:boolean}} Testimonial */

export const DIALOG_ID='share-your-experience';
const PUBLIC_KEYS=new Set(['id','name','rating','text','journey','location','date','featured']);
const OPTIONAL_TEXT=['journey','location','date'];
const MIN_TEXT=20;
// Private details must never reach a public page, even by accident in the review text.
const EMAIL_LIKE=/[^\s@]+@[^\s@]+\.[a-z]{2,}/i;
const PHONE_LIKE=/\+?\d[\d\s().-]{8,}\d/;
/** Cards revealed with a stagger; later cards are off-screen in the carousel and appear as they scroll in. */
const STAGGERED=3;

/** @param {Record<string,unknown>} t @param {string} where @returns {string[]} */
const entryProblems=(t,where)=>{
  const problems=[];
  const extra=Object.keys(t).filter(key=>!PUBLIC_KEYS.has(key));
  if(extra.length)problems.push(`${where}: remove ${extra.join(', ')} (only ${[...PUBLIC_KEYS].join(', ')} may be published)`);
  if(typeof t.name!=='string'||!t.name.trim())problems.push(`${where}: name is required`);
  if(typeof t.rating!=='number'||!Number.isInteger(t.rating)||t.rating<1||t.rating>RATING_MAX)problems.push(`${where}: rating must be a whole number from 1 to ${RATING_MAX}`);
  if(typeof t.text!=='string'||t.text.trim().length<MIN_TEXT)problems.push(`${where}: text is required (at least ${MIN_TEXT} characters)`);
  for(const key of OPTIONAL_TEXT)if(t[key]!==undefined&&typeof t[key]!=='string')problems.push(`${where}: ${key} must be text`);
  if(t.featured!==undefined&&typeof t.featured!=='boolean')problems.push(`${where}: featured must be true or false`);
  const shown=[t.name,t.text,...OPTIONAL_TEXT.map(key=>t[key])].filter(value=>typeof value==='string').join(' ');
  if(EMAIL_LIKE.test(shown)||PHONE_LIKE.test(shown))problems.push(`${where}: appears to contain an email address or phone number`);
  return problems;
};

/**
 * Checks the approved list at build time, so an incomplete entry or private data fails the build instead
 * of reaching the website. Returns featured entries first, otherwise in file order.
 * @param {readonly unknown[]} list
 * @returns {Testimonial[]}
 */
export const checkTestimonials=list=>{
  const ids=new Set();
  const problems=list.flatMap((entry,i)=>{
    const t=/** @type {Record<string,unknown>} */(entry&&typeof entry==='object'?entry:{});
    const where=`testimonials[${i}]${typeof t.id==='string'?` "${t.id}"`:''}`;
    const idProblem=typeof t.id!=='string'||!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(t.id)?`${where}: id must be lowercase and hyphenated`:ids.has(t.id)?`${where}: duplicate id`:null;
    ids.add(t.id);
    return [...(idProblem?[idProblem]:[]),...entryProblems(t,where)];
  });
  if(problems.length)throw new Error(`Fix src/data/testimonials.mjs:\n  ${problems.join('\n  ')}`);
  const valid=/** @type {Testimonial[]} */(list);
  return [...valid.filter(t=>t.featured),...valid.filter(t=>!t.featured)];
};

/** Rating as stars with a text alternative; filled and outline stars differ in shape, not only colour. */
export const starRating=rating=>`<span class="stars" role="img" aria-label="Rated ${rating} out of ${RATING_MAX}">${Array.from({length:RATING_MAX},(_,i)=>icon('star',i<rating?'is-filled':'')).join('')}</span>`;

/** Initials stand in for a photo: no portraits unless real, approved photographs are supplied. */
const initials=name=>name.trim().split(/\s+/).slice(0,2).map(word=>[...word][0]).join('').toUpperCase();
const paragraphs=text=>text.trim().split(/\n+/).map(line=>`<p>${esc(line.trim())}</p>`).join('');

/** @param {Testimonial} t @param {number} i */
const storyCard=(t,i)=>{
  const meta=[t.journey,t.location].filter(Boolean).map(esc).join(' · ');
  const reveal=i<STAGGERED?` data-reveal style="--d:${i}"`:'';
  return `<figure class="story-card"${reveal}><span class="story-mark" aria-hidden="true">“</span><div class="story-top">${starRating(t.rating)}</div><blockquote class="story-text">${paragraphs(t.text)}</blockquote><figcaption class="story-by"><span class="story-avatar" aria-hidden="true">${esc(initials(t.name))}</span><span><strong>${esc(t.name)}</strong>${meta?`<span class="story-meta">${meta}</span>`:''}${t.date?`<span class="story-date">${esc(t.date)}</span>`:''}</span></figcaption></figure>`;
};

const shareButton=()=>`<a class="button primary" href="#${DIALOG_ID}" data-feedback-open><span>Share Your Experience</span>${arrow}</a>`;
// A dashed route between two stops over a ridgeline: the same visual language as the itineraries and footer.
const SHARE_ART='<svg class="share-art" viewBox="0 0 320 220" aria-hidden="true" focusable="false"><path class="share-route" d="M14 200c40-4 54-38 98-42s58 24 100 14 44-46 96-58"/><circle cx="14" cy="200" r="5"/><circle cx="308" cy="114" r="5"/><path class="share-ridge" d="M0 220v-36l44-20 38 16 50-36 44 28 38-16 48 30 58-30v64Z"/></svg>';

const sharePanel=(title,text)=>`<div class="share-panel" data-reveal="right">${SHARE_ART}<p class="eyebrow yellow">YOUR STORY</p><h3>${title}</h3><p>${text}</p>${shareButton()}<p class="share-note">${icon('shield')}<span>Submitted feedback is reviewed by the NE Insights team before anything is published on the website.</span></p></div>`;
const SHARE_TEXT='We’d love to hear about your experience. Your feedback helps us improve and may help future travellers plan their Northeast journey with confidence.';

const INTRO='Every journey through the Northeast becomes a story of its own.';
const TITLE='Journeys remembered. Stories shared.';

/** @param {Testimonial[]} stories */
const storiesView=stories=>{
  const cards=stories.map(storyCard).join('');
  const carousel=`<div class="carousel-top stories-top" data-reveal><div class="carousel-nav"><button type="button" class="carousel-btn" data-carousel-prev aria-label="Previous traveller stories">${icon('left')}</button><button type="button" class="carousel-btn" data-carousel-next aria-label="Next traveller stories">${icon('right')}</button></div></div><div class="carousel" data-carousel><div class="carousel-track story-track" data-drag-scroll tabindex="0" role="region" aria-label="Traveller stories">${cards}</div><div class="carousel-progress" aria-hidden="true"><span data-carousel-bar></span></div></div>`;
  return `<div class="container">${sectionHead('TRAVELLER STORIES',TITLE,`${INTRO} Read experiences shared by our travellers — or tell us about yours.`)}<div class="stories-layout"><div class="stories-main">${stories.length>1?carousel:`<div class="story-single">${cards}</div>`}</div>${sharePanel('Travelled with NE Insights?',SHARE_TEXT)}</div></div>`;
};

const PROCESS=[['chat','You share your story','Tell us about your journey, in your own words.'],['shield','Our team reviews it','Every submission is read by the NE Insights team first.'],['heart','It may inspire others','With your permission, selected stories are featured on our website.']];
/** How feedback becomes a published story (homepage empty state and the /feedback/ page). */
const processList=(reveal=true)=>`<ol class="story-process">${PROCESS.map(([i,t,d],n)=>`<li${reveal?` data-reveal style="--d:${n}"`:''}><span class="story-process-icon">${icon(i)}</span><div><h3>${t}</h3><p>${d}</p></div></li>`).join('')}</ol>`;
const emptyView=()=>`<div class="container stories-empty"><div class="stories-intro">${sectionHead('TRAVELLER STORIES',TITLE,`${INTRO} Travelled with us? We’d love to hear yours.`)}${processList()}</div>${sharePanel('Your journey could inspire the next one.',`Travelled with NE Insights? ${SHARE_TEXT}`)}</div>`;

const REQUIRED_NOTE='Fields marked <span aria-hidden="true">*</span><span class="sr-only">with an asterisk</span> are required.';
const FORM_INTRO=`Tell us how your Northeast journey went. Your email address and phone number are only for our team and are never published. ${REQUIRED_NOTE}`;

/**
 * The feedback form in a native <dialog>. Without JavaScript (or <dialog> support) CSS shows it inline
 * below the section and "Share Your Experience" is a plain link to it.
 */
const feedbackDialog=()=>`<dialog class="feedback-dialog" id="${DIALOG_ID}" aria-labelledby="feedback-title" aria-describedby="feedback-intro" data-feedback-dialog><div class="feedback-dialog-inner"><div class="feedback-dialog-head"><div><p class="eyebrow">TRAVELLER STORIES</p><h2 id="feedback-title">Share your experience</h2></div><button type="button" class="dialog-close" data-feedback-close aria-label="Close feedback form"><span></span><span></span></button></div><div class="feedback-dialog-body"><p class="form-intro" id="feedback-intro">${FORM_INTRO}</p>${feedbackForm('feedback-title')}</div></div></dialog>`;

/**
 * Body of the shareable /feedback/ page: the form inline (no dialog), how review works, and every
 * approved testimonial below it. Without approved testimonials that last section is left out.
 * @param {readonly unknown[]} [list]
 */
export const feedbackPageContent=(list=approved)=>{
  const stories=checkTestimonials(list);
  const form=`<div class="feedback-sheet"><p class="eyebrow">TRAVELLER STORIES</p><h2 id="feedback-page-title">Share your experience</h2><p class="form-intro">${FORM_INTRO}</p>${feedbackForm('feedback-page-title')}</div>`;
  const side=`<aside class="form-side"><h2>How traveller stories work</h2><p>Every journey through the Northeast becomes a story of its own. Yours helps us improve and helps future travellers plan with confidence.</p>${processList(false)}</aside>`;
  const grid=stories.length?`<section class="section stories-section" id="traveller-stories"><div class="container">${sectionHead('TRAVELLER STORIES',TITLE,'Experiences shared by travellers who explored the Northeast with us.')}<div class="story-grid">${stories.map(storyCard).join('')}</div></div></section>`:'';
  return `<section class="section"><div class="container form-layout">${form}${side}</div></section>${grid}`;
};

/** @param {readonly unknown[]} [list] approved testimonials (tests pass fixtures; the site uses the data file) */
export const travellerStories=(list=approved)=>{
  const stories=checkTestimonials(list);
  return `<section class="section stories-section${stories.length?'':' is-empty'}" id="traveller-stories">${stories.length?storiesView(stories):emptyView()}</section>${feedbackDialog()}`;
};
