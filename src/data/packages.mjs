// Edited from the two client-supplied domestic itinerary documents.
// Source codes repeat between seasons, so the season is part of each URL and enquiry reference.
const day = (title, text, overnight = '') => [title, text, overnight];
const depart = (from = 'Guwahati', temple = false, station = false) => day(`${from} → Guwahati ${station ? 'airport / station' : 'airport'}`, `After breakfast, ${from === 'Guwahati' ? 'check out and transfer' : `travel from ${from}`} to Guwahati ${station ? 'airport or railway station' : 'airport'} for your onward journey.${temple ? ' Visit Kamakhya Temple if time permits before departure.' : ''}`);
const arriveShillong = day('Guwahati → Shillong', 'Meet on arrival in Guwahati and drive to Shillong with a stop at Umiam Lake (Barapani). If time permits, visit the Cathedral of Mary and Ward’s Lake. Spend the evening at leisure or explore Police Bazaar.', 'Shillong');
const winterShillong = day('Guwahati → Shillong', 'Meet on arrival at Guwahati airport and drive to Shillong, stopping at Umiam Lake. Check in and visit the Cathedral of Mary if arrival time permits.', 'Shillong');
const simpleShillong = day('Guwahati → Shillong', 'Meet at Guwahati airport or railway station, drive to Shillong and visit Umiam Lake en route. Check in and settle into your hotel.', 'Shillong');
const sohraDay = day('Shillong → Cherrapunjee → Shillong', 'Take a day trip to Cherrapunjee (Sohra), stopping at Elephant Falls and Duwan Sing Syiem viewpoint. Visit Seven Sisters Falls, Nohkalikai Falls, Mawsmai Cave and the Ramakrishna Mission, then return to Shillong.', 'Shillong');
const winterSohra = day('Shillong → Cherrapunjee → Shillong', 'Leave after breakfast for Cherrapunjee via Duwan Sing Syiem viewpoint. Visit Seven Sisters Falls, Nohkalikai Falls and Mawsmai Cave. Return to Shillong after lunch, with time to walk around Police Bazaar.', 'Shillong');
const transferSohra = day('Shillong → Cherrapunjee', 'Drive to Cherrapunjee via Elephant Falls and Shillong Peak. Explore Mawsmai Cave, Mawsmai Falls, Seven Sisters Falls and Nohkalikai Falls, followed by Arwah Cave, Koh Ramhah and Khrem Falls as scheduled in the route.', 'Cherrapunjee');
const rootTrek = day('Cherrapunjee living root bridges', 'Choose the single-decker or double-decker living root bridge trek. The guide allows around 3–4 hours for the single-decker route and 5–6 hours for the double-decker route, with steep downhill and uphill steps. Return for an evening at leisure; local music may be arranged. Carry suitable trekking and rain gear.', 'Cherrapunjee');
const dawki = (from='Shillong',to='Shillong') => day(`${from} → Mawlynnong → Dawki → ${to}`, 'Explore Mawlynnong village, its Sky Walk and Khasi village life. Walk to the living root bridge at nearby Rewai, then continue to Dawki and the Umngot River for a country-boat excursion and views towards the Bangladesh border. Boating and local visits depend on conditions. Carry a packed lunch if needed.', to);
const cityTransfer = day('Shillong → Guwahati', 'Drive to Guwahati after breakfast and check in. Visit Kamakhya Temple, Assam State Museum and Umananda Temple, allowing for opening days and ferry schedules.', 'Guwahati');
const silkDay = day('Guwahati & Sualkuchi', 'Visit Navagraha Temple, then travel to Sualkuchi to discover Assam’s silk-weaving traditions. Return to Guwahati. An evening Brahmaputra cruise can be arranged on direct payment, subject to availability and river conditions.', 'Guwahati');
const cruiseTransfer = day('Shillong → Guwahati', 'Drive to Guwahati and visit Srimanta Sankardev Kalakshetra. An evening Brahmaputra river cruise is optional, payable directly and subject to availability and water level.', 'Guwahati');
const manasArrival = day('Guwahati → Manas', 'Meet at Guwahati airport and drive to Manas. Check in and spend the evening at leisure.', 'Manas');
const manasJeep = day('Manas National Park', 'After breakfast, take a planned jeep safari towards Mathanguri, with river views and the hills of Bhutan beyond. Jungle activities depend on park opening, permits and availability.', 'Manas');
const manasWinter = day('Manas National Park', 'The itinerary plans an early elephant ride, followed by breakfast and a jeep safari towards Mathanguri. Return to the hotel for a free evening. All wildlife activities are subject to park permissions and availability.', 'Manas');
const bhalukpong = (from='Guwahati',alternative=false) => day(`${from} → ${alternative?'Tezpur / Bhalukpong':'Bhalukpong'}`, `Travel from ${from} to ${alternative?'Tezpur or Bhalukpong':'Bhalukpong on the Assam–Arunachal border'} and check in for the night.`, alternative?'Tezpur / Bhalukpong':'Bhalukpong');
const dirang = (alternative=false) => day(`${alternative?'Tezpur / Bhalukpong':'Bhalukpong'} → Dirang`, 'Drive to Dirang, visiting Tipi Orchid Centre en route. Check in and spend the evening at leisure.', 'Dirang');
const tawangDrive = (full=true) => day('Dirang → Tawang', `Continue towards Tawang, taking in the mountain landscapes and visiting Sela Pass and Jaswant Garh War Memorial where the route is accessible.${full?' The itinerary also includes Dirang Valley views and Jung (Nuranang) Falls.':''} Mountain stops depend on weather and road conditions.`, 'Tawang');
const tawangDay = (full=true) => day('Tawang monasteries & heritage', `Visit Tawang Monastery${full?', Urgelling Monastery and Ani Gompa':''}, followed by the War Memorial.${full?' The evening light-and-sound show is subject to its operating schedule.':' Enjoy free time for shopping in the evening.'}`, 'Tawang');
const bomdila = day('Tawang → Bomdila', 'Drive back to Bomdila through mountain scenery. Check in and spend the evening at leisure.', 'Bomdila');
const bomdilaGuwahati = day('Bomdila → Guwahati', 'Leave after breakfast for the long drive to Guwahati. Check in and rest after the journey; travel time depends on road and traffic conditions.', 'Guwahati');
const kazirangaArrival = day('Guwahati → Kaziranga', 'Meet on arrival at Guwahati airport and drive to Kaziranga. Check into your accommodation.', 'Kaziranga');
const kazirangaTransfer = day('Shillong → Kaziranga', 'Drive from Shillong to Kaziranga. An evening Assamese cultural performance may be arranged at Kohora or the Orchid and Biodiversity Park, subject to the local programme.', 'Kaziranga');
const kazirangaSafari = day('Kaziranga wildlife & local life', 'The itinerary plans an early elephant ride followed by breakfast and a jeep safari in the Central or Western Range. In the afternoon, visit a local village, view a tea garden from outside and explore the Orchid and Biodiversity Park. Safari timings, ranges and rides are subject to park arrangements; sightings are not guaranteed.', 'Kaziranga');
const kazirangaGuwahati = day('Kaziranga → Guwahati', 'Drive to Guwahati, then visit Kamakhya Temple and Assam State Museum if their schedules allow. An evening Brahmaputra cruise is optional, on direct payment and subject to availability and water level.', 'Guwahati');

