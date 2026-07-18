import {
  TRIP, PEOPLE, DAYS, EXPERIENCES, VARIANT_GROUPS, EXTRA_ACTIVITIES,
  LODGING, CONTACTS, MAP_CATEGORIES, MAP_POINTS, FIXED_COSTS, dayLabel,
} from './data.js';
import { computeShare } from './cost.js';
import { initMap, refreshMap, flyToPoint } from './map.js';

const PLAN_KEY = 'alaska-plan-v1';
const PERSON_KEY = 'alaska-person-v1';

let state = { person: null, plan: null, view: 'trip' };

// ---------- helpers ----------
const $ = (sel, root = document) => root.querySelector(sel);
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};
const allExps = () => EXPERIENCES.concat(EXTRA_ACTIVITIES);
const getExp = (id) => allExps().find((e) => e.id === id);
const allCostables = () => allExps().concat(FIXED_COSTS);
const person = () => PEOPLE.find((p) => p.id === state.person);
const money = (n) => '$' + Math.round(n).toLocaleString();
const dayObj = (date) => DAYS.find((d) => d.date === date);

// Which trip leg(s) an experience can be scheduled in.
function legsFor(e) {
  if (e.category === 'wilderness') return ['wilderness'];
  if (e.category === 'travel') return ['wilderness', 'water'];
  return ['water']; // activities, water, rest, etc. belong to the post-backpacking leg
}
const allowedOnDay = (e, date) => legsFor(e).includes(dayObj(date)?.leg);

// Cost inputs = board items + always-on fixed costs (car, lodging).
function costTotal(personId) {
  const ids = activeIds().concat(FIXED_COSTS.map((f) => f.id));
  return computeShare(personId, ids, allCostables(), PEOPLE);
}

// eligible days for the current person (Jing only sees water leg)
function visibleDays() {
  const legs = person().legs;
  return DAYS.filter((d) => legs.includes(d.leg));
}

// ---------- plan state ----------
function defaultPlan() {
  const items = [];
  const variants = {};
  VARIANT_GROUPS.forEach((g) => { variants[g.id] = g.default; });
  EXPERIENCES.forEach((e) => {
    if (e.defaultDay == null) return;
    if (e.variantGroup) {
      if (variants[e.variantGroup] !== e.id) return; // only the chosen option
    }
    items.push({ id: e.id, day: e.defaultDay });
  });
  return { items, variants };
}

function loadPlan() {
  try {
    const raw = localStorage.getItem(PLAN_KEY);
    if (raw) return validatePlan(JSON.parse(raw)) || defaultPlan();
  } catch (_) {}
  return defaultPlan();
}
function savePlan() {
  try { localStorage.setItem(PLAN_KEY, JSON.stringify(state.plan)); } catch (_) {}
}

// Keep only known experiences on valid days; ensure variant selections resolve.
function validatePlan(p) {
  if (!p || !Array.isArray(p.items)) return null;
  const items = p.items.filter((i) => i && getExp(i.id) && DAYS.some((d) => d.date === i.day));
  const variants = {};
  VARIANT_GROUPS.forEach((g) => {
    const chosen = items.find((i) => g.options.includes(i.id));
    variants[g.id] = chosen ? chosen.id : (p.variants && g.options.includes(p.variants[g.id]) ? p.variants[g.id] : g.default);
  });
  return { items, variants };
}

// If a share link is present, offer to import it (never silently overwrite).
function maybeImportFromHash() {
  if (location.hash.length <= 3) return;
  try {
    const decoded = JSON.parse(decodeURIComponent(escape(atob(location.hash.slice(1)))));
    const clean = validatePlan(decoded.plan);
    if (clean && confirm('Open the shared plan someone sent you? This replaces your current plan on this device.')) {
      state.plan = clean;
      savePlan();
    }
  } catch (_) { /* ignore bad hash */ }
  history.replaceState(null, '', location.pathname); // clear hash either way
}

const activeIds = () => state.plan.items.map((i) => i.id);

// ---------- boot ----------
function boot() {
  state.plan = loadPlan();
  maybeImportFromHash();
  const savedPerson = localStorage.getItem(PERSON_KEY);
  buildLanding();
  buildPersonSeg();
  wireChrome();
  if (savedPerson && PEOPLE.some((p) => p.id === savedPerson)) {
    enterApp(savedPerson);
  }
}

