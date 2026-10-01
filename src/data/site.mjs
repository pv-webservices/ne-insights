export const site = {
  name: 'NE Insights',
  // Canonical domain for every page, sitemap and social card (deploy previews still point here and are noindex).
  url: (process.env.SITE_URL || 'https://neinsights.in').replace(/\/$/, ''),
  phone: '+91 8473833199',
  email: 'operations@neinsights.in',
  // International digits only (no + or spaces), used for wa.me links.
  whatsapp: '918473833199',
  address: '',
  hours: '',
  socials: [],
  // Add { name, jobTitle, image } once the client confirms it; this enables the founder (Person) schema.
  founder: null,
  legalApproved: false,
  description: 'Your local travel partner for thoughtful journeys through Northeast India. Car rentals, handpicked stays, wildlife safaris and journeys made for you.'
};

export const destinations = [
  {slug:'assam',name:'Assam',tag:'Wild at heart',image:'assam',intro:'Slow down beside the Brahmaputra. Discover tea country, river islands and the extraordinary wildlife of Assam.',places:['Kaziranga National Park','Majuli river island','Guwahati','Assam tea country'],days:'5–7 days',season:'October–April',route:['Arrive in Guwahati and settle in.','Travel to Kaziranga for time in nature.','Explore the park with a locally arranged safari.','Continue towards Majuli for river-island culture.','Return to Guwahati with time for local food.'],note:'Park access and ferry schedules vary with season and weather. Leave room in your route for changing conditions.'},
  {slug:'meghalaya',name:'Meghalaya',tag:'Chase the clouds',image:'meghalaya',intro:'Waterfalls, living root bridges and rivers so clear they seem unreal. Find your own rhythm in the abode of clouds.',places:['Shillong','Sohra (Cherrapunji)','Dawki & Shnongpdeng','Living root bridges'],days:'5–6 days',season:'October–April for clearer days',route:['Arrive via Guwahati and drive to Shillong.','Explore Shillong and continue to Sohra.','Spend a day around waterfalls and forest trails.','Visit Dawki and the riverside villages.','Return to Guwahati for your onward journey.'],note:'Root-bridge walks can involve steep steps. We will help match the route to your fitness and the weather.'},
  {slug:'arunachal-pradesh',name:'Arunachal Pradesh',tag:'Take the scenic route',image:'arunachal-pradesh',intro:'Monasteries above the clouds, wide mountain valleys and roads that make the journey part of the destination.',places:['Tawang','Dirang','Bomdila','Sangti Valley'],days:'7–9 days',season:'March–May & October–November',route:['Start your journey from Guwahati.','Break the mountain drive in Bomdila.','Continue to Dirang and explore the valley.','Travel towards Tawang at a comfortable pace.','Discover monasteries and local culture.','Return through the valleys with an overnight stop.','Continue to Guwahati.'],note:'Permits and high-altitude planning may be required. Requirements depend on nationality and route; confirm before travel.'},
  {slug:'nagaland',name:'Nagaland',tag:'Stories in every hillside',image:'nagaland',intro:'Walk through hill villages, discover living traditions and make time for the generous spirit of Nagaland.',places:['Kohima','Khonoma','Kisama Heritage Village','Dzüko Valley'],days:'5–7 days',season:'October–April',route:['Arrive via Dimapur and continue to Kohima.','Discover local history and food.','Visit Khonoma with a local guide.','Choose a village visit or a planned nature walk.','Return to Dimapur.'],note:'Village visits and treks deserve advance planning and local guidance. Always ask before photographing people.'},
  {slug:'manipur',name:'Manipur',tag:'Where life meets the lake',image:'loktak',intro:'Discover lakeside landscapes, distinctive crafts and the cultural heart of Imphal at an unhurried pace.',places:['Imphal','Loktak Lake','Ima Keithel','Keibul Lamjao'],days:'4–6 days',season:'October–March',route:['Arrive in Imphal when local travel conditions allow.','Explore markets and cultural landmarks.','Plan a guided lake excursion.','Keep a flexible day before departure.'],note:'Confirm current travel advisories and local conditions before making plans. Routes may need to change.'},
  {slug:'mizoram',name:'Mizoram',tag:'Hills beyond the ordinary',image:'mizoram-hills',intro:'Ridgeline towns, green hills and a slower way of travelling. Make space for the unexpected in Mizoram.',places:['Aizawl','Reiek','Hmuifang','Tam Dil'],days:'4–6 days',season:'October–March',route:['Arrive in Aizawl and take in the hillside views.','Explore the city and local culture.','Plan a day around Reiek.','Choose a nature excursion before returning.'],note:'Allow generous time for winding roads. Confirm entry requirements and local opening days ahead of travel.'},
  {slug:'tripura',name:'Tripura',tag:'A different kind of discovery',image:'tripura',intro:'Royal architecture, lakeside palaces and remarkable rock carvings make Tripura a rewarding cultural escape.',places:['Agartala','Ujjayanta Palace','Neermahal','Unakoti'],days:'4–5 days',season:'October–March',route:['Arrive in Agartala and explore the city.','Discover Ujjayanta Palace and local heritage.','Take a day trip towards Neermahal.','Add Unakoti with an extra overnight stay.','Return for departure.'],note:'Museum opening days and boat access can change. We will plan the route around confirmed arrangements.'}
];

