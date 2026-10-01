// Enquiry forms. They POST to the Netlify Function and work without JavaScript (303 → /thank-you/).
// public/site.js adds inline validation, background sending, error states and the WhatsApp option.
import {site} from '../data/site.mjs';
import {CLIENT_RULES,ENQUIRY_ENDPOINT,FIELDS,FORM_TYPES,todayInIndia} from '../lib/enquiry-rules.mjs';
import {arrow,esc,icon,waHref,telHref} from './ui.mjs';

/** HTML validation attributes generated from the shared rules, so browser and server agree. */
const ruleAttrs=name=>{
  const rule=FIELDS[name];
  const attrs=[];
  if(rule.required)attrs.push('required');
  if(rule.minLength)attrs.push(`minlength="${rule.minLength}"`);
  if(rule.maxLength)attrs.push(`maxlength="${rule.maxLength}"`);
  if(rule.format==='integer')attrs.push(`min="${rule.min}" max="${rule.max}" step="1" inputmode="numeric"`);
  // Brackets and hyphen are escaped because browsers compile pattern with the v flag.
  if(rule.format==='phone')attrs.push('pattern="[+0-9\\(\\)\\-. ]{10,25}"');
  return attrs.join(' ');
};
const marker=name=>FIELDS[name].required?' <span class="required-mark" aria-hidden="true">*</span>':'';

/**
 * One labelled field with a slot for its error message (linked by site.js through aria-describedby).
 * @param {string} prefix id prefix that keeps ids unique when a page has several forms
 */
const field=(prefix,name,{type='text',label=FIELDS[name].label,extra='',hint='',wide=false,textarea=false}={})=>{
  const id=`${prefix}-${name}`;
  const hintHtml=hint?`<p class="field-hint" id="${id}-hint">${hint}</p>`:'';
  const describedBy=hint?` aria-describedby="${id}-hint"`:'';
  const control=textarea
    ?`<textarea id="${id}" name="${name}" rows="4" ${ruleAttrs(name)}${describedBy} ${extra}></textarea>`
    :`<input id="${id}" name="${name}" type="${type}" ${ruleAttrs(name)}${describedBy} ${extra}>`;
  return `<div class="field${wide?' span-two':''}" data-field="${name}"><label for="${id}">${label}${marker(name)}</label>${hintHtml}${control}<p class="field-error" id="${id}-error" hidden></p></div>`;
};
const checkGroup=(prefix,name,legend,options)=>`<fieldset class="field span-two" data-field="${name}" id="${prefix}-${name}"><legend>${legend}</legend><div class="check-group">${options.map(o=>`<label><input type="checkbox" name="${name}" value="${esc(o)}">${esc(o)}</label>`).join('')}</div><p class="field-error" id="${prefix}-${name}-error" hidden></p></fieldset>`;
const select=(prefix,name,placeholder)=>{
  const id=`${prefix}-${name}`;
  return `<div class="field" data-field="${name}"><label for="${id}">${FIELDS[name].label}</label><select id="${id}" name="${name}"><option value="">${placeholder}</option>${FIELDS[name].options.map(o=>`<option>${esc(o)}</option>`).join('')}</select><p class="field-error" id="${id}-error" hidden></p></div>`;
};

const PHONE_HINT='10–15 digits. Include the country code if you are outside India.';
const today=todayInIndia();

const hiddenFields=(type)=>`<input type="hidden" name="form_type" value="${type}"><input type="hidden" name="ts" value=""><input type="hidden" name="page" value=""><input type="hidden" name="topic" value=""><div class="honeypot" aria-hidden="true"><label for="${type}-website">Leave this field empty</label><input id="${type}-website" name="website" type="text" tabindex="-1" autocomplete="off"></div>`;

const consent=(prefix)=>`<div class="field consent-field" data-field="consent"><div class="consent"><input id="${prefix}-consent" type="checkbox" name="consent" value="on" required><label for="${prefix}-consent">I have read the <a href="/privacy-policy/">privacy policy</a> and agree to NE Insights using these details to reply to my enquiry.<span class="required-mark" aria-hidden="true"> *</span></label></div><p class="field-error" id="${prefix}-consent-error" hidden></p></div>`;