// Signature-collection days, edited from the itinerary documents in source-files/documents/itineraries/.
const sohraLunch = day('Shillong → Cherrapunjee → Shillong', 'Set off early for Cherrapunjee (Sohra), stopping at the Duwan Sing Syiem viewpoint. Visit Seven Sisters Falls and Nohkalikai Falls and walk through Mawsmai Cave. Have lunch in Cherrapunjee before driving back to Shillong.', 'Shillong');
const kohimaImphal = day('Kohima → Imphal', 'Check out after breakfast and drive to Imphal. In the afternoon, visit the Manipur State Museum for the history, cultures and natural heritage of the state, then join the evening aarti at Shree Govindajee Temple. Sightseeing depends on your arrival time in Imphal.', 'Imphal');
const loktakDay = day('Keibul Lamjao & Loktak Lake', 'Start early for Keibul Lamjao National Park, the world’s only floating national park and home of the sangai, Manipur’s brow-antlered “dancing deer”. Before lunch, take a boat on Loktak Lake to see its floating islands, fishing life and birdlife, then walk by the lake and visit a small museum on one of its islands.', 'Imphal');
const imphalDepart = day('Imphal → Imphal airport', 'After breakfast, transfer to Imphal airport for your onward journey.');

// Overnight place → state, used for destination filters and related packages.
const STATE_OF = {
  Guwahati:'Assam', Kaziranga:'Assam', Majuli:'Assam', Manas:'Assam', Nameri:'Assam', Pobitora:'Assam', Sivasagar:'Assam', 'Tezpur / Bhalukpong':'Assam',
  Shillong:'Meghalaya', Cherrapunjee:'Meghalaya',
  Bhalukpong:'Arunachal Pradesh', Dirang:'Arunachal Pradesh', Tawang:'Arunachal Pradesh', Bomdila:'Arunachal Pradesh',
  Kohima:'Nagaland', Imphal:'Manipur', Aizawl:'Mizoram', Agartala:'Tripura'
};
const STATE_ORDER = ['Assam','Meghalaya','Arunachal Pradesh','Nagaland','Manipur','Mizoram','Tripura'];
// Tezpur / Bhalukpong sits on the Assam–Arunachal border; routes through it continue into Arunachal.
const statesFor = place => place==='Tezpur / Bhalukpong' ? ['Assam','Arunachal Pradesh'] : [STATE_OF[place]];