function buildLanding() {
  const wrap = $('#landing-people');
  wrap.innerHTML = '';
  PEOPLE.forEach((p) => {
    const legTxt = p.legs.length === 2 ? 'Whole trip' : `Water leg · arrives ${p.arrives}`;
    const b = el('button', 'landing-person',
      `<span class="lp-emoji">${p.emoji}</span>
       <span><span class="lp-name">${p.name}</span><br><span class="lp-legs">${legTxt}</span></span>`);
    b.onclick = () => enterApp(p.id);
    wrap.appendChild(b);
  });
}

function enterApp(personId) {
  state.person = personId;
  localStorage.setItem(PERSON_KEY, personId);
  $('#landing').classList.add('hidden');
  $('#app').classList.remove('hidden');
  syncPersonSeg();
  renderAll();
}

function buildPersonSeg() {
  const seg = $('#person-seg');
  seg.innerHTML = '';
  PEOPLE.forEach((p) => {
    const b = el('button', '', `${p.emoji}<span>${p.name}</span>`);
    b.dataset.person = p.id;
    b.onclick = () => { state.person = p.id; localStorage.setItem(PERSON_KEY, p.id); syncPersonSeg(); renderAll(); };
    seg.appendChild(b);
  });
}
function syncPersonSeg() {
  $('#person-seg').querySelectorAll('button').forEach((b) =>
    b.classList.toggle('active', b.dataset.person === state.person));
}

function wireChrome() {
  $('#brand').onclick = () => { $('#app').classList.add('hidden'); $('#landing').classList.remove('hidden'); };
  $('#tabs').querySelectorAll('.tab').forEach((t) => {
    t.onclick = () => switchView(t.dataset.view);
  });
  $('#total-bar').onclick = toggleBreakdown;
  $('#reset-plan').onclick = () => {
    if (!confirm('Reset to the recommended plan? This clears everyone’s edits on this device.')) return;
    state.plan = defaultPlan(); savePlan(); renderAll();
  };
  $('#share-plan').onclick = sharePlan;
  $('#sheet-scrim').onclick = closeSheet;
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') closeSheet(); });
}

// ---------- views ----------
function switchView(view) {
  state.view = view;
  $('#tabs').querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.view === view));
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  $('#view-' + view).classList.add('active');
  if (view === 'map') { initMap(); refreshMap(); }
  if (view === 'stay') renderStay();
  if (view === 'info') renderInfo();
  if (view === 'plan') renderPlan();
}

function renderAll() {
  renderTotal();
  renderBoard();
  if (state.view === 'stay') renderStay();
  if (state.view === 'info') renderInfo();
  if (state.view === 'plan') renderPlan();
  if (state.view === 'map') { initMap(); renderMapList(); refreshMap(); }
  else renderMapList();
}

// ---------- total + breakdown ----------
function renderTotal() {
  $('#total-amt').textContent = money(costTotal(state.person));
}

function perItemShare(e) {
  const { amount, mode, shares } = e.cost;
  if (mode === 'perPerson') return amount;
  if (mode === 'shared') {
    const sharers = PEOPLE.filter((p) => e.who.includes(p.id)).length || 1;
    return amount / sharers;
  }
  if (mode === 'custom') return (shares && shares[state.person]) || 0;
  return 0;
}

function toggleBreakdown() {
  const bd = $('#breakdown');
  const open = bd.classList.contains('hidden');
  $('#total-bar').setAttribute('aria-expanded', String(open));
  if (!open) { bd.classList.add('hidden'); return; }
  bd.innerHTML = '';
  const activeSet = new Set(activeIds());
  const rows = allCostables()
    .filter((e) => (activeSet.has(e.id) || FIXED_COSTS.includes(e)) && e.who.includes(state.person) && perItemShare(e) > 0);
  if (!rows.length) {
    bd.appendChild(el('div', 'bd-note', 'No paid items in your plan yet — add some from the Trip tab.'));
  }
  rows.forEach((e) => {
    const share = perItemShare(e);
    let note = '';
    if (e.cost.mode === 'shared') note = ` <span style="color:var(--muted);font-size:12px">(split ${PEOPLE.filter((p) => e.who.includes(p.id)).length})</span>`;
    else if (e.note) note = ` <span style="color:var(--muted);font-size:12px">(${e.note})</span>`;
    const row = el('div', 'bd-row',
      `<span class="bd-name">${e.emoji} ${e.name}${note}</span><span class="bd-amt">${money(share)}</span>`);
    bd.appendChild(row);
  });
  bd.appendChild(el('div', 'bd-row', `<span class="bd-name">Total</span><span class="bd-amt">${money(costTotal(state.person))}</span>`));
  bd.appendChild(el('div', 'bd-note', 'Planned trip costs only — no flights, food, gas, or gear.'));
  bd.classList.remove('hidden');
}