const actions=(label)=>`<div class="form-actions"><button class="button primary" type="submit" data-submit><span data-submit-label>${label}</span>${arrow}</button><a class="button whatsapp" href="${esc(waHref())}" target="_blank" rel="noopener noreferrer" data-whatsapp-send>${icon('whatsapp')}<span>Send via WhatsApp</span></a></div>`;

const note=()=>`<p class="form-note">Fields marked <span aria-hidden="true">*</span><span class="sr-only">with an asterisk</span> are required. Your enquiry goes straight to our team at ${esc(site.email)}. Prefer to talk? Call <a href="${telHref}">${esc(site.phone)}</a>.</p>`;

/** Live region for the error summary, offline, timeout and delivery messages. */
const status=()=>`<div class="form-status" data-form-status tabindex="-1" hidden></div>`;

const formOpen=(type,cls='')=>`<form class="enquiry-form${cls}" id="form-${type}" action="${ENQUIRY_ENDPOINT}" method="post" data-enquiry data-form-type="${type}" aria-label="${esc(FORM_TYPES[type])}">`;

/** Full trip planner (/plan-my-trip/) or the shorter contact form (/contact/). */
export const enquiryForm=(full=true)=>{
  const type=full?'trip-planner':'contact';
  const p=type;
  return `${formOpen(type)}<h2>${full?'Tell us a little about your trip.':'Let’s talk travel.'}</h2><p class="form-intro">${full?'A few details are all we need to start shaping your journey.':'Share your plans, questions or a little travel inspiration.'}</p>${status()}${hiddenFields(type)}<div class="form-grid">${field(p,'name',{extra:'autocomplete="name"'})}${field(p,'phone',{type:'tel',extra:'autocomplete="tel"',hint:PHONE_HINT})}${field(p,'email',{type:'email',extra:'autocomplete="email" spellcheck="false"',wide:!full})}${full?field(p,'city',{extra:'autocomplete="address-level2"'}):''}${field(p,'date',{type:'date',extra:`min="${today}"`})}${full?field(p,'duration',{type:'number'}):''}${field(p,'adults',{type:'number',label:full?'Adults':'Number of travellers',extra:'value="2"'})}${full?field(p,'children',{type:'number',extra:'value="0"'}):''}${checkGroup(p,'destinations','Preferred destinations',FIELDS.destinations.options)}${full?`${checkGroup(p,'services','Services you’re interested in',FIELDS.services.options)}${select(p,'style','Let’s work it out together')}${select(p,'budget','I’d like your guidance')}${field(p,'requirements',{wide:true,extra:'placeholder="Accessibility, dietary needs, child seats or anything else"'})}`:''}${field(p,'message',{textarea:true,wide:true,label:full?'Your ideas, plans or questions':'Message',extra:'placeholder="Tell us what your kind of adventure looks like…"'})}</div>${consent(p)}${actions(full?'Send my trip enquiry':'Send message')}${note()}</form>`;
};

/** Short homepage form inside the trip CTA. */
export const miniForm=()=>{
  const p='quick-enquiry';
  return `${formOpen(p,' mini-enquiry')}<h3>Your next adventure starts here.</h3>${status()}${hiddenFields(p)}<div class="form-grid">${field(p,'name',{label:'Your name',extra:'autocomplete="name"'})}${field(p,'phone',{type:'tel',extra:'autocomplete="tel"'})}${field(p,'email',{type:'email',wide:true,extra:'autocomplete="email" spellcheck="false"'})}${field(p,'date',{type:'date',label:'Travel date',extra:`min="${today}"`})}${field(p,'adults',{type:'number',label:'Travellers',extra:'value="2"'})}${field(p,'message',{textarea:true,wide:true,label:'Where and how would you like to travel?',extra:'rows="3" placeholder="Nature, wildlife, culture, places on your list…"'})}</div>${consent(p)}${actions('Get my free itinerary')}<p class="mini-note">We reply by email or phone. No obligation.</p></form>`;
};

/** Rules and messages for public/site.js, embedded once on pages that contain a form. */
export const formRulesScript=()=>`<script type="application/json" id="enquiry-rules">${JSON.stringify({fields:CLIENT_RULES,phone:site.phone,email:site.email,whatsapp:site.whatsapp}).replace(/</g,'\\u003c')}</script>`;