import { packages } from './packages.mjs';
export { packages };
const count = collection => packages.filter(p => p.season === collection).length;

export const services = [
  {slug:'car-rental',icon:'car',name:'Car Rental',text:'Good roads. Great company. Reliable vehicles with drivers who know the way.',cta:'Find your ride',image:'hero-journey'},
  {slug:'hotel-booking',icon:'bed',name:'Hotel Booking',text:'From cosy homestays to peaceful retreats. Find a stay that feels like you.',cta:'Find your stay',image:'homestay'},
  {slug:'jungle-safari',icon:'binoculars',name:'Jungle Safari',text:'A wilder side of the Northeast, with thoughtfully planned wildlife experiences.',cta:'Explore safaris',image:'pobitora'},
  {slug:'tour-packages',icon:'map',name:'Custom Tour Packages',text:'Nature, culture or a bit of everything. A journey made around you.',cta:'Explore packages',image:'waterfall'}
];

export const vehicles = [
  {name:'Sedan',capacity:'Up to 3 guests',use:'Dzire, Indigo, Xcent or similar commercial sedan',type:'sedan',image:'fleet-sedan'},
  {name:'MUV',capacity:'4–6 guests',use:'Innova, Xylo or similar; luggage carrier subject to availability',type:'suv',image:'fleet-muv'},
  {name:'Tempo Traveller',capacity:'7–20 guests',use:'Group travel; push-back seating preferred, subject to confirmation',type:'van',image:'fleet-tempo'}
];

export const faqs = [
  ['When is the best time to explore Northeast India?','It depends on your route. October to April is often a good starting point for lower-elevation journeys. Spring and autumn suit many mountain routes. Monsoon rain, altitude and seasonal park closures all affect travel, so we will help plan around your dates.'],
  ['Can you create a trip just for us?','Yes. Tell us your dates, group size, interests and preferred pace. We can put together a route combining transport, stays and experiences, then refine it with you before you confirm.'],
  ['Are hotels included in tour packages?','The domestic itineraries specify overnight destinations. Choose Budget, Standard, Deluxe, Luxury or Premium accommodation; named hotels, room types, meals and the final price will be confirmed in your quotation. Extra mattresses may be used instead of extra beds, and room occupancy rules vary by property.'],
  ['Can you help arrange jungle safaris?','We can help plan safari enquiries for Kaziranga, Manas and Pobitora. All safaris depend on seasonal opening, permits, weather and operator availability. Wildlife sightings cannot be guaranteed.'],
  ['Do your car rentals include a driver?','The package guide suggests a commercial sedan for up to 3 guests, an Innova/Xylo or similar MUV for 4–6, and a Tempo Traveller for 7–20. Your quote confirms the model, luggage arrangements, driver, route and any exclusions.'],
  ['Which states can I explore?','We plan enquiries across Assam, Meghalaya, Arunachal Pradesh, Nagaland, Manipur, Mizoram and Tripura, with routes subject to current access and local travel conditions.'],
  ['Can I change one of the suggested itineraries?','Absolutely. The itineraries are starting points. We can adjust destinations, trip length, activities and accommodation to suit your interests and practical travel times.'],
  ['Can you arrange airport pickup and drop?','Airport transfers can be included in your itinerary. Share your arrival and departure details so we can plan the right vehicle and allow enough travel time.'],
  ['Should I plan safaris in advance?','Advance planning is recommended, especially for popular travel dates. A safari is only confirmed once the relevant operator, permits and arrangements have been verified.'],
  ['Can you help with travel permits?','We can explain the planning process and help coordinate where appropriate. Requirements vary by destination, nationality and route. Confirm the current requirements before paying for travel.'],
  ['Do you offer seasonal and signature tour packages?',`Yes. Explore ${count('Summer')} domestic summer routes, ${count('Winter')} winter routes and ${count('Signature')} signature tours, from short Guwahati and Shillong breaks to wildlife circuits, longer Arunachal journeys and routes through Nagaland, Manipur, Mizoram and Tripura. Quote the collection and NE package code when enquiring, since codes repeat between collections.`]
];