// ---------- board ----------
function activeRouteSpan() {
  const item = state.plan.items.find((i) => { const e = getExp(i.id); return e && e.spanDays; });
  if (!item) return null;
  const e = getExp(item.id);
  const wild = DAYS.filter((d) => d.leg === 'wilderness').map((d) => d.date);
  const start = wild.indexOf(item.day);
  if (start < 0) return null;
  const coverDates = wild.slice(start + 1, start + e.spanDays); // days after the start card
  return { exp: e, startDay: item.day, coverDates };
}

function renderBoard() {
  const root = $('#view-trip');
  root.innerHTML = '';

  // Shared-plan context so edits/costs aren't mistaken for private
  root.appendChild(el('div', 'sharednote',
    `👥 Shared trip plan · viewing as <strong>${person().emoji} ${person().name}</strong>. Edits are shared with the crew.`));

  // Jing banner for the backpacking window
  if (!person().legs.includes('wilderness')) {
    root.appendChild(el('div', 'banner',
      `🥾 <strong>Femi &amp; Cynthia are deep in the backcountry</strong> Aug 12–20. You join the crew in Anchorage on <strong>${person().arrives}</strong> — here's everything from there.`));
  }

  const span = person().legs.includes('wilderness') ? activeRouteSpan() : null;
  const board = el('div', 'board');
  visibleDays().forEach((d) => {
    const dayEl = el('div', 'day');
    dayEl.dataset.date = d.date;
    dayEl.appendChild(el('div', 'day-head',
      `<span class="day-date">${dayLabel(d.date)}</span><span class="day-tag">${d.leg === 'wilderness' ? 'backcountry' : 'water leg'}</span>`));
    const slot = el('div', 'slot');
    slot.dataset.date = d.date;

    itemsForDay(d.date).forEach((item) => slot.appendChild(makeCard(item)));

    // Multi-day route continuation chip (read-only)
    if (span && span.coverDates.includes(d.date)) {
      const n = span.coverDates.indexOf(d.date) + 2; // day 2, 3, ...
      slot.appendChild(el('div', 'cont-chip', `${span.exp.emoji} ${span.exp.name} · day ${n}`));
    } else {
      const add = el('button', 'add-slot', '＋ add experience');
      add.onclick = () => openAddDrawer(d.date);
      slot.appendChild(add);
    }
    dayEl.appendChild(slot);
    board.appendChild(dayEl);
  });
  root.appendChild(board);
  renderTotal();
}

function itemsForDay(date) {
  return state.plan.items.filter((i) => {
    if (i.day !== date) return false;
    const e = getExp(i.id);
    return e && e.who.includes(state.person);
  });
}

function makeCard(item) {
  const e = getExp(item.id);
  const narrative = (e.cost.mode === 'free' && e.category === 'travel') || (e.category === 'rest' && e.cost.amount === 0);
  const card = el('div', 'card' + (narrative ? ' narrative' : ''));
  card.dataset.id = e.id;
  // Variant cards are swap-only (removing one would strand the whole choice).
  const actions = e.variantGroup
    ? `<button class="icon-btn" data-act="swap" title="Swap">⇄</button>`
    : `<button class="icon-btn" data-act="remove" title="Remove">✕</button>`;
  card.innerHTML =
    `<span class="drag-handle icon-btn" data-act="drag" title="Drag to reorder">⠿</span>
     <span class="c-emoji">${e.emoji}</span>
     <div class="c-body">
       <div class="c-name">${e.name}</div>
       <div class="c-meta">${[e.where, e.duration].filter(Boolean).join(' · ')}</div>
     </div>
     <div class="c-actions">${actions}</div>`;
  // interactions
  card.addEventListener('click', (ev) => {
    const act = ev.target.closest('[data-act]')?.dataset.act;
    if (act === 'remove') { removeItem(e.id); ev.stopPropagation(); return; }
    if (act === 'swap') { openSwap(e.variantGroup); ev.stopPropagation(); return; }
    if (act === 'drag') return;
    openDetail(e.id);
  });
  attachDrag(card, e.id);
  return card;
}