export const collections = ['Summer','Winter','Signature'];
const SOURCES = {Summer:'domestic-summer-package.docx', Winter:'domestic-winter-package.docx'};

const make = (season, number, name, image, style, itinerary, highlights, intro, extras={}) => {
  const stays=[];
  for(const [, ,place] of itinerary){if(!place)continue;const existing=stays.find(s=>s.place===place);if(existing)existing.nights++;else stays.push({place,nights:1});}
  const found=new Set(stays.flatMap(s=>statesFor(s.place)));
  const regions=STATE_ORDER.filter(r=>found.has(r));
  const code=`NE-${String(number).padStart(2,'0')}`;
  return {slug:`${season.toLowerCase()}-${code.toLowerCase()}`,code,season,name,image,style,itinerary,highlights,intro,stays,regions,region:regions.join(' & '),days:itinerary.length,nights:stays.reduce((n,s)=>n+s.nights,0),places:stays.map(s=>s.place).join(' · '),badge:`${season} · ${code}`,source:SOURCES[season],start:'Guwahati',end:'Guwahati',...extras};
};

const summer=[
  make('Summer',1,'Shillong & Sohra Escape','meghalaya','Scenic',[arriveShillong,sohraDay,depart('Shillong')],['Umiam Lake','Sohra waterfalls & Mawsmai Cave','Shillong evenings'],'Two nights in Shillong with a day among the waterfalls and caves of Cherrapunjee.'),
  make('Summer',2,'Cherrapunjee & Living Root Bridges','bridge','Adventure',[
    day('Guwahati → Cherrapunjee','Drive from Guwahati airport to Cherrapunjee via Umiam Lake, Elephant Falls and Duwan Sing Syiem viewpoint. Check in to your hotel.','Cherrapunjee'),
    day('Root bridge trek & Sohra waterfalls','Take the single-decker living root bridge trek through Sohsarat village. The source route allows 3–4 hours and involves a steep descent and return climb. In the afternoon visit Seven Sisters Falls, Nohkalikai Falls and Mawsmai Cave.','Cherrapunjee'),depart('Cherrapunjee')
  ],['Single-decker root bridge','Seven Sisters & Nohkalikai Falls','Mawsmai Cave'],'Stay in Cherrapunjee for forest walks, living root bridges and waterfall views.'),
  make('Summer',3,'Guwahati Pilgrimage Special','assam','Pilgrimage',[
    day('Arrive in Guwahati','Transfer from Guwahati airport to your hotel. Visit Navagraha Temple if time permits.','Guwahati'),
    day('Kamakhya & Brahmaputra island temples','Visit Kamakhya, Bagala and Bhuvaneswari temples, then take a public ferry to Umananda Temple in the Brahmaputra River.','Guwahati'),
    day('Bhimeswar & Hajo','Visit Bhimeswar Jyotirlinga, with a walk of approximately 1 km, then continue to Hayagriva Madhava Temple in Hajo. Return to Guwahati for a free evening.','Guwahati'),depart()
  ],['Kamakhya Temple','Umananda by ferry','Bhimeswar & Hajo'],'A three-night Guwahati stay centred on temples, river crossings and a visit to Hajo.'),
  make('Summer',4,'Shillong & Guwahati Highlights','meghalaya','Scenic',[arriveShillong,sohraDay,cityTransfer,depart()],['Shillong & Umiam Lake','Cherrapunjee day trip','Guwahati temples & museum'],'Combine two nights in Shillong with a final night exploring Guwahati.'),
  make('Summer',5,'Shillong, Sohra & Dawki','waterfall','Scenic',[arriveShillong,transferSohra,dawki('Cherrapunjee'),depart('Shillong')],['Sohra caves & waterfalls','Mawlynnong & Rewai','Dawki’s Umngot River'],'A four-day Meghalaya circuit with two Shillong nights and one night in Cherrapunjee.'),
  make('Summer',6,'Shillong, Mawlynnong & Dawki','meghalaya','Scenic',[arriveShillong,sohraDay,dawki(),depart('Shillong')],['Three nights in Shillong','Cherrapunjee excursion','Mawlynnong, Rewai & Dawki'],'Use Shillong as your base for two full-day excursions into Meghalaya.'),
  make('Summer',7,'Meghalaya Waterfalls & Root Bridges','waterfall','Adventure',[arriveShillong,transferSohra,rootTrek,dawki('Cherrapunjee'),depart('Shillong')],['Two nights in Cherrapunjee','Single or double-decker root bridge','Mawlynnong & Dawki'],'Five days through Shillong, Cherrapunjee and Dawki, with time for a living root bridge trek.',{featured:true}),
  make('Summer',8,'Meghalaya & Guwahati Discovery','meghalaya','Scenic',[arriveShillong,sohraDay,dawki(),cityTransfer,depart()],['Sohra waterfalls','Dawki & Mawlynnong','Guwahati heritage stops'],'Three Shillong nights and a Guwahati stay bring hills, village visits and city heritage together.'),
  make('Summer',9,'Shillong & Assam Silk Trails','assam','Culture',[arriveShillong,sohraDay,cityTransfer,silkDay,depart()],['Cherrapunjee day trip','Sualkuchi silk village','Optional Brahmaputra cruise'],'Pair Shillong’s landscapes with Guwahati temples and Assam’s silk-weaving traditions.'),
  make('Summer',10,'Meghalaya Adventure & Guwahati','bridge','Adventure',[arriveShillong,transferSohra,rootTrek,dawki('Cherrapunjee'),cruiseTransfer,depart('Guwahati',true)],['Living root bridge trek','Dawki & Mawlynnong','Sankardev Kalakshetra'],'A six-day route through Meghalaya’s waterfalls and villages, finishing in Guwahati.'),
  make('Summer',11,'Manas & Meghalaya Explorer','manas','Wildlife',[manasArrival,manasJeep,day('Manas → Shillong','Drive to Shillong via Umiam Lake. If time permits, visit the Cathedral of Mary and Ward’s Lake, with an evening at leisure or Police Bazaar.','Shillong'),sohraDay,dawki(),cityTransfer,depart()],['Mathanguri jeep safari','Sohra & Dawki excursions','Guwahati cultural stops'],'Two nights at Manas, three in Shillong and one in Guwahati combine wildlife with the Meghalaya hills.'),
  make('Summer',12,'Tawang & Arunachal Mountain Circuit','arunachal-pradesh','Culture',[bhalukpong(),dirang(),tawangDrive(),tawangDay(),bomdila,bomdilaGuwahati,depart('Guwahati',true)],['Tipi Orchid Centre','Sela Pass & Nuranang Falls','Tawang monasteries'],'Journey through Bhalukpong, Dirang, Tawang and Bomdila before returning to Guwahati.',{featured:true}),
  make('Summer',13,'Meghalaya Canyons, Forests & Waterfalls','waterfall','Adventure',[
    day('Guwahati → Shillong','Meet at Guwahati airport or station and drive to Shillong via Umiam Lake. Water sports are optional. Check in and explore Police Bazaar in the evening.','Shillong'),
    day('Laitlum Canyons & Krang Suri Falls','Visit Laitlum Canyons and Krang Suri Falls, then return to Shillong after lunch at your own cost. Any water activities depend on local permission and safe conditions.','Shillong'),
    day('Mawsynram & Mawphlang Sacred Forest','Explore Mawsynram, Mawphlang Sacred Grove and the Khasi model village. Respect the grove’s rule against removing anything from the forest. Visit Elephant Falls and Shillong Peak on the return route as time allows.','Shillong'),
    dawki('Shillong','Cherrapunjee'),
    day('Cherrapunjee sights or Nongriat trek','Choose sightseeing at Eco Park, Dainthlen Falls, Nohkalikai Falls, Seven Sisters Falls, Mawsmai Cave and Thangkharang Park, or a full-day trek to the Nongriat double-decker root bridge. The trek involves around 3,200 steps each way; Rainbow Falls is a further optional extension.','Cherrapunjee'),
    day('Cherrapunjee → Guwahati','Drive to Guwahati after breakfast, check in and enjoy the rest of the day at leisure or shopping.','Guwahati'),
    day('Guwahati heritage & riverfront','Visit Srimanta Sankardev Kalakshetra, Kamakhya Temple and the Heritage Museum. Browse local markets, with an optional evening Brahmaputra cruise on direct payment, subject to river conditions and availability.','Guwahati'),depart('Guwahati',false,true)
  ],['Laitlum & Krang Suri','Mawsynram & Mawphlang','Sohra sightseeing or Nongriat trek'],'Eight days covering Meghalaya’s canyons, sacred forest and waterfalls, followed by two Guwahati nights.'),
  make('Summer',14,'Northeast Hills & Heritage Grand Tour','arunachal-pradesh','Culture',[
    arriveShillong,sohraDay,dawki(),bhalukpong('Shillong'),dirang(),tawangDrive(),tawangDay(),bomdila,bomdilaGuwahati,
    day('Guwahati temples, heritage & culture','Visit Kamakhya Temple, Navagraha Temple, the Heritage Museum and Srimanta Sankardev Kalakshetra. An evening Brahmaputra cruise is optional, payable directly and subject to river conditions and availability.','Guwahati'),depart('Guwahati',true)
  ],['Three nights in Shillong','Dirang, Tawang & Bomdila','Two nights in Guwahati'],'An eleven-day journey connecting Meghalaya’s villages and waterfalls with Arunachal’s monasteries and Assam’s heritage.')
];

