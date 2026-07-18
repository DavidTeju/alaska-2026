// ============================================================
// Alaska Trip Companion — all trip data lives here.
// Edit this file as bookings firm up; the app re-renders from it.
// ============================================================

export const TRIP = {
  title: 'Alaska',
  dates: 'Aug 12–26, 2026',
};

export const PEOPLE = [
  { id: 'femi', name: 'Femi', emoji: '🧗', legs: ['wilderness', 'water'] },
  { id: 'cynthia', name: 'Cynthia', emoji: '🥾', legs: ['wilderness', 'water'] },
  { id: 'jing', name: 'Jing', emoji: '🌊', legs: ['water'], arrives: 'Aug 20' },
];

// Every day of the trip. leg: 'wilderness' (Aug 12–20) | 'water' (Aug 20–26)
export const DAYS = [
  { date: '2026-08-12', leg: 'wilderness' },
  { date: '2026-08-13', leg: 'wilderness' },
  { date: '2026-08-14', leg: 'wilderness' },
  { date: '2026-08-15', leg: 'wilderness' },
  { date: '2026-08-16', leg: 'wilderness' },
  { date: '2026-08-17', leg: 'wilderness' },
  { date: '2026-08-18', leg: 'wilderness' },
  { date: '2026-08-19', leg: 'wilderness' },
  { date: '2026-08-20', leg: 'water' },
  { date: '2026-08-21', leg: 'water' },
  { date: '2026-08-22', leg: 'water' },
  { date: '2026-08-23', leg: 'water' },
  { date: '2026-08-24', leg: 'water' },
  { date: '2026-08-25', leg: 'water' },
  { date: '2026-08-26', leg: 'water' },
];

// Human day label generated from the ISO date (noon avoids timezone rollover).
export function dayLabel(iso) {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).replace(',', ' ·');
}

const ALL = ['femi', 'cynthia', 'jing'];
const PACK = ['femi', 'cynthia'];

// ---- Variant groups: the real decisions. Exactly one option active per group. ----
export const VARIANT_GROUPS = [
  {
    id: 'wilderness-route',
    label: 'Wilderness route',
    options: ['goat-trail', 'nizina-packraft', 'nabesna-loop'],
    default: 'goat-trail',
  },
  {
    id: 'cruise',
    label: 'Glacier cruise',
    options: ['kenai-fjords', 'glacier-26'],
    default: 'kenai-fjords',
  },
  {
    id: 'fifth-day',
    label: 'Big activity day',
    options: ['coho-fishing', 'six-mile-rafting'],
    default: 'coho-fishing',
  },
];