function removeItem(id) {
  const e = getExp(id);
  state.plan.items = state.plan.items.filter((i) => i.id !== id);
  if (e && e.variantGroup) delete state.plan.variants[e.variantGroup];
  savePlan(); renderBoard(); closeSheet();
}

function addItem(id, day) {
  if (state.plan.items.some((i) => i.id === id)) return;
  const e = getExp(id);
  // Pick a valid day for this experience's leg (fall back to first eligible visible day).
  let target = day && allowedOnDay(e, day) ? day
    : (e.defaultDay && allowedOnDay(e, e.defaultDay) ? e.defaultDay : null);
  if (!target) {
    const vd = visibleDays().find((d) => allowedOnDay(e, d.date));
    if (!vd) return; // no valid day for this person — shouldn't happen
    target = vd.date;
  }
  state.plan.items.push({ id, day: target });
  savePlan(); renderBoard();
}

function swapVariant(groupId, newId) {
  const g = VARIANT_GROUPS.find((x) => x.id === groupId);
  const current = state.plan.items.find((i) => g.options.includes(i.id));
  const day = current ? current.day : getExp(newId).defaultDay || visibleDays()[0].date;
  state.plan.items = state.plan.items.filter((i) => !g.options.includes(i.id));
  state.plan.items.push({ id: newId, day });
  state.plan.variants[groupId] = newId;
  savePlan(); renderBoard(); closeSheet();
}

// ---------- drag & drop (pointer-based, works on touch + mouse) ----------
let drag = null;
function attachDrag(card, id) {
  const handle = card.querySelector('[data-act="drag"]');
  handle.addEventListener('pointerdown', (ev) => {
    ev.preventDefault();
    drag = { id, card };
    card.classList.add('dragging');
    document.addEventListener('pointermove', onDragMove);
    document.addEventListener('pointerup', onDragEnd, { once: true });
  });
}
function onDragMove(ev) {
  document.querySelectorAll('.card.drop-target').forEach((c) => c.classList.remove('drop-target'));
  const target = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.card, .slot');
  if (target && target.classList.contains('card') && target !== drag.card) target.classList.add('drop-target');
}
function onDragEnd(ev) {
  document.removeEventListener('pointermove', onDragMove);
  if (!drag) return;
  drag.card.classList.remove('dragging');
  const overCard = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.card');
  const overSlot = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.slot');
  document.querySelectorAll('.card.drop-target').forEach((c) => c.classList.remove('drop-target'));

  // No-op drop (released on itself or nowhere): leave order untouched.
  if (!overSlot || (overCard && overCard.dataset.id === drag.id) || (!overCard && !overSlot)) {
    drag = null; return;
  }

  const moved = getExp(drag.id);
  const targetDay = (overCard ? overCard.closest('.slot') : overSlot).dataset.date;
  // Don't allow dropping onto an incompatible leg (e.g., a water activity on a backcountry day).
  if (!allowedOnDay(moved, targetDay)) { drag = null; return; }

  const items = state.plan.items;
  const from = items.findIndex((i) => i.id === drag.id);
  if (from < 0) { drag = null; return; }
  const item = items.splice(from, 1)[0];
  item.day = targetDay;

  if (overCard && overCard.dataset.id !== drag.id) {
    const rect = overCard.getBoundingClientRect();
    const after = ev.clientY > rect.top + rect.height / 2;
    const ti = items.findIndex((i) => i.id === overCard.dataset.id);
    items.splice(after ? ti + 1 : ti, 0, item);
  } else {
    items.push(item);
  }
  drag = null;
  savePlan(); renderBoard();
}

// ---------- bottom sheet ----------
function openSheet(html) {
  const s = $('#sheet');
  s.innerHTML = `<div class="sheet-grip"></div><button class="sheet-close" aria-label="Close">✕</button>` + html;
  s.querySelector('.sheet-close').onclick = closeSheet;
  s.classList.remove('hidden');
  $('#sheet-scrim').classList.remove('hidden');
  return s;
}
function closeSheet() {
  $('#sheet').classList.add('hidden');
  $('#sheet-scrim').classList.add('hidden');
}

