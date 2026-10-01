// @ts-check
// Single source of truth for enquiry form fields. Used by the HTML form templates (attributes),
// public/site.js (via an embedded JSON copy of CLIENT_RULES) and the Netlify Function (server validation).
import {destinations} from '../data/site.mjs';

export const ENQUIRY_ENDPOINT='/api/enquiry';
export const THANK_YOU_PATH='/thank-you/';
/** Submissions faster than this after page load are treated as bots and silently discarded. */
export const MIN_FILL_MS=3000;
export const TIME_ZONE='Asia/Kolkata';
const MAX_YEARS_AHEAD=3;

export const FORM_TYPES={'trip-planner':'Trip planner','contact':'Contact enquiry','quick-enquiry':'Quick itinerary request'};
export const DESTINATION_OPTIONS=destinations.map(d=>d.name);
export const SERVICE_OPTIONS=['Car rental','Hotels','Safari','Full tour package','Custom package','Corporate or group retreat'];
export const STYLE_OPTIONS=['Family getaway','Couple’s escape','Nature & wildlife','Culture & local life','Adventure','A little of everything'];
export const BUDGET_OPTIONS=['Simple & comfortable','A little extra comfort','Premium stays & experiences','I’ll share a budget in my message'];

/**
 * @typedef {{label:string,required?:boolean,minLength?:number,maxLength?:number,format?:'email'|'phone'|'date'|'integer'|'consent',
 *   minDigits?:number,maxDigits?:number,min?:number,max?:number,multiple?:boolean,options?:string[],requiredMessage?:string}} FieldRule
 * @type {Record<string, FieldRule>}
 */
export const FIELDS={
  name:{label:'Full name',required:true,minLength:2,maxLength:100,requiredMessage:'Enter your full name.'},
  email:{label:'Email address',required:true,maxLength:254,format:'email',requiredMessage:'Enter your email address.'},
  phone:{label:'Phone number',required:true,maxLength:25,format:'phone',minDigits:10,maxDigits:15,requiredMessage:'Enter your phone number.'},
  city:{label:'Starting city',maxLength:120},
  date:{label:'Preferred travel date',format:'date'},
  duration:{label:'Trip duration (days)',format:'integer',min:1,max:90},
  adults:{label:'Adults',format:'integer',min:1,max:60},
  children:{label:'Children',format:'integer',min:0,max:30},
  destinations:{label:'Preferred destinations',multiple:true,options:DESTINATION_OPTIONS},
  services:{label:'Services',multiple:true,options:SERVICE_OPTIONS},
  style:{label:'Travel style',options:STYLE_OPTIONS},
  budget:{label:'Approximate budget',options:BUDGET_OPTIONS},
  requirements:{label:'Special requirements',maxLength:500},
  message:{label:'Message',required:true,minLength:10,maxLength:2500,requiredMessage:'Tell us a little about your trip or question.'},
  consent:{label:'Privacy consent',required:true,format:'consent',requiredMessage:'Please tick the box to agree to the privacy notice.'}
};
/** Optional context fields sent alongside the visible fields. */
export const META_FIELDS={topic:{maxLength:150},page:{maxLength:500},form_type:{maxLength:40}};

/** Error messages, shared verbatim by browser and server. */
export const messages={
  required:(/** @type {FieldRule} */ rule)=>rule.requiredMessage||`Enter your ${rule.label.toLowerCase()}.`,
  minLength:(/** @type {FieldRule} */ rule)=>`${rule.label} must be at least ${rule.minLength} characters.`,
  maxLength:(/** @type {FieldRule} */ rule)=>`${rule.label} must be ${rule.maxLength} characters or fewer.`,
  email:()=>'Enter a valid email address, like name@example.com.',
  phone:(/** @type {FieldRule} */ rule)=>`Enter a phone number with ${rule.minDigits} to ${rule.maxDigits} digits. Include the country code if you are outside India.`,
  date:()=>'Enter a valid date.',
  pastDate:()=>'Choose today or a future date.',
  farDate:()=>`Choose a date within the next ${MAX_YEARS_AHEAD} years.`,
  integer:(/** @type {FieldRule} */ rule)=>`Enter a whole number from ${rule.min} to ${rule.max}.`,
  option:()=>'Choose an option from the list.'
};

/** Rules and pre-rendered messages for the browser (embedded as JSON on pages with a form). */
export const CLIENT_RULES=Object.fromEntries(Object.entries(FIELDS).map(([name,rule])=>[name,{
  required:!!rule.required,minLength:rule.minLength,maxLength:rule.maxLength,format:rule.format,minDigits:rule.minDigits,maxDigits:rule.maxDigits,min:rule.min,max:rule.max,
  messages:{required:messages.required(rule),...(rule.minLength?{minLength:messages.minLength(rule)}:{}),...(rule.maxLength?{maxLength:messages.maxLength(rule)}:{}),
    ...(rule.format==='email'?{format:messages.email()}:{}),...(rule.format==='phone'?{format:messages.phone(rule)}:{}),
    ...(rule.format==='date'?{format:messages.date(),past:messages.pastDate(),far:messages.farDate()}:{}),...(rule.format==='integer'?{format:messages.integer(rule)}:{})}
}]));

