import {
  TRIP, PEOPLE, DAYS, EXPERIENCES, VARIANT_GROUPS, EXTRA_ACTIVITIES,
  LODGING, CONTACTS, MAP_CATEGORIES, MAP_POINTS, FIXED_COSTS, dayLabel,
} from './data.js';
import { computeShare } from './cost.js';
import { initMap, refreshMap, flyToPoint } from './map.js';
import { fetchPlans, putPlan } from './sync.js';

const PLANS_KEY = 'alaska-plans-v1';
const ME_KEY = 'alaska-me-v1';

// me = your identity (the plan you edit). person = whose plan you're currently viewing.
let state = { me: null, person: null, view: 'trip', plans: {}, updatedAt: {}, hadLocalMine: false };

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

// The plan currently being viewed, and whether the viewer may edit it.
const curPlan = () => state.plans[state.person];
const isEditable = () => state.person === state.me;
function ensurePlan(pid) { if (!state.plans[pid]) state.plans[pid] = defaultPlan(); }

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

function loadLocal() {
  try {
    const raw = localStorage.getItem(PLANS_KEY);
    if (raw) return JSON.parse(raw) || {};
  } catch (_) {}
  return {};
}
function saveLocal() {
  try { localStorage.setItem(PLANS_KEY, JSON.stringify({ plans: state.plans, updatedAt: state.updatedAt })); } catch (_) {}
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

const activeIds = () => curPlan().items.map((i) => i.id);

// ---------- sync ----------
let pushTimer = null;
function pushMyPlan() {
  saveLocal();
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    putPlan(state.me, state.plans[state.me])
      .then((r) => { if (r && r.updatedAt) { state.updatedAt[state.me] = r.updatedAt; saveLocal(); } })
      .catch(() => {}); // offline — local cache still holds it, retried on next edit
  }, 600);
}

function applyServer(data, initial) {
  if (!data || !data.plans) return false;
  let changed = false;
  PEOPLE.forEach((p) => {
    const sp = data.plans[p.id];
    if (p.id === state.me) {
      // Adopt my server plan only on a fresh device (no local plan yet).
      if (initial && !state.hadLocalMine && sp) { state.plans[p.id] = validatePlan(sp) || defaultPlan(); changed = true; }
    } else if (sp) {
      state.plans[p.id] = validatePlan(sp) || defaultPlan();
      changed = true;
    }
    if (data.updatedAt && data.updatedAt[p.id]) state.updatedAt[p.id] = data.updatedAt[p.id];
  });
  return changed;
}

async function syncNow(initial) {
  try {
    const data = await fetchPlans();
    const changed = applyServer(data, initial);
    saveLocal();
    if (initial && state.hadLocalMine) pushMyPlan(); // publish my local plan to the server
    if (changed && state.person) renderActiveView();
    updateSyncBadge();
  } catch (_) { updateSyncBadge(true); }
}

function startSync() {
  syncNow(true);
  setInterval(() => syncNow(false), 12000);
  window.addEventListener('focus', () => syncNow(false));
}

function timeAgo(ts) {
  if (!ts) return '';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}