const winter=[
  make('Winter',1,'Guwahati Heritage Break','assam','Culture',[
    day('Arrive in Guwahati','Transfer from Guwahati airport to your hotel. Visit Srimanta Sankardev Kalakshetra if arrival time allows.','Guwahati'),
    day('Guwahati temples & museum','Visit Kamakhya Temple, take a public ferry to Umananda Temple, and explore Navagraha Temple and Assam State Museum, subject to opening days and ferry schedules.','Guwahati'),depart()
  ],['Sankardev Kalakshetra','Kamakhya & Umananda','Navagraha & Assam State Museum'],'Two nights in Guwahati for temples, cultural landmarks and a Brahmaputra ferry crossing.'),
  make('Winter',2,'Pobitora Wildlife Escape','pobitora','Wildlife',[
    day('Guwahati → Pobitora','Meet at the airport and drive to Pobitora. Relax in the evening, with an optional Mayong magic show arranged on request and paid for directly.','Pobitora'),
    day('Pobitora wildlife & river excursion','The route plans an early elephant ride followed by breakfast and a jeep safari. An afternoon boat excursion offers a chance to look for river dolphins. Activities depend on local permissions and availability; wildlife sightings are not guaranteed.','Pobitora'),depart('Pobitora',true)
  ],['Pobitora jeep safari','Optional Mayong magic show','River dolphin excursion'],'Spend two nights near Pobitora with wildlife experiences and an optional glimpse of Mayong’s traditions.'),
  make('Winter',3,'Manas Wildlife Retreat','manas','Wildlife',[manasArrival,manasWinter,depart('Manas')],['Two nights at Manas','Mathanguri safari route','Forest & river landscapes'],'A three-day wildlife break at Manas National Park, starting and ending in Guwahati.'),
  make('Winter',4,'Shillong Winter Escape','meghalaya','Scenic',[winterShillong,winterSohra,depart('Shillong',true)],['Umiam Lake','Seven Sisters & Nohkalikai','Mawsmai Cave'],'Stay two nights in Shillong and explore Cherrapunjee’s caves and waterfall viewpoints.'),
  make('Winter',5,'Cherrapunjee Winter Trek','bridge','Adventure',[
    day('Guwahati → Cherrapunjee','Meet at Guwahati airport and drive to Cherrapunjee via Umiam Lake. Check in to your accommodation.','Cherrapunjee'),
    day('Living root bridge & waterfalls','Trek to the living root bridge via Sohsarat village, allowing approximately 4–5 hours for the return walk over steep steps and forest paths. Visit Seven Sisters Falls and Nohkalikai Falls in the afternoon.','Cherrapunjee'),depart('Cherrapunjee')
  ],['Sohsarat root bridge trek','Two Cherrapunjee nights','Seven Sisters & Nohkalikai'],'A short Cherrapunjee stay with a forest trek and waterfall viewpoints.'),
  make('Winter',6,'Guwahati & Pobitora Short Break','pobitora','Wildlife',[
    day('Arrive in Guwahati','Transfer from the airport to your hotel and visit Kamakhya Temple if arrival time permits.','Guwahati'),
    day('Guwahati → Pobitora','Drive to Pobitora after breakfast, check in and take a planned jeep safari. Cycling, trekking and a river-dolphin boat excursion are optional activities at extra cost, subject to local conditions.','Pobitora'),
    day('Pobitora → Guwahati airport','The itinerary plans an early elephant ride, subject to availability. Return for breakfast, check out and drive to Guwahati airport for departure.')
  ],['One night in each destination','Kamakhya Temple','Pobitora safari'],'Combine a Guwahati arrival stay with one night and planned wildlife activities at Pobitora.'),
  make('Winter',7,'Guwahati One-Night Extension','assam','Culture',[
    day('Guwahati arrival & sightseeing','Transfer from Guwahati airport to the hotel. Visit Assam State Museum and Srimanta Sankardev Kalakshetra, subject to opening schedules.','Guwahati'),depart('Guwahati',true)
  ],['An extra night in Guwahati','Museum & Kalakshetra','Kamakhya if time permits'],'Add a one-night Guwahati cultural stop to the beginning or end of your journey.'),
  make('Winter',8,'Shillong & Guwahati Winter Highlights','meghalaya','Scenic',[winterShillong,winterSohra,day('Shillong → Guwahati','Drive back to Guwahati and visit Kamakhya Temple. An evening Brahmaputra cruise is optional and on direct payment, subject to availability.','Guwahati'),depart()],['Two nights in Shillong','Cherrapunjee excursion','Guwahati & optional cruise'],'A four-day route combining Meghalaya’s hills with a final Guwahati night.'),
  make('Winter',9,'Kaziranga Wildlife Immersion','rhino','Wildlife',[
    kazirangaArrival,
    day('Kaziranga safari day','The itinerary plans an early elephant ride, a morning jeep safari in the Central or Western Range, and an afternoon jeep safari in the Western Range. All activities and ranges depend on park permissions and availability.','Kaziranga'),
    day('Eastern Range & local culture','Take a planned jeep safari in the Eastern Range after breakfast. In the afternoon visit a local village, view a tea garden from outside and explore the Orchid and Biodiversity Park.','Kaziranga'),depart('Kaziranga',true)
  ],['Three nights at Kaziranga','Multiple planned safari ranges','Village, tea garden & orchid park'],'A four-day Kaziranga itinerary with time for wildlife drives and local cultural visits.',{featured:true}),
  make('Winter',10,'Shillong & Kaziranga Winter Trail','assam','Wildlife',[winterShillong,winterSohra,kazirangaTransfer,kazirangaSafari,depart('Kaziranga',true)],['Two nights in Shillong','Two nights at Kaziranga','Waterfalls, caves & wildlife'],'Connect Cherrapunjee’s landscapes with Kaziranga’s grasslands on a five-day route.'),
  make('Winter',11,'Meghalaya, Kaziranga & Guwahati','assam','Wildlife',[winterShillong,winterSohra,kazirangaTransfer,kazirangaSafari,kazirangaGuwahati,depart()],['Shillong & Cherrapunjee','Kaziranga safari','Guwahati heritage'],'Six days across Meghalaya and Assam, with a final Guwahati stay before departure.'),
  make('Winter',12,'Meghalaya Villages & Kaziranga','meghalaya','Wildlife',[winterShillong,winterSohra,dawki(),kazirangaTransfer,kazirangaSafari,kazirangaGuwahati,depart()],['Mawlynnong, Rewai & Dawki','Kaziranga wildlife','Guwahati temples & riverfront'],'Add Mawlynnong and Dawki to a seven-day Meghalaya, Kaziranga and Guwahati journey.'),
  make('Winter',13,'Manas, Nameri & Kaziranga Safari Circuit','manas','Wildlife',[
    manasArrival,manasWinter,day('Manas → Nameri','Drive to Nameri after breakfast and check in near its forest and river landscapes.','Nameri'),
    day('Nameri nature walk → Kaziranga','Start with an early guided forest walk of approximately 3.2 km. After breakfast, the route plans rafting on the Jia Bhoroli River. Return to camp, then travel to Kaziranga. Walking and rafting depend on local permissions, conditions and availability.','Kaziranga'),kazirangaSafari,depart('Kaziranga',true)
  ],['Manas & Mathanguri','Nameri walk & rafting','Kaziranga wildlife'],'Three Assam wildlife destinations in six days, with two Manas nights, one Nameri night and two at Kaziranga.'),
  make('Winter',14,'Kaziranga, Majuli & Guwahati','assam','Culture',[
    kazirangaArrival,kazirangaSafari,
    day('Kaziranga → Nimati Ghat → Majuli','Drive to Nimati Ghat and take a public ferry across the Brahmaputra to Majuli. Continue to your accommodation. Ferry travel depends on river conditions and operating schedules.','Majuli'),
    day('Majuli’s living traditions','Visit the sattras in and around Majuli to discover the island’s Vaishnavite cultural and spiritual heritage.','Majuli'),
    day('Majuli → Guwahati','Take the return ferry across the Brahmaputra, then drive to Guwahati and check in for the final night.','Guwahati'),depart('Guwahati',true)
  ],['Kaziranga wildlife','Brahmaputra ferry crossings','Majuli’s sattras'],'Pair Kaziranga’s wildlife with two nights among Majuli’s living cultural traditions.',{featured:true}),
  make('Winter',15,'Tawang & Arunachal Winter Circuit','arunachal-pradesh','Culture',[bhalukpong('Guwahati',true),dirang(true),tawangDrive(),tawangDay(),bomdila,bomdilaGuwahati,depart('Guwahati',true)],['Dirang & Tipi orchids','Tawang monasteries','Bomdila mountain stay'],'A seven-day mountain journey through Tezpur or Bhalukpong, Dirang, Tawang and Bomdila.'),
  make('Winter',16,'Meghalaya & Tawang Winter Journey','arunachal-pradesh','Culture',[simpleShillong,sohraDay,bhalukpong('Shillong',true),dirang(true),tawangDrive(false),tawangDay(false),bomdila,bomdilaGuwahati,depart('Guwahati',true)],['Shillong & Cherrapunjee','Sela Pass & Tawang','Bomdila & Guwahati'],'Nine days linking Meghalaya’s hills with Arunachal’s monasteries and mountain landscapes.'),
  make('Winter',17,'Northeast Winter Grand Circuit','arunachal-pradesh','Wildlife',[simpleShillong,sohraDay,bhalukpong('Shillong',true),dirang(true),tawangDrive(false),tawangDay(false),bomdila,day('Bomdila → Kaziranga','Drive from Bomdila to Kaziranga after breakfast and check in to your accommodation.','Kaziranga'),kazirangaSafari,depart('Kaziranga')],['Meghalaya waterfalls & caves','Tawang & Bomdila','Kaziranga wildlife'],'Ten days through Assam, Meghalaya and Arunachal Pradesh, ending with two Kaziranga nights.')
];

