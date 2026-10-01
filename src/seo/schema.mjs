// JSON-LD structured data. Every page gets one @graph; ids link the entities together.
import {site,destinations} from '../data/site.mjs';
import {legalName} from '../data/company.mjs';
import imageManifest from '../data/image-manifest.json' with {type:'json'};

const LOGO_PNG_WIDTH=600;

export const orgId=base=>`${base}/#organization`;
export const websiteId=base=>`${base}/#website`;

export const organization=base=>{
  const logo=imageManifest.logo;
  return {
    '@type':'TravelAgency',
    '@id':orgId(base),
    name:site.name,
    alternateName:legalName,
    url:`${base}/`,
    description:site.description,
    logo:{'@type':'ImageObject','@id':`${base}/#logo`,url:`${base}/images/brand/logo-600.png`,width:LOGO_PNG_WIDTH,height:Math.round(logo.height*LOGO_PNG_WIDTH/logo.width),caption:site.name},
    image:`${base}/images/og/hero-journey.jpg`,
    email:site.email,
    telephone:site.phone,
    // Street address and hours are added automatically once confirmed in src/data/site.mjs.
    address:{'@type':'PostalAddress',...(site.address?{streetAddress:site.address}:{}),addressCountry:'IN'},
    ...(site.hours?{openingHours:site.hours}:{}),
    areaServed:destinations.map(d=>({'@type':'State',name:d.name})),
    memberOf:{'@type':'Organization',name:'Tour Operators Association of Assam',alternateName:'TOAA'},
    contactPoint:[{'@type':'ContactPoint',contactType:'customer service',telephone:site.phone,email:site.email,areaServed:'IN'}],
    ...(site.socials.length?{sameAs:site.socials}:{}),
    ...(site.founder?{founder:{'@id':`${base}/#founder`}}:{})
  };
};

export const website=base=>({'@type':'WebSite','@id':websiteId(base),url:`${base}/`,name:site.name,alternateName:legalName,publisher:{'@id':orgId(base)},inLanguage:'en-IN'});

export const founder=base=>site.founder?{'@type':'Person','@id':`${base}/#founder`,...site.founder,worksFor:{'@id':orgId(base)}}:null;

/** BreadcrumbList from the visible breadcrumb trail, so the two never disagree. */
export const breadcrumbList=(id,crumbs)=>({'@type':'BreadcrumbList','@id':id,itemListElement:crumbs.map(([name,url],i)=>({'@type':'ListItem',position:i+1,name,item:url}))});

/**
 * Builds the page graph.
 * @param {{base:string,url:string,title:string,description:string,ogImage:string,pageType?:string,crumbs:[string,string][],pageProps?:object,extra?:object[]}} page
 */
export const pageGraph=({base,url,title,description,ogImage,pageType='WebPage',crumbs,pageProps={},extra=[]})=>{
  const canonical=base+url;
  const breadcrumbId=`${canonical}#breadcrumb`;
  const graph=[
    organization(base),
    website(base),
    {'@type':pageType,'@id':`${canonical}#webpage`,url:canonical,name:title,description,isPartOf:{'@id':websiteId(base)},about:{'@id':orgId(base)},primaryImageOfPage:{'@type':'ImageObject',url:base+ogImage},inLanguage:'en-IN',...(crumbs.length>1?{breadcrumb:{'@id':breadcrumbId}}:{}),...pageProps},
    ...(crumbs.length>1?[breadcrumbList(breadcrumbId,crumbs)]:[]),
    ...extra
  ];
  const person=founder(base);
  if(person&&(url==='/'||url==='/about/'))graph.push(person);
  return {'@context':'https://schema.org','@graph':graph};
};

/** JSON for a <script type="application/ld+json">; "<" is escaped so content can never close the tag. */
export const jsonLd=data=>JSON.stringify(data).replace(/</g,'\\u003c');
