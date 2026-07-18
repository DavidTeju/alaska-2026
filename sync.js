// Cross-device sync client. Talks to the tiny backend on whentofly.app.
// Each person edits their own plan (PUT); everyone can view others' latest (GET).
const API = 'https://whentofly.app/alaska-api';
const KEY = 'ak26-9f3k2p7q'; // write deterrent, not secrecy — trip data is low-sensitivity

export async function fetchPlans() {
  const r = await fetch(API + '/plans', { cache: 'no-store' });
  if (!r.ok) throw new Error('GET /plans ' + r.status);
  return r.json(); // { plans: {id: plan}, updatedAt: {id: ms} }
}

export async function putPlan(person, plan) {
  const r = await fetch(`${API}/plans/${person}?k=${encodeURIComponent(KEY)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(plan),
  });
  if (!r.ok) throw new Error('PUT /plans ' + r.status);
  return r.json(); // { ok, updatedAt }
}