// Rejects whitespace, quotes, brackets and other characters that have no place in a contact address.
const EMAIL_PATTERN=/^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:".]+(\.[^\s@<>()[\]\\,;:".]+)+$/;
const PHONE_CHARACTERS=/^[+()\-.\s0-9]+$/;
const CONTROL_CHARACTERS=/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
const LINE_BREAKS=/[\r\n\x85\u{2028}\u{2029}]+/gu;
const CONSENT_VALUES=new Set(['on','true','yes','1']);

/** Today's date (YYYY-MM-DD) in India, where the business and most visitors are. */
/** @param {number} [now] */
export const todayInIndia=(now=Date.now())=>new Intl.DateTimeFormat('en-CA',{timeZone:TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(now);

/** Strips control characters; single-line fields also lose line breaks (prevents header injection). */
/** @param {unknown} value @param {boolean} [multiline] @returns {string} */
export const cleanText=(value,multiline=false)=>{
  const text=String(value??'').replace(CONTROL_CHARACTERS,'');
  return (multiline?text.replace(/\r\n?/g,'\n'):text.replace(LINE_BREAKS,' ')).replace(/[ \t]+/g,' ').trim();
};

/** @param {string} value */
const countDigits=value=>(value.match(/\d/g)||[]).length;
/** @param {string} value */
const isRealDate=value=>{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const date=new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===value;
};
/** @param {string} isoDate @param {number} years */
const addYears=(isoDate,years)=>`${Number(isoDate.slice(0,4))+years}${isoDate.slice(4)}`;

/** @param {FieldRule} rule @param {string} value @param {number} now @returns {string|null} error message for a single (non-multiple) value */
const checkValue=(rule,value,now)=>{
  if(!value)return rule.required?messages.required(rule):null;
  if(rule.minLength&&value.length<rule.minLength)return messages.minLength(rule);
  if(rule.maxLength&&value.length>rule.maxLength)return messages.maxLength(rule);
  switch(rule.format){
    case 'email':return EMAIL_PATTERN.test(value)?null:messages.email();
    case 'phone':{const digits=countDigits(value);return PHONE_CHARACTERS.test(value)&&digits>=(rule.minDigits??0)&&digits<=(rule.maxDigits??99)?null:messages.phone(rule);}
    case 'date':{
      if(!isRealDate(value))return messages.date();
      const today=todayInIndia(now);
      if(value<today)return messages.pastDate();
      return value>addYears(today,MAX_YEARS_AHEAD)?messages.farDate():null;
    }
    case 'integer':{const n=Number(value);return /^\d+$/.test(value)&&n>=(rule.min??0)&&n<=(rule.max??Infinity)?null:messages.integer(rule);}
    case 'consent':return CONSENT_VALUES.has(value.toLowerCase())?null:messages.required(rule);
    default:return rule.options&&!rule.options.includes(value)?messages.option():null;
  }
};

/**
 * Validates and normalises a submission. Unknown fields are ignored.
 * @param {Record<string, unknown>} input field values; multiple-choice fields may be arrays
 * @param {{now?:number}} [options]
 * @returns {{values:Record<string,string|string[]>, errors:Record<string,string>}}
 */
export const validateEnquiry=(input,{now=Date.now()}={})=>{
  /** @type {Record<string,string|string[]>} */
  const values={};
  /** @type {Record<string,string>} */
  const errors={};
  for(const [name,rule] of Object.entries(FIELDS)){
    const raw=input[name];
    if(rule.multiple){
      const list=(Array.isArray(raw)?raw:raw==null||raw===''?[]:[raw]).map(v=>cleanText(v)).filter(Boolean);
      const unique=[...new Set(list)];
      if(unique.some(v=>!rule.options?.includes(v))||unique.length>(rule.options?.length??0))errors[name]=messages.option();
      values[name]=unique;
      continue;
    }
    const value=cleanText(Array.isArray(raw)?raw[0]:raw,name==='message'||name==='requirements');
    const error=checkValue(rule,value,now);
    if(error)errors[name]=error;
    values[name]=value;
  }
  for(const [name,rule] of Object.entries(META_FIELDS)){
    const raw=input[name];
    values[name]=cleanText(Array.isArray(raw)?raw[0]:raw).slice(0,rule.maxLength);
  }
  return {values,errors};
};
