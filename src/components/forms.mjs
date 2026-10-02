// Enquiry and feedback forms. They POST to the Netlify Function and work without JavaScript (303 → thank-you page).
// public/site.js adds inline validation, background sending, error states and the WhatsApp option.
import {site} from '../data/site.mjs';
import {CLIENT_RULES,ENQUIRY_ENDPOINT,ENQUIRY_FIELDS,FEEDBACK_FIELDS,FORM_TYPES,RATING_MAX,formKind,todayInIndia} from '../lib/enquiry-rules.mjs';
import {arrow,esc,icon,waHref,telHref} from './ui.mjs';

/** HTML validation attributes generated from the shared rules, so browser and server agree. */
const ruleAttrs=rule=>{
  const attrs=[];
  if(rule.required)attrs.push('required');
  if(rule.minLength)attrs.push(`minlength="${rule.minLength}"`);
  if(rule.maxLength)attrs.push(`maxlength="${rule.maxLength}"`);
  if(rule.format==='integer')attrs.push(`min="${rule.min}" max="${rule.max}" step="1" inputmode="numeric"`);
  // Brackets and hyphen are escaped because browsers compile pattern with the v flag.
  if(rule.format==='phone')attrs.push('pattern="[+0-9\\(\\)\\-. ]{10,25}"');
  return attrs.join(' ');
};
const REQUIRED_MARK=' <span class="required-mark" aria-hidden="true">*</span>';
const marker=rule=>rule.required?REQUIRED_MARK:'';

/**
 * One labelled field with a slot for its error message (linked by site.js through aria-describedby).
 * @param {string} prefix id prefix that keeps ids unique when a page has several forms
 */
const field=(prefix,name,{rules=ENQUIRY_FIELDS,type='text',label=rules[name].label,extra='',hint='',wide=false,textarea=false}={})=>{
  const id=`${prefix}-${name}`;
  const rule=rules[name];
  const hintHtml=hint?`<p class="field-hint" id="${id}-hint">${hint}</p>`:'';
  const describedBy=hint?` aria-describedby="${id}-hint"`:'';
  const control=textarea
    ?`<textarea id="${id}" name="${name}" rows="4" ${ruleAttrs(rule)}${describedBy} ${extra}></textarea>`
    :`<input id="${id}" name="${name}" type="${type}" ${ruleAttrs(rule)}${describedBy} ${extra}>`;
  return `<div class="field${wide?' span-two':''}" data-field="${name}"><label for="${id}">${label}${marker(rule)}</label>${hintHtml}${control}<p class="field-error" id="${id}-error" hidden></p></div>`;
};
const checkGroup=(prefix,name,legend,options)=>`<fieldset class="field span-two" data-field="${name}" id="${prefix}-${name}"><legend>${legend}</legend><div class="check-group">${options.map(o=>`<label><input type="checkbox" name="${name}" value="${esc(o)}">${esc(o)}</label>`).join('')}</div><p class="field-error" id="${prefix}-${name}-error" hidden></p></fieldset>`;
const select=(prefix,name,placeholder,rules=ENQUIRY_FIELDS)=>{
  const id=`${prefix}-${name}`;
  return `<div class="field" data-field="${name}"><label for="${id}">${rules[name].label}</label><select id="${id}" name="${name}"><option value="">${placeholder}</option>${rules[name].options.map(o=>`<option>${esc(o)}</option>`).join('')}</select><p class="field-error" id="${id}-error" hidden></p></div>`;
};

const PHONE_HINT='10–15 digits. Include the country code if you are outside India.';
const today=todayInIndia();

const hiddenFields=(type)=>`<input type="hidden" name="form_type" value="${type}"><input type="hidden" name="ts" value=""><input type="hidden" name="page" value=""><input type="hidden" name="topic" value=""><div class="honeypot" aria-hidden="true"><label for="${type}-website">Leave this field empty</label><input id="${type}-website" name="website" type="text" tabindex="-1" autocomplete="off"></div>`;