function costPill(e) {
  const share = perItemShare(e);
  if (share <= 0) return `<span class="s-cost free">Included</span>`;
  const note = e.cost.mode === 'shared' ? ` · your share` : ' each';
  return `<span class="s-cost">💰 ${money(share)}${note}</span>`;
}

function openDetail(id) {
  const e = getExp(id);
  const hero = `<img class="sheet-hero" src="img/${e.id}.jpg" alt="${e.name}" onerror="this.style.display='none'">`;
  const inPlan = state.plan.items.some((i) => i.id === id);
  const link = e.sourceUrl ? `<a class="s-link" href="${e.sourceUrl}" target="_blank" rel="noopener">More info ↗</a>` : '';
  let actions;
  if (inPlan && e.variantGroup) actions = `<button class="btn sec" data-x="swap">Swap this choice</button>`;
  else if (inPlan) actions = `<button class="btn danger" data-x="remove">Remove from plan</button>`;
  else actions = `<button class="btn primary" data-x="add">Add to my plan</button>`;
  const s = openSheet(
    `${hero}
     <h3>${e.emoji} ${e.name}</h3>
     <div class="s-meta">${[e.where, e.duration].filter(Boolean).join(' · ')}</div>
     <div>${costPill(e)}</div>
     <p class="s-blurb">${e.blurb || ''}</p>
     ${link}
     <div class="sheet-actions">${actions}</div>`);
  s.querySelector('[data-x]')?.addEventListener('click', (ev) => {
    const x = ev.target.dataset.x;
    if (x === 'remove') removeItem(id);
    else if (x === 'swap') openSwap(e.variantGroup);
    else { addItem(id); closeSheet(); }
  });
}

function openSwap(groupId) {
  const g = VARIANT_GROUPS.find((x) => x.id === groupId);
  const chosen = state.plan.variants[groupId];
  let html = `<h3>Choose your ${g.label.toLowerCase()}</h3><div class="s-meta">Pick one — swaps update your plan &amp; total.</div><div style="margin-top:14px">`;
  g.options.forEach((oid) => {
    const e = getExp(oid);
    const share = perItemShare(e);
    const costTxt = share > 0 ? money(share) + (e.cost.mode === 'shared' ? ' /you' : ' each') : 'Included';
    html += `<div class="opt ${oid === chosen ? 'selected' : ''}" data-opt="${oid}">
      <span class="o-emoji">${e.emoji}</span>
      <div class="o-body"><div class="o-name">${e.name}</div><div class="o-meta">${e.where} · ${costTxt}</div></div>
      ${oid === chosen ? '<span style="color:var(--accent-ink);font-weight:800">✓</span>' : '<span class="o-add">＋</span>'}
    </div>`;
  });
  html += `</div>`;
  const s = openSheet(html);
  s.querySelectorAll('[data-opt]').forEach((n) => n.onclick = () => swapVariant(groupId, n.dataset.opt));
}

function openAddDrawer(day) {
  const inPlan = new Set(activeIds());
  const eligible = allExps().filter((e) =>
    e.who.includes(state.person) &&
    !inPlan.has(e.id) &&
    !e.fixed &&                              // narrative cards not addable
    !e.variantGroup &&                       // variants handled via swap
    allowedOnDay(e, day)                     // only experiences that fit this day's leg
  );
  // group by category
  const cats = {};
  eligible.forEach((e) => { (cats[e.category] ||= []).push(e); });
  let html = `<h3>Add to ${dayLabel(day)}</h3><div class="s-meta">Tap to drop an experience into your day.</div>`;
  const order = ['water', 'activity', 'wilderness', 'climbing', 'wildlife', 'biking', 'town', 'wildcard', 'rest'];
  Object.keys(cats).sort((a, b) => order.indexOf(a) - order.indexOf(b)).forEach((cat) => {
    html += `<div class="opt-group-label">${MAP_CATEGORIES[cat] || '✨'} ${cat}</div>`;
    cats[cat].forEach((e) => {
      const share = perItemShare(e);
      const costTxt = share > 0 ? money(share) : '';
      html += `<div class="opt" data-add="${e.id}">
        <span class="o-emoji">${e.emoji}</span>
        <div class="o-body"><div class="o-name">${e.name}</div><div class="o-meta">${[e.where, costTxt].filter(Boolean).join(' · ')}</div></div>
        <span class="o-add">＋</span></div>`;
    });
  });
  if (!eligible.length) html += `<p class="s-meta" style="margin-top:16px">Everything's already in your plan. 🎉</p>`;
  const s = openSheet(html);
  s.querySelectorAll('[data-add]').forEach((n) => n.onclick = () => {
    addItem(n.dataset.add, day); closeSheet();
  });
}