// ---- Experiences ----
// cost.mode: perPerson | shared | included | free
// defaultDay: preloaded placement (null = lives in the options drawer only)
export const EXPERIENCES = [
  // — Narrative / logistics cards (no à-la-carte cost or bundled) —
  { id: 'arrive-anc', name: 'Arrive in Anchorage', emoji: '✈️', category: 'travel', fixed: true,
    where: 'Anchorage', duration: 'evening', who: ALL, cost: { amount: 0, mode: 'free' },
    defaultDay: '2026-08-12', blurb: 'Touch down, grab the rental, stock up, and settle into the hostel. The adventure starts tomorrow.' },
  { id: 'to-mccarthy', name: 'Travel to McCarthy', emoji: '🚗', category: 'travel', fixed: true,
    where: 'Anchorage → Chitina → McCarthy', duration: 'full day', who: PACK,
    cost: { amount: 129, mode: 'perPerson' }, defaultDay: '2026-08-13',
    blurb: 'A gorgeous paved drive to Chitina, then a shuttle (or a 30-minute flightseeing hop) into the tiny historic town of McCarthy at the edge of the wild.' },
  { id: 'return-anc', name: 'Back to Anchorage', emoji: '🚗', category: 'travel', fixed: true,
    where: 'McCarthy → Anchorage', duration: 'full day', who: PACK, cost: { amount: 0, mode: 'free' },
    defaultDay: '2026-08-19', blurb: 'Roll back to the city for a hot shower, a huge meal, and a real bed after the backcountry.' },
  { id: 'reunite', name: 'Reunite + rest', emoji: '🎉', category: 'rest', fixed: true,
    where: 'Anchorage', duration: 'chill', who: ALL, cost: { amount: 0, mode: 'free' },
    defaultDay: '2026-08-20', blurb: 'The whole crew is together. Trade stories, do laundry, wander the city, and gear up for the water half.' },

  // — Wilderness route variants (Femi + Cynthia) —
  { id: 'goat-trail', name: 'The Goat Trail traverse', emoji: '🥾', category: 'wilderness',
    where: 'Wrangell–St. Elias', duration: '5–6 days', who: PACK, spanDays: 5,
    cost: { amount: 1330, mode: 'shared' }, variantGroup: 'wilderness-route', defaultDay: '2026-08-14',
    coords: [61.53, -142.18],
    blurb: 'The definitive Alaskan route-finding traverse: a bush plane drops you at Skolai Pass and you navigate an ancient, trail-less world of glacial creeks, a fossil-studded seabed plateau, and the jaw-dropping Chitistone Gorge before a pickup at Wolverine. Pure wilderness.' },
  { id: 'nizina-packraft', name: 'Nizina packraft float', emoji: '🛶', category: 'wilderness',
    where: 'Wrangell–St. Elias', duration: '2–4 days', who: PACK, spanDays: 3,
    cost: { amount: 595, mode: 'shared' }, variantGroup: 'wilderness-route', defaultDay: '2026-08-14',
    coords: [61.33, -142.9],
    blurb: 'Fly in over ice, paddle an iceberg-dotted glacial lake, then ride a big, braided glacial river beneath the 5,000-foot Mile High Cliffs all the way back toward town. The packraft dream.' },
  { id: 'nabesna-loop', name: 'Nabesna backcountry loop', emoji: '🧭', category: 'wilderness',
    where: 'Wrangell–St. Elias (Nabesna Rd)', duration: '4–5 days', who: PACK, spanDays: 4,
    cost: { amount: 0, mode: 'free' }, variantGroup: 'wilderness-route', defaultDay: '2026-08-14',
    coords: [62.36, -143.0],
    blurb: 'Drive straight to the trailhead and disappear into remote creek valleys and open passes — endless route-finding and stream crossings, no plane required.' },

  // — Cruise variants (all) —
  { id: 'kenai-fjords', name: 'Kenai Fjords cruise', emoji: '🐋', category: 'water',
    where: 'Seward', duration: '6 hr', who: ALL, cost: { amount: 239, mode: 'perPerson' },
    variantGroup: 'cruise', defaultDay: '2026-08-23', coords: [60.1042, -149.4422],
    blurb: 'Cruise into Aialik Bay to watch a tidewater glacier calve into the sea, with humpbacks, orcas, sea lions, otters, and puffins along the way. The best wildlife day on the water.' },
  { id: 'glacier-26', name: '26 Glacier cruise', emoji: '🧊', category: 'water',
    where: 'Whittier', duration: '5 hr', who: ALL, cost: { amount: 219, mode: 'perPerson' },
    variantGroup: 'cruise', defaultDay: '2026-08-23', coords: [60.7739, -148.6836],
    blurb: 'A glacier lover’s dream just over an hour from Anchorage: glide through College Fjord past dozens of glaciers on calm, protected water.' },

  // — Fifth-day variants (all) —
  { id: 'coho-fishing', name: 'Silver salmon fishing', emoji: '🎣', category: 'activity',
    where: 'Kenai / Kasilof', duration: 'half day', who: ALL, cost: { amount: 250, mode: 'perPerson' },
    variantGroup: 'fifth-day', defaultDay: '2026-08-25', coords: [60.4877, -151.0583],
    blurb: 'Late August is prime silver-salmon season. Hop a guided boat, let the pros put you on fish, and haul in dinner from a legendary Alaskan river.' },
  { id: 'six-mile-rafting', name: 'Six Mile Creek rafting', emoji: '🌊', category: 'activity',
    where: 'Hope', duration: '3–4 hr', who: ALL, cost: { amount: 159, mode: 'perPerson' },
    variantGroup: 'fifth-day', defaultDay: '2026-08-25', coords: [60.9217, -149.6431],
    blurb: 'Big, cold, technical whitewater through three canyons — one of the most thrilling Class IV–V runs in the state for anyone craving adrenaline.' },

  // — Add-ons (preloaded into the plan, removable) —
  { id: 'spencer-float', name: 'Spencer Glacier float', emoji: '🚂', category: 'water',
    where: 'Train from Anchorage', duration: 'full day', who: ALL, cost: { amount: 316, mode: 'perPerson' },
    defaultDay: '2026-08-21', coords: [60.71, -149.05],
    blurb: 'Ride the rails to a whistle-stop only reachable by train, then raft a calm river through a fleet of icebergs calved off Spencer Glacier. Effortless magic.' },
  { id: 'kayak-resbay', name: 'Resurrection Bay kayak', emoji: '🛶', category: 'water',
    where: 'Seward', duration: '4 hr', who: ALL, cost: { amount: 125, mode: 'perPerson' },
    defaultDay: '2026-08-24', coords: [60.09, -149.42],
    blurb: 'Paddle glassy morning water past seabird rookeries, seals, and waterfalls in a postcard bay ringed by mountains.' },
  { id: 'alyeska-spa', name: 'Alyeska Nordic Spa', emoji: '♨️', category: 'rest',
    where: 'Girdwood', duration: 'half day', who: ALL, cost: { amount: 125, mode: 'perPerson' },
    defaultDay: '2026-08-26', coords: [60.97, -149.12],
    blurb: 'Hot pools, cold plunges, saunas, and mountain views — the perfect melt-into-a-puddle finale before flying home.' },

  // — Options drawer only (not preloaded) —
  { id: 'matanuska-walk', name: 'Matanuska Glacier walk', emoji: '🧊', category: 'activity',
    where: 'Glacier View', duration: 'half day', who: ALL, cost: { amount: 170, mode: 'perPerson' },
    defaultDay: null, coords: [61.77, -147.75],
    blurb: 'Strap on spikes and walk out onto a living glacier — blue ice, deep crevasses, and meltwater rivers underfoot.' },
];