// ---------- boot ----------
function boot() {
  const local = loadLocal();
  state.updatedAt = local.updatedAt || {};
  state.hadLocalMine = false;
  PEOPLE.forEach((p) => {
    const v = local.plans && validatePlan(local.plans[p.id]);
    state.plans[p.id] = v || defaultPlan();
  });
  state.me = localStorage.getItem(ME_KEY);
  if (state.me && local.plans && local.plans[state.me]) state.hadLocalMine = true;
  buildLanding();
  buildPersonSeg();
  wireChrome();
  if (state.me && PEOPLE.some((p) => p.id === state.me)) {
    enterApp(state.me);
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
  $('#plain-landing').onclick = openPlain;
}

function enterApp(personId) {
  state.me = personId;
  state.person = personId; // start by viewing your own plan
  localStorage.setItem(ME_KEY, personId);
  $('#landing').classList.add('hidden');
  $('#app').classList.remove('hidden');
  syncPersonSeg();
  renderAll();
  startSync();
}

function buildPersonSeg() {
  const seg = $('#person-seg');
  seg.innerHTML = '';
  PEOPLE.forEach((p) => {
    const b = el('button', '', `${p.emoji}<span>${p.name}</span>`);
    b.dataset.person = p.id;
    b.onclick = () => {
      state.person = p.id;
      syncPersonSeg();
      renderAll();
      if (p.id !== state.me) syncNow(false); // fetch freshest when peeking at someone else
    };
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
    if (!isEditable()) { alert(`You can only edit your own plan. Switch to ${meName()} to make changes.`); return; }
    if (!confirm('Reset your plan to the recommended itinerary?')) return;
    state.plans[state.me] = defaultPlan(); pushMyPlan(); renderAll();
  };
  $('#share-plan').onclick = sharePlan;
  $('#sheet-scrim').onclick = closeSheet;
  $('#plain-btn').onclick = openPlain;
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { closeSheet(); closePlain(); } });
}

const meName = () => (PEOPLE.find((p) => p.id === state.me) || {}).name || 'yourself';

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

// Re-render whatever view is active (used after a background sync updates data).
function renderActiveView() {
  renderTotal();
  if (state.view === 'trip') renderBoard();
  else if (state.view === 'stay') renderStay();
  else if (state.view === 'info') renderInfo();
  else if (state.view === 'plan') renderPlan();
}