/** A required tick box with its own error slot (privacy consent, permission to publish). */
const checkbox=(prefix,name,labelHtml)=>`<div class="field consent-field" data-field="${name}"><div class="consent"><input id="${prefix}-${name}" type="checkbox" name="${name}" value="on" required><label for="${prefix}-${name}">${labelHtml}<span class="required-mark" aria-hidden="true"> *</span></label></div><p class="field-error" id="${prefix}-${name}-error" hidden></p></div>`;
const consent=(prefix,purpose='reply to my enquiry')=>checkbox(prefix,'consent',`I have read the <a href="/privacy-policy/">privacy policy</a> and agree to NE Insights using these details to ${purpose}.`);

const actions=(label)=>`<div class="form-actions"><button class="button primary" type="submit" data-submit><span data-submit-label>${label}</span>${arrow}</button><a class="button whatsapp" href="${esc(waHref())}" target="_blank" rel="noopener noreferrer" data-whatsapp-send>${icon('whatsapp')}<span>Send via WhatsApp</span></a></div>`;

const note=()=>`<p class="form-note">Fields marked <span aria-hidden="true">*</span><span class="sr-only">with an asterisk</span> are required. Your enquiry goes straight to our team at ${esc(site.email)}. Prefer to talk? Call <a href="${telHref}">${esc(site.phone)}</a>.</p>`;

/** Live region for the error summary, offline, timeout and delivery messages. */
const status=()=>`<div class="form-status" data-form-status tabindex="-1" hidden></div>`;

/** `data-rules` tells site.js which rule set (enquiry or feedback) validates this form. */
const formOpen=(type,cls='',label=`aria-label="${esc(FORM_TYPES[type])}"`)=>`<form class="enquiry-form${cls}" id="form-${type}" action="${ENQUIRY_ENDPOINT}" method="post" data-enquiry data-form-type="${type}" data-rules="${formKind(type)}" ${label}>`;

/** Full trip planner (/plan-my-trip/) or the shorter contact form (/contact/). */
export const enquiryForm=(full=true)=>{
  const type=full?'trip-planner':'contact';
  const p=type;
  return `${formOpen(type)}<h2>${full?'Tell us a little about your trip.':'Let’s talk travel.'}</h2><p class="form-intro">${full?'A few details are all we need to start shaping your journey.':'Share your plans, questions or a little travel inspiration.'}</p>${status()}${hiddenFields(type)}<div class="form-grid">${field(p,'name',{extra:'autocomplete="name"'})}${field(p,'phone',{type:'tel',extra:'autocomplete="tel"',hint:PHONE_HINT})}${field(p,'email',{type:'email',extra:'autocomplete="email" spellcheck="false"',wide:!full})}${full?field(p,'city',{extra:'autocomplete="address-level2"'}):''}${field(p,'date',{type:'date',extra:`min="${today}"`})}${full?field(p,'duration',{type:'number'}):''}${field(p,'adults',{type:'number',label:full?'Adults':'Number of travellers',extra:'value="2"'})}${full?field(p,'children',{type:'number',extra:'value="0"'}):''}${checkGroup(p,'destinations','Preferred destinations',ENQUIRY_FIELDS.destinations.options)}${full?`${checkGroup(p,'services','Services you’re interested in',ENQUIRY_FIELDS.services.options)}${select(p,'style','Let’s work it out together')}${select(p,'budget','I’d like your guidance')}${field(p,'requirements',{wide:true,extra:'placeholder="Accessibility, dietary needs, child seats or anything else"'})}`:''}${field(p,'message',{textarea:true,wide:true,label:full?'Your ideas, plans or questions':'Message',extra:'placeholder="Tell us what your kind of adventure looks like…"'})}</div>${consent(p)}${actions(full?'Send my trip enquiry':'Send message')}${note()}</form>`;
};