// Extra activities from the research swarm — options-drawer only (never auto-inserted).
// imageUrl values are localized by scripts/fetch-images.mjs at build time.
export let EXTRA_ACTIVITIES = [
  // — Climbing —
  { id: 'x-seward-crag', name: 'Seward Highway cragging', emoji: '🧗', category: 'climbing',
    where: 'Turnagain Arm · 20–45 min', duration: '2–6 hr', who: ALL, cost: { amount: 0, mode: 'free' },
    defaultDay: null, imageUrl: 'https://mountainproject.com/assets/photos/climb/126093168_medium_1714779539.jpg',
    sourceUrl: 'https://www.mountainproject.com/area/105991968/seward-highway',
    blurb: "Alaska's main roadside climbing corridor — trad and sport routes from mellow 5.5 to serious testpieces, all with a Turnagain Arm backdrop of tides, mountains, and maybe a beluga." },
  { id: 'x-archangel', name: 'Archangel Valley bouldering', emoji: '🪨', category: 'climbing',
    where: 'Hatcher Pass · ~1.5 hr', duration: 'half/full day', who: ALL, cost: { amount: 0, mode: 'free' },
    defaultDay: null, imageUrl: 'https://mountainproject.com/assets/photos/climb/113531735_medium_1504229054.jpg',
    sourceUrl: 'https://www.mountainproject.com/area/108216560/archangel-valley-bouldering-diamond-fairangel-monolith-roadside-indianhead',
    blurb: 'Blocky alpine granite scattered across the tundra and peaks of Hatcher Pass — over 1,300 problems from friendly slabs to powerful overhangs. Crash-pad rentals available in Anchorage.' },
  { id: 'x-mica-ice', name: 'Glacier ice climbing', emoji: '🧊', category: 'climbing',
    where: 'Matanuska Glacier · ~2 hr', duration: 'full day', who: ALL, cost: { amount: 279, mode: 'perPerson' },
    defaultDay: null, imageUrl: 'https://micaguides.com/wp-content/uploads/2025/11/Creme-17-scaled.jpg',
    sourceUrl: 'https://micaguides.com/activities/ice-climbing/',
    blurb: 'Hike onto the Matanuska Glacier, learn crampon and ice-tool technique, and spend hours climbing shimmering blue walls. No experience needed — the August-viable form of ice climbing.' },
  { id: 'x-rock-guide', name: 'Private rock-climbing guide', emoji: '🧗', category: 'climbing',
    where: 'Anchorage front range · 20 min–1.5 hr', duration: 'full day', who: ALL, cost: { amount: 233, mode: 'perPerson' },
    defaultDay: null, imageUrl: 'https://chugachsnow.org/wp-content/uploads/2025/07/IMG_8653.jpeg',
    sourceUrl: 'https://chugachsnow.org/guided-rock-climbing-in-alaska/',
    blurb: 'A guide tailors a private sport, trad, or multi-pitch day to the group — from an intro session to classic Chugach lines. Roughly $233 each for three.' },
  { id: 'x-rock-gym', name: 'Alaska Rock Gym (rainy day)', emoji: '🌧️', category: 'climbing',
    where: 'Midtown Anchorage · 10 min', duration: '2–4 hr', who: ALL, cost: { amount: 28, mode: 'perPerson' },
    defaultDay: null, imageUrl: 'https://www.alaskarockgym.com/wp-content/uploads/2025/05/Untitled-design-copy-4-scaled.jpg',
    sourceUrl: 'https://www.alaskarockgym.com/prices/',
    blurb: 'Turn a rainy day into a session: bouldering, top-rope, lead, and auto-belays. Day pass $28, gear rental on site.' },

  // — Water / wildcard —
  { id: 'x-blackstone-jet', name: 'Blackstone Bay jet skis', emoji: '🛥️', category: 'water',
    where: 'Whittier · ~1.5 hr', duration: 'half day', who: ALL, cost: { amount: 360, mode: 'perPerson' },
    defaultDay: null, imageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=85',
    sourceUrl: 'https://alaskawildguides.com/product/glacier-jet-ski-tour',
    blurb: 'Skip the cruise boat and rip 55 miles into Prince William Sound on a Sea-Doo, out to Blackstone Bay’s tidewater glaciers, waterfalls, and floating ice.' },
  { id: 'x-biolum-kayak', name: 'Bioluminescence night kayak', emoji: '✨', category: 'water',
    where: 'Resurrection Bay, Seward · ~2.5 hr', duration: '2–3 hr', who: ALL, cost: { amount: 120, mode: 'perPerson' },
    defaultDay: null, imageUrl: 'https://images.unsplash.com/photo-1530053969600-caed2596d242?auto=format&fit=crop&w=1400&q=85',
    sourceUrl: 'https://www.soundeco.com/',
    blurb: 'Paddle out as darkness finally falls in late August and watch the water glow electric blue with every stroke — glowing plankton swirling off your paddle. Otherworldly.' },
  { id: 'x-bore-tide', name: 'Turnagain bore tide', emoji: '🌊', category: 'wildcard',
    where: 'Beluga Point · ~40 min', duration: '1–2 hr', who: ALL, cost: { amount: 0, mode: 'free' },
    defaultDay: null, imageUrl: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1400&q=85',
    sourceUrl: 'https://www.anchorage.net/blog/post/alaska-bore-tide-viewing/',
    blurb: 'One of the only tidal bores in the U.S. — a moving wall of water surging up the inlet against the current, with surfers riding it for miles on big tide days.' },
  { id: 'x-exit-glacier', name: 'Exit Glacier walk', emoji: '🧊', category: 'wildcard',
    where: 'Kenai Fjords NP · ~2.5 hr', duration: '2–4 hr', who: ALL, cost: { amount: 0, mode: 'free' },
    defaultDay: null, imageUrl: 'https://images.unsplash.com/photo-1520769669658-f07657f5a307?auto=format&fit=crop&w=1400&q=85',
    sourceUrl: 'https://www.nps.gov/kefj/planyourvisit/exit-glacier-area.htm',
    blurb: 'One of the only glaciers you can walk right up to on your own. Easy trails wind up a valley carved by ice, with year-markers showing how far it has retreated. Free.' },
  { id: 'x-alyeska-tram', name: 'Alyeska summit tram', emoji: '🚡', category: 'wildcard',
    where: 'Girdwood · ~45 min', duration: '2–3 hr', who: ALL, cost: { amount: 45, mode: 'perPerson' },
    defaultDay: null, imageUrl: 'https://images.unsplash.com/photo-1502786129293-79981df4e689?auto=format&fit=crop&w=1400&q=85',
    sourceUrl: 'https://www.alyeskaresort.com/activities/aerial-tram',
    blurb: 'Glide 2,300 ft up for views of seven hanging glaciers and Turnagain Arm, with ridge walks and a drink at Alaska’s highest patio waiting at the top.' },
  { id: 'x-denali-flight', name: 'Denali flightseeing', emoji: '🛩️', category: 'wildcard',
    where: 'Talkeetna · ~2.5 hr', duration: 'half day', who: ALL, cost: { amount: 435, mode: 'perPerson' },
    defaultDay: null, imageUrl: 'https://images.unsplash.com/photo-1483347756197-71ef80e95f73?auto=format&fit=crop&w=1400&q=85',
    sourceUrl: 'https://www.talkeetnaair.com/',
    blurb: 'Fly from funky Talkeetna into the Alaska Range for eye-level views of Denali and immense glaciers — many flights land you on the ice at the mountain’s base.' },
  { id: 'x-whittier', name: 'Whittier: town under one roof', emoji: '🏢', category: 'wildcard',
    where: 'Whittier · ~1.5 hr', duration: 'half day', who: ALL, cost: { amount: 13, mode: 'perPerson' },
    defaultDay: null, imageUrl: 'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?auto=format&fit=crop&w=1400&q=85',
    sourceUrl: 'https://www.travelalaska.com/destinations/cities-towns/whittier',
    blurb: 'Reach this weird port through a 2.5-mile one-lane tunnel shared with trains. Almost all 270 residents live in one Cold War-era building. Fish and chips + waterfalls.' },

  // — Biking —
  { id: 'x-eklutna', name: 'Eklutna paddle & pedal', emoji: '🚲', category: 'biking',
    where: 'Eklutna Lake · ~45 min', duration: '5–6 hr', who: ALL, cost: { amount: 149, mode: 'perPerson' },
    defaultDay: null, imageUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1400&q=85',
    sourceUrl: 'https://www.lifetimeadventures.net/rentals',
    blurb: 'Paddle eight miles down a turquoise lake, then bike nine miles back along the shore — two sports, huge Chugach views, and a satisfying self-powered loop.' },
  { id: 'x-alyeska-bike', name: 'Alyeska downhill bike park', emoji: '🚵', category: 'biking',
    where: 'Girdwood · ~45 min', duration: '4–6 hr', who: ALL, cost: { amount: 175, mode: 'perPerson' },
    defaultDay: null, imageUrl: 'https://images.unsplash.com/photo-1544191696-15693072b9a4?auto=format&fit=crop&w=1400&q=85',
    sourceUrl: 'https://www.alyeskaresort.com/alyeska-bike-park/',
    blurb: 'Alaska’s only lift-served downhill park: chair up, gravity down, repeat. Full-suspension rentals and pads on site, Girdwood beers after.' },
  { id: 'x-kincaid-mtb', name: 'Kincaid Park mountain biking', emoji: '🚴', category: 'biking',
    where: 'Anchorage · 20 min', duration: '2–4 hr', who: ALL, cost: { amount: 50, mode: 'perPerson' },
    defaultDay: null, imageUrl: 'https://images.unsplash.com/photo-1576858574144-9ae1ebcf5ae5?auto=format&fit=crop&w=1400&q=85',
    sourceUrl: 'https://www.muni.org/departments/parks/pages/kincaid.aspx',
    blurb: 'Miles of flowy singletrack through coastal forest right in the city, with moose sightings and Cook Inlet overlooks. Grab a rental downtown and go.' },

  // — Wildlife —
  { id: 'x-awcc', name: 'Alaska Wildlife Conservation Center', emoji: '🐻', category: 'wildlife',
    where: 'Portage · ~1 hr', duration: '2–3 hr', who: ALL, cost: { amount: 20, mode: 'perPerson' },
    defaultDay: null, imageUrl: 'https://images.unsplash.com/photo-1568162603664-fcd658421851?auto=format&fit=crop&w=1400&q=85',
    sourceUrl: 'https://www.alaskawildlife.org/',
    blurb: 'A drive-through sanctuary for rescued brown bears, moose, bison, musk ox, and lynx — the most reliable way to see Alaska’s big animals up close, on the way to Whittier.' },
  { id: 'x-bear-viewing', name: 'Katmai bear-viewing flight', emoji: '🐻', category: 'wildlife',
    where: 'Fly-out from Homer/Soldotna', duration: 'full day', who: ALL, cost: { amount: 700, mode: 'perPerson' },
    defaultDay: null, imageUrl: 'https://images.unsplash.com/photo-1525382455947-f319bc05fb35?auto=format&fit=crop&w=1400&q=85',
    sourceUrl: 'https://www.alaska.org/things-to-do/bear-viewing',
    blurb: 'The splurge of splurges: a bush plane to a remote coast where brown bears fish for salmon a stone’s throw away. Late August is peak feeding — unforgettable.' },
  { id: 'x-potter-marsh', name: 'Potter Marsh boardwalk', emoji: '🦆', category: 'wildlife',
    where: 'South Anchorage · 20 min', duration: '1 hr', who: ALL, cost: { amount: 0, mode: 'free' },
    defaultDay: null, imageUrl: 'https://images.unsplash.com/photo-1497206365907-f5e630693df0?auto=format&fit=crop&w=1400&q=85',
    sourceUrl: 'https://www.alaska.org/detail/potter-marsh-boardwalk',
    blurb: 'An easy elevated boardwalk over a wetland alive with salmon, ducks, arctic terns, and often moose — a quick, free wildlife hit minutes from the city.' },
];
export function registerExtras(list) { EXTRA_ACTIVITIES = list; }