function updateSyncBadge(offline) {
  const b = $('#sync-badge');
  if (!b) return;
  if (offline) { b.textContent = '⚠︎ offline'; b.className = 'sync-badge off'; return; }
  b.textContent = '⟳ synced';
  b.className = 'sync-badge';
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
  const item = curPlan().items.find((i) => { const e = getExp(i.id); return e && e.spanDays; });
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
  const editable = isEditable();

  // Identity / viewing context
  if (editable) {
    root.appendChild(el('div', 'sharednote',
      `✏️ Editing <strong>your</strong> plan (${person().emoji} ${person().name}). Everyone builds their own — switch tabs above to see the others' latest.`));
  } else {
    root.appendChild(el('div', 'viewnote',
      `👀 Viewing <strong>${person().emoji} ${person().name}'s</strong> plan (read-only)${state.updatedAt[state.person] ? ` · updated ${timeAgo(state.updatedAt[state.person])}` : ''}. Switch to <strong>${meName()}</strong> to edit yours.`));
  }

  // Jing banner for the backpacking window
  if (!person().legs.includes('wilderness')) {
    root.appendChild(el('div', 'banner',
      `🥾 <strong>Femi &amp; Cynthia are deep in the backcountry</strong> Aug 12–20. ${person().id === state.me ? 'You join' : person().name + ' joins'} the crew in Anchorage on <strong>${person().arrives}</strong>.`));
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

    itemsForDay(d.date).forEach((item) => slot.appendChild(makeCard(item, editable)));

    // Multi-day route continuation chip (read-only)
    if (span && span.coverDates.includes(d.date)) {
      const n = span.coverDates.indexOf(d.date) + 2; // day 2, 3, ...
      slot.appendChild(el('div', 'cont-chip', `${span.exp.emoji} ${span.exp.name} · day ${n}`));
    } else if (editable) {
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
  return curPlan().items.filter((i) => {
    if (i.day !== date) return false;
    const e = getExp(i.id);
    return e && e.who.includes(state.person);
  });
}

function makeCard(item, editable) {
  const e = getExp(item.id);
  const narrative = (e.cost.mode === 'free' && e.category === 'travel') || (e.category === 'rest' && e.cost.amount === 0);
  const card = el('div', 'card' + (narrative ? ' narrative' : ''));
  card.dataset.id = e.id;
  // Only the plan's owner sees edit controls.
  let actions = '';
  if (editable) {
    actions = e.variantGroup
      ? `<button class="icon-btn" data-act="swap" title="Swap">⇄</button>`
      : `<button class="icon-btn" data-act="remove" title="Remove">✕</button>`;
  }
  const handle = editable ? `<span class="drag-handle icon-btn" data-act="drag" title="Drag to reorder">⠿</span>` : '<span class="drag-spacer"></span>';
  card.innerHTML =
    `${handle}
     <span class="c-emoji">${e.emoji}</span>
     <div class="c-body">
       <div class="c-name">${e.name}</div>
       <div class="c-meta">${[e.where, e.duration].filter(Boolean).join(' · ')}</div>
     </div>
     <div class="c-actions">${actions}</div>`;
  card.addEventListener('click', (ev) => {
    const act = ev.target.closest('[data-act]')?.dataset.act;
    if (act === 'remove') { removeItem(e.id); ev.stopPropagation(); return; }
    if (act === 'swap') { openSwap(e.variantGroup); ev.stopPropagation(); return; }
    if (act === 'drag') return;
    openDetail(e.id);
  });
  if (editable) attachDrag(card, e.id);
  return card;
}

function removeItem(id) {
  if (!isEditable()) return;
  const e = getExp(id);
  curPlan().items = curPlan().items.filter((i) => i.id !== id);
  if (e && e.variantGroup) delete curPlan().variants[e.variantGroup];
  pushMyPlan(); renderBoard(); closeSheet();
}

function addItem(id, day) {
  if (!isEditable()) return;
  if (curPlan().items.some((i) => i.id === id)) return;
  const e = getExp(id);
  // Pick a valid day for this experience's leg (fall back to first eligible visible day).
  let target = day && allowedOnDay(e, day) ? day
    : (e.defaultDay && allowedOnDay(e, e.defaultDay) ? e.defaultDay : null);
  if (!target) {
    const vd = visibleDays().find((d) => allowedOnDay(e, d.date));
    if (!vd) return; // no valid day for this person — shouldn't happen
    target = vd.date;
  }
  state.plans[state.me].items.push({ id, day: target });
  pushMyPlan(); renderBoard();
}

function swapVariant(groupId, newId) {
  if (!isEditable()) return;
  const g = VARIANT_GROUPS.find((x) => x.id === groupId);
  const p = curPlan();
  const current = p.items.find((i) => g.options.includes(i.id));
  const day = current ? current.day : getExp(newId).defaultDay || visibleDays()[0].date;
  p.items = p.items.filter((i) => !g.options.includes(i.id));
  p.items.push({ id: newId, day });
  p.variants[groupId] = newId;
  pushMyPlan(); renderBoard(); closeSheet();
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

  const items = curPlan().items;
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
  pushMyPlan(); renderBoard();
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
  const inPlan = curPlan().items.some((i) => i.id === id);
  const link = e.sourceUrl ? `<a class="s-link" href="${e.sourceUrl}" target="_blank" rel="noopener">More info ↗</a>` : '';
  let actions = '';
  if (isEditable()) {
    if (inPlan && e.variantGroup) actions = `<button class="btn sec" data-x="swap">Swap this choice</button>`;
    else if (inPlan) actions = `<button class="btn danger" data-x="remove">Remove from plan</button>`;
    else actions = `<button class="btn primary" data-x="add">Add to my plan</button>`;
  }
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
  if (!isEditable()) return;
  const g = VARIANT_GROUPS.find((x) => x.id === groupId);
  const chosen = curPlan().variants[groupId];
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
  html += `<div class="r-total"><span>${isEditable() ? 'Your' : person().name + '’s'} share</span><span>${money(total)}</span></div>
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

// ---------- share (the app link — plans sync automatically) ----------
function sharePlan() {
  const url = location.origin + location.pathname;
  navigator.clipboard?.writeText(url).then(
    () => toast('App link copied — send it to the crew! 🔗'),
    () => prompt('Copy the app link:', url)
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

// ---------- plain view ("Fuck you Femi, I hate technology") ----------
function openPlain() {
  renderPlain();
  $('#plain').classList.remove('hidden');
}
function closePlain() {
  $('#plain').classList.add('hidden');
}
function renderPlain() {
  const rec = defaultPlan(); // the recommended full itinerary, all three, both legs
  const byId = (id) => getExp(id);
  let h = `<div class="plain-inner">
    <div class="plain-topbar"><button id="plain-back" class="plain-back">← back</button></div>
    <h1>Alaska — the plan</h1>
    <p class="plain-sub">${TRIP.dates} · Femi, Cynthia & Jing</p>
    <h2>Itinerary</h2>`;
  DAYS.forEach((d) => {
    const items = rec.items.filter((i) => i.day === d.date);
    h += `<div class="plain-day"><b>${dayLabel(d.date)}</b> <span class="plain-leg">${d.leg === 'wilderness' ? '· backcountry (Femi & Cynthia)' : '· water leg (all three)'}</span>`;
    if (items.length) {
      h += '<ul>' + items.map((i) => { const e = byId(i.id); return `<li>${e.emoji} ${e.name}${e.where ? ` — <span class="plain-muted">${e.where}</span>` : ''}</li>`; }).join('') + '</ul>';
    } else {
      const span = (() => { const it = rec.items.find((x) => byId(x.id)?.spanDays); if (!it) return null; const e = byId(it.id); const wild = DAYS.filter((x) => x.leg === 'wilderness').map((x) => x.date); const s = wild.indexOf(it.day); return s >= 0 && wild.slice(s + 1, s + e.spanDays).includes(d.date) ? e : null; })();
      h += span ? `<ul><li class="plain-muted">${span.emoji} ${span.name} (continued)</li></ul>` : '<ul><li class="plain-muted">open / rest</li></ul>';
    }
    h += '</div>';
  });

  // All options grouped
  h += '<h2>All options</h2><p class="plain-sub">Swap or add any of these in the app.</p>';
  const groups = [
    ['Wilderness routes', VARIANT_GROUPS.find((g) => g.id === 'wilderness-route').options],
    ['Glacier cruises', VARIANT_GROUPS.find((g) => g.id === 'cruise').options],
    ['Big activity day', VARIANT_GROUPS.find((g) => g.id === 'fifth-day').options],
  ];
  groups.forEach(([label, ids]) => {
    h += `<h3>${label}</h3><ul>` + ids.map((id) => optLine(byId(id))).join('') + '</ul>';
  });
  const addons = EXPERIENCES.filter((e) => !e.fixed && !e.variantGroup && e.defaultDay);
  h += `<h3>Add-ons in the plan</h3><ul>` + addons.map(optLine).join('') + '</ul>';
  const extrasByCat = {};
  EXTRA_ACTIVITIES.forEach((e) => { (extrasByCat[e.category] ||= []).push(e); });
  Object.keys(extrasByCat).sort().forEach((cat) => {
    h += `<h3>More: ${cat}</h3><ul>` + extrasByCat[cat].map(optLine).join('') + '</ul>';
  });
  h += `<p class="plain-sub" style="margin-top:24px">Costs are per person. Planned trip costs only — no flights, food, gas, or gear.</p></div>`;
  $('#plain').innerHTML = h;
  $('#plain-back').onclick = closePlain;
}
function optLine(e) {
  if (!e) return '';
  const share = perItemShareFor(e, 'femi');
  const cost = e.cost.mode === 'free' || share === 0 ? 'free/included' : '$' + Math.round(share) + (e.cost.mode === 'shared' ? ' (split)' : '/person');
  return `<li>${e.emoji} <b>${e.name}</b> — ${e.where || ''} · <span class="plain-muted">${cost}</span><br><span class="plain-muted">${e.blurb || ''}</span></li>`;
}
// Cost for a specific person (plain view is person-agnostic; use a representative payer).
function perItemShareFor(e, pid) {
  const { amount, mode, shares } = e.cost;
  if (mode === 'perPerson') return amount;
  if (mode === 'shared') { const s = PEOPLE.filter((p) => e.who.includes(p.id)).length || 1; return amount / s; }
  if (mode === 'custom') return (shares && shares[pid]) || 0;
  return 0;
}

boot();