/** Short homepage form inside the trip CTA. */
export const miniForm=()=>{
  const p='quick-enquiry';
  return `${formOpen(p,' mini-enquiry')}<h3>Your next adventure starts here.</h3>${status()}${hiddenFields(p)}<div class="form-grid">${field(p,'name',{label:'Your name',extra:'autocomplete="name"'})}${field(p,'phone',{type:'tel',extra:'autocomplete="tel"'})}${field(p,'email',{type:'email',wide:true,extra:'autocomplete="email" spellcheck="false"'})}${field(p,'date',{type:'date',label:'Travel date',extra:`min="${today}"`})}${field(p,'adults',{type:'number',label:'Travellers',extra:'value="2"'})}${field(p,'message',{textarea:true,wide:true,label:'Where and how would you like to travel?',extra:'rows="3" placeholder="Nature, wildlife, culture, places on your list…"'})}</div>${consent(p)}${actions('Get my free itinerary')}<p class="mini-note">We reply by email or phone. No obligation.</p></form>`;
};

const RATING_WORDS=['Poor','Fair','Good','Very good','Excellent'];
/**
 * 1–5 star rating as a real radio group: arrow keys change the rating and each star is announced as
 * "N out of 5 stars". The caption repeats the choice in words, so it never depends on colour alone.
 */
const ratingGroup=(prefix)=>{
  const id=`${prefix}-rating`;
  const stars=RATING_WORDS.map((_,i)=>{
    const n=i+1;
    return `<input type="radio" id="${id}-${n}" name="rating" value="${n}"${n===1?' required':''}><label for="${id}-${n}">${icon('star')}<span class="sr-only">${n} out of ${RATING_MAX} stars</span></label>`;
  }).join('');
  const caption=`<span>Select 1 to ${RATING_MAX} stars</span>${RATING_WORDS.map((word,i)=>`<span data-rating="${i+1}">${i+1} out of ${RATING_MAX} · ${word}</span>`).join('')}`;
  return `<fieldset class="field span-two rating-field" data-field="rating" id="${id}"><legend>Your rating${REQUIRED_MARK}</legend><div class="star-rating">${stars}<p class="rating-caption" aria-hidden="true">${caption}</p></div><p class="field-error" id="${id}-error" hidden></p></fieldset>`;
};

/** "Share your experience" form, shown in a dialog on the homepage (inline without JavaScript). */
export const feedbackForm=(labelledBy)=>{
  const p='feedback';
  const rules=FEEDBACK_FIELDS;
  return `${formOpen(p,' feedback-form',`aria-labelledby="${labelledBy}"`)}${status()}${hiddenFields(p)}<div class="form-grid">${field(p,'name',{rules,extra:'autocomplete="name"'})}${field(p,'email',{rules,type:'email',extra:'autocomplete="email" spellcheck="false"'})}${field(p,'phone',{rules,type:'tel',label:'Phone number <span class="optional">(optional)</span>',hint:'Never published.',extra:'autocomplete="tel"'})}${field(p,'city',{rules,label:'Your city <span class="optional">(optional)</span>',hint:'Shown with your feedback if it is featured.',extra:'autocomplete="address-level2" placeholder="e.g. Delhi"'})}${ratingGroup(p)}${select(p,'journey','Choose one (optional)',rules)}${checkGroup(p,'destinations','Where did you travel? <span class="optional">(optional)</span>',rules.destinations.options)}${field(p,'feedback',{rules,textarea:true,wide:true,extra:'rows="5" placeholder="Tell us about your journey, the places you visited and your experience with NE Insights…"'})}</div>${checkbox(p,'publish_consent','I agree that NE Insights may publish my feedback, rating and name, with the city and journey I’ve shared, on its website after review.')}${consent(p,'review my feedback and contact me about it')}<div class="form-actions"><button class="button primary" type="submit" data-submit><span data-submit-label>Send my feedback</span>${arrow}</button></div><p class="form-note">Submitted feedback is reviewed by the NE Insights team before anything is published on the website. Sending it does not guarantee publication, and your email address and phone number are never shown.</p></form>`;
};

/** Rules and messages for public/site.js, embedded once on pages that contain a form. */
export const formRulesScript=()=>`<script type="application/json" id="enquiry-rules">${JSON.stringify({fields:CLIENT_RULES,phone:site.phone,email:site.email,whatsapp:site.whatsapp}).replace(/</g,'\\u003c')}</script>`;