// ---- Map points (landmarks + experiences). Emoji-per-category, no colors, no ruled-out. ----
export const MAP_CATEGORIES = {
  base: '🏠', gateway: '🚪', wilderness: '🥾', water: '🐋', activity: '🎣', rest: '♨️',
};
export const MAP_POINTS = [
  { id: 'anchorage', name: 'Anchorage', cat: 'base', coords: [61.2181, -149.9003], blurb: 'Home base — hostel + rental car.' },
  { id: 'chitina', name: 'Chitina', cat: 'gateway', coords: [61.5153, -144.4344], blurb: 'End of the paved road; park and shuttle into the park.' },
  { id: 'mccarthy', name: 'McCarthy', cat: 'gateway', coords: [61.4325, -142.9285], blurb: 'Tiny historic town; bush-plane hub for the backcountry.' },
  { id: 'kennicott', name: 'Kennicott Mill', cat: 'gateway', coords: [61.4816, -142.8853], blurb: 'Historic red copper-mill town beneath the glaciers.' },
  { id: 'skolai', name: 'Skolai Pass', cat: 'wilderness', coords: [61.617, -142.03], blurb: 'Goat Trail fly-in — alpine start of the traverse.' },
  { id: 'chitistone', name: 'Chitistone Gorge', cat: 'wilderness', coords: [61.53, -142.18], blurb: 'The dramatic heart of the Goat Trail.' },
  { id: 'wolverine', name: 'Wolverine', cat: 'wilderness', coords: [61.46, -142.4], blurb: 'Goat Trail fly-out after the fossil plateau.' },
  { id: 'nizina', name: 'Nizina Glacier', cat: 'wilderness', coords: [61.33, -142.9], blurb: 'Packraft put-in: iceberg lake + glacial river.' },
  { id: 'nabesna', name: 'Nabesna Road', cat: 'wilderness', coords: [62.36, -143.0], blurb: 'Drive-in backcountry loop, no plane needed.' },
  { id: 'kesugi', name: 'Kesugi Ridge', cat: 'wilderness', coords: [62.7469, -150.0447], blurb: 'Open ridgewalk with huge Denali views.' },
  { id: 'crowpass', name: 'Crow Pass', cat: 'wilderness', coords: [60.9757, -149.1], blurb: 'Road-accessible alpine crossing near Girdwood.' },
  { id: 'seward', name: 'Seward', cat: 'water', coords: [60.1042, -149.4422], blurb: 'Gateway to Kenai Fjords — cruises + kayaking.' },
  { id: 'whittier', name: 'Whittier', cat: 'water', coords: [60.7739, -148.6836], blurb: 'Prince William Sound glacier cruises.' },
  { id: 'spencer', name: 'Spencer Glacier', cat: 'water', coords: [60.71, -149.05], blurb: 'Train-access iceberg float.' },
  { id: 'girdwood', name: 'Girdwood', cat: 'rest', coords: [60.97, -149.12], blurb: 'Alyeska resort, spa, and rainforest trails.' },
  { id: 'soldotna', name: 'Soldotna / Kenai', cat: 'activity', coords: [60.4877, -151.0583], blurb: 'Silver-salmon fishing base.' },
  { id: 'hope', name: 'Hope', cat: 'activity', coords: [60.9217, -149.6431], blurb: 'Six Mile Creek whitewater.' },
  { id: 'matanuska', name: 'Matanuska Glacier', cat: 'activity', coords: [61.77, -147.75], blurb: 'Roadside glacier ice walks.' },
  { id: 'talkeetna', name: 'Talkeetna', cat: 'activity', coords: [62.3209, -150.1066], blurb: 'Quirky town + Denali flightseeing.' },
];