// ---------- stay / info / plan / map list ----------
function renderStay() {
  const root = $('#view-stay');
  root.innerHTML = '';
  const nights = LODGING.filter((l) => l.who.includes(state.person));
  if (!nights.length) { root.appendChild(el('p', 'banner', 'No lodging on your dates yet.')); return; }
  nights.forEach((l) => {
    root.appendChild(el('div', 'list-card',
      `<div class="lc-top"><span class="lc-date">${dayLabel(l.date)}</span></div>
       <div class="lc-place">🛏 ${l.place}</div>${l.note ? `<div class="lc-note">${l.note}</div>` : ''}`));
  });
}

function renderInfo() {
  const root = $('#view-info');
  root.innerHTML = '<div class="banner">Everyone you might need to reach on the trip.</div>';
  CONTACTS.forEach((c) => {
    root.appendChild(el('div', 'list-card',
      `<div class="lc-place">${c.name}</div>
       <div class="lc-role">${c.role}</div>
       <div style="margin-top:6px;display:flex;gap:16px">
         <a href="tel:${c.phone.replace(/[^0-9]/g, '')}">📞 ${c.phone}</a>
         <a href="${c.url}" target="_blank" rel="noopener">🌐 Website ↗</a>
       </div>`));
  });
}

function renderPlan() {
  const root = $('#view-plan');
  const total = costTotal(state.person);
  let html = `<div class="report"><h2>${person().emoji} ${person().name}'s Alaska</h2>
    <p class="r-sub">${TRIP.dates}</p>`;
  visibleDays().forEach((d) => {
    const items = itemsForDay(d.date);
    if (!items.length) return;
    html += `<div class="r-day"><div class="r-date">${dayLabel(d.date)}</div>`;
    items.forEach((i) => {
      const e = getExp(i.id);
      html += `<div class="r-exp"><span>${e.emoji}</span><span><span class="re-name">${e.name}</span> <span class="re-where">${e.where || ''}</span></span></div>`;
    });
    html += `</div>`;
  });
  html += `<div class="r-total"><span>Your share</span><span>${money(total)}</span></div>
    <p class="r-sub" style="margin-top:10px;font-size:12px">Covers planned trip costs only (transport, lodging, activities) — not flights, food, or gear.</p></div>`;
  root.innerHTML = html;
}

function renderMapList() {
  const root = $('#map-list');
  if (!root) return;
  root.innerHTML = '';
  MAP_POINTS.forEach((p) => {
    const item = el('button', 'map-item',
      `<span class="mi-emoji">${MAP_CATEGORIES[p.cat] || '📍'}</span>
       <span><span class="mi-name">${p.name}</span><br><span class="mi-blurb">${p.blurb}</span></span>`);
    item.onclick = () => { switchView('map'); flyToPoint(p.id); };
    root.appendChild(item);
  });
}

// ---------- share ----------
function sharePlan() {
  const payload = { plan: state.plan }; // share the plan only, not the sender's person lens
  const hash = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  const url = location.origin + location.pathname + '#' + hash;
  navigator.clipboard?.writeText(url).then(
    () => toast('Link copied — send it to the crew! 🔗'),
    () => prompt('Copy your plan link:', url)
  );
}
function toast(msg) {
  const t = el('div', '', msg);
  Object.assign(t.style, {
    position: 'fixed', bottom: 'calc(90px + env(safe-area-inset-bottom,0px))', left: '50%',
    transform: 'translateX(-50%)', background: '#1a2430', color: '#fff', padding: '12px 18px',
    borderRadius: '999px', fontSize: '14px', fontWeight: '600', zIndex: 99, boxShadow: 'var(--shadow)',
  });
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

boot();