const signature=[
  make('Signature',1,'Imphal & Loktak Lake Extension','manipur','Culture',[kohimaImphal,loktakDay,imphalDepart],['Govindajee Temple evening aarti','Keibul Lamjao & the sangai deer','Boat ride on Loktak Lake'],'A short Manipur extension from Kohima, with Imphal’s heritage, the floating national park and a boat ride on Loktak Lake.',{start:'Kohima',end:'Imphal',source:'itineraries/manipur.docx'}),
  make('Signature',2,'Kaziranga, Sivasagar & Hajo Heritage Trail','assam','Culture',[
    day('Guwahati → Kaziranga','Meet at Guwahati airport or railway station and drive to Kaziranga National Park, home to the world’s largest population of greater one-horned rhinos. In the evening, enjoy an Assamese Bihu cultural performance, subject to the local programme.','Kaziranga'),
    day('Kaziranga → Sivasagar','Take an early jeep safari in the Central or Western Range, then return for breakfast and drive to Sivasagar, the former Ahom capital. Visit Rang Ghar, the royal amphitheatre; Talatal Ghar, the seven-storeyed Ahom palace; Kareng Ghar; and Joy Dol. Safari ranges and timings depend on park arrangements.','Sivasagar'),
    day('Sivasagar → Guwahati','Visit Shiva Dol and Vishnu Dol, two of Sivasagar’s landmark Ahom-era temples. After lunch, drive back to Guwahati.','Guwahati'),
    day('Kamakhya & Hajo','Visit Kamakhya Temple on Nilachal Hill early in the morning, then continue to Hajo, where Hindu, Buddhist and Islamic shrines share the same hills. Climb the steps to Hayagriva Madhava Temple and visit Poa Mecca, the revered shrine of Pir Giasuddin Auliya. Return to Guwahati in the evening.','Guwahati'),
    depart('Guwahati',false,true)
  ],['Kaziranga jeep safari','Ahom palaces & temples of Sivasagar','Kamakhya, Hayagriva Madhava & Poa Mecca'],'Five days through Assam’s wildlife and history, from Kaziranga’s grasslands to the Ahom capital of Sivasagar and the multi-faith hills of Hajo.',{source:'itineraries/sivasagar-hajo-4n-5d.docx'}),
  make('Signature',3,'Shillong Cherry Blossom Special','meghalaya','Scenic',[
    day('Guwahati → Shillong','Meet at Guwahati airport and visit Kamakhya Temple, then drive to Shillong with a stop at Umiam Lake (Barapani), where kayaking and boating are optional. Visit the Cathedral of Mary if time permits.','Shillong'),
    day('Shillong city','Visit Shillong Peak and Elephant Falls, then return to the hotel for lunch and a rest. In the afternoon, see Lady Hydari Park and Ward’s Lake, with a walk around Police Bazaar.','Shillong'),
    dawki('Shillong','Cherrapunjee'),
    day('Cherrapunjee → Shillong','After breakfast, stop at the Duwan Sing Syiem viewpoint and visit Seven Sisters Falls, Nohkalikai Falls and Mawsmai Cave before driving back to Shillong.','Shillong'),
    day('Shillong Cherry Blossom Festival','Spend the day at the Shillong Cherry Blossom Festival, when the city’s cherry trees flower in late autumn. Festival dates and programmes are announced by the organisers each year, so plan your travel dates around the confirmed schedule.','Shillong'),
    day('Shillong → Guwahati airport','After breakfast, check out and drive to Guwahati, visiting Kamakhya Temple if time permits before your flight.')
  ],['Shillong Cherry Blossom Festival','Mawlynnong, Rewai & Dawki','Cherrapunjee waterfalls & caves'],'Six days in Meghalaya timed around Shillong’s cherry blossom season, with Dawki’s clear river, Mawlynnong village and the waterfalls of Cherrapunjee.',{featured:true,source:'itineraries/cherry-blossom-shillong.docx'}),
  make('Signature',4,'Meghalaya, Kaziranga, Nagaland & Manipur','nagaland','Culture',[
    day('Guwahati → Shillong','Meet on arrival at Guwahati airport and drive to Shillong, stopping at Umiam Lake (Barapani), where kayaking and boating are optional. Visit the Cathedral of Mary if time permits.','Shillong'),
    sohraLunch,dawki(),kazirangaTransfer,
    day('Kaziranga → Kohima','Start with an early elephant ride, then return for breakfast before a jeep safari in the Central Range. Check out and drive to Kohima. Elephant rides usually begin in November and jeep safaris in early October; all activities depend on park opening and availability.','Kohima'),
    day('Kohima museum & war cemetery','Visit the Nagaland State Museum, which introduces the attire, crafts and traditions of the state’s tribes, then the Kohima War Cemetery, a Second World War memorial with views over the town.','Kohima'),
    day('Khonoma village excursion','Travel about 20 km to Khonoma, recognised as India’s first green village for its community conservation and terraced fields. Spend unhurried time in the village before returning to Kohima.','Kohima'),
    kohimaImphal,loktakDay,imphalDepart
  ],['Cherrapunjee, Mawlynnong & Dawki','Kaziranga safari','Kohima, Khonoma & Loktak Lake'],'Ten days from Meghalaya’s waterfalls and Kaziranga’s grasslands to the hills of Nagaland and the lakes of Manipur.',{featured:true,end:'Imphal',source:'itineraries/shillong-kohima-imphal-10d.docx'}),
  make('Signature',5,'Arunachal, Mizoram & Tripura Grand Tour','tripura','Culture',[
    bhalukpong('Guwahati',true),dirang(true),tawangDrive(),tawangDay(),bomdila,bomdilaGuwahati,
    day('Guwahati → Aizawl','After breakfast, transfer to Guwahati airport for your flight to Aizawl. Check in and spend the evening at leisure.','Aizawl'),
    day('Aizawl sightseeing','Visit the Mizoram State Museum on Macdonald Hill for an introduction to Mizo culture, then browse Bara Bazar and the Luangmual handicrafts centre for traditional crafts.','Aizawl'),
    day('Aizawl → Agartala','Transfer to Aizawl airport for your flight to Agartala, which connects via Guwahati. Arrive in Tripura’s capital, known for its royal palaces and temples.','Agartala'),
    day('Agartala palaces & temples','Take a tour covering Sepahijala Wildlife Sanctuary, Ujjayanta Palace, Tripura Sundari Temple and the Neermahal lake palace, with the rest of the day at leisure.','Agartala'),
    day('Unakoti excursion','Take a full-day trip to Unakoti to see its ancient rock-cut carvings and murals set among forest streams and waterfalls, then return to Agartala. Expect long driving hours.','Agartala'),
    day('Agartala → Agartala airport','After breakfast, transfer to Agartala airport. Your tour ends here.')
  ],['Sela Pass & Tawang monasteries','Aizawl’s museum & crafts','Ujjayanta Palace, Neermahal & Unakoti'],'Twelve days across three states: Arunachal’s mountain monasteries, Mizoram’s hilltop capital and Tripura’s palaces and rock carvings.',{featured:true,end:'Agartala',source:'itineraries/arunachal-mizoram-tripura.docx'})
];

export const packages=[...summer,...winter,...signature];
// Old URLs that should keep working: the retired sample packages and every former EF-coded package.
export const packageAliases={
  'meghalaya-explorer':'summer-ne-07',
  'assam-wildlife-culture':'winter-ne-14',
  'arunachal-scenic-circuit':'summer-ne-12',
  'complete-northeast-escape':'winter-ne-17',
  ...Object.fromEntries([...summer,...winter].map(p=>[p.slug.replace('-ne-','-ef-'),p.slug]))
};
export const hotelCategories=[['Budget','Budget-property category'],['Standard','2-star-equivalent category'],['Deluxe','3-star-equivalent category'],['Luxury','4-star-equivalent category'],['Premium','Best available hotel for the destination']];