// ---- Lodging (per night, who's where) ----
export const LODGING = [
  { date: '2026-08-12', place: 'Base Camp Anchorage (hostel)', who: PACK, note: 'Capitol-Hill-of-Anchorage vibe, gear storage.' },
  { date: '2026-08-13', place: 'Base Camp Kennicott (camping)', who: PACK, note: 'By the McCarthy footbridge.' },
  { date: '2026-08-14', place: 'Backcountry campsite', who: PACK, note: 'Tent, wherever the day ends on the route.' },
  { date: '2026-08-15', place: 'Backcountry campsite', who: PACK, note: '' },
  { date: '2026-08-16', place: 'Backcountry campsite', who: PACK, note: '' },
  { date: '2026-08-17', place: 'Backcountry campsite', who: PACK, note: '' },
  { date: '2026-08-18', place: 'Backcountry campsite', who: PACK, note: '' },
  { date: '2026-08-19', place: 'Base Camp Anchorage (hostel)', who: PACK, note: 'Back in town.' },
  { date: '2026-08-20', place: 'Base Camp Anchorage (hostel)', who: ALL, note: 'Whole crew together.' },
  { date: '2026-08-21', place: 'Base Camp Anchorage (hostel)', who: ALL, note: '' },
  { date: '2026-08-22', place: 'Moby Dick Hostel, Seward', who: ALL, note: 'Walk to the harbor.' },
  { date: '2026-08-23', place: 'Moby Dick Hostel, Seward', who: ALL, note: '' },
  { date: '2026-08-24', place: 'Soldotna (near the river)', who: ALL, note: 'Early fishing start.' },
  { date: '2026-08-25', place: 'Girdwood', who: ALL, note: 'Close to the spa + airport.' },
];

// ---- Fixed trip costs (always counted; not shown as board cards) ----
// Rental car is day-weighted: Femi & Cynthia are on the whole trip, Jing ~7 days.
// Lodging is a rough per-person hostel estimate (backcountry nights are free).
export const FIXED_COSTS = [
  { id: 'rental-car', name: 'Rental car', emoji: '🚗', who: ALL,
    note: 'split by days each person is on the trip',
    cost: { mode: 'custom', shares: { femi: 523, cynthia: 523, jing: 244 } } },
  { id: 'lodging', name: 'Hostels & lodging', emoji: '🛏️', who: ALL,
    note: 'est. hostel nights — backcountry nights are free',
    cost: { mode: 'custom', shares: { femi: 360, cynthia: 360, jing: 270 } } },
];
export const CONTACTS = [
  { name: 'Wrangell Mountain Air', role: 'Bush plane (Goat Trail / Nizina)', phone: '907-554-4411', url: 'https://www.wrangellmountainair.com' },
  { name: 'Kennicott Shuttle', role: 'Chitina ↔ McCarthy', phone: '907-822-5292', url: 'https://kennicottshuttle.com' },
  { name: 'Major Marine Tours', role: 'Kenai Fjords cruise', phone: '907-274-7300', url: 'https://majormarine.com' },
  { name: 'Phillips Cruises', role: '26 Glacier cruise', phone: '907-276-8023', url: 'https://phillipscruises.com' },
  { name: 'Alaska Railroad', role: 'Spencer Glacier float', phone: '907-265-2494', url: 'https://www.alaskarailroad.com' },
  { name: 'Sunny Cove Sea Kayaking', role: 'Resurrection Bay kayak', phone: '907-224-4426', url: 'https://www.sunnycove.com' },
  { name: 'Chugach Outdoor Center', role: 'Six Mile rafting', phone: '907-277-7238', url: 'https://chugachoutdoorcenter.com' },
  { name: 'Alyeska Nordic Spa', role: 'Girdwood spa', phone: '907-754-2237', url: 'https://anordicspa.com' },
];
