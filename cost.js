// Pure cost engine — importable in Node (tests) and the browser.
// Cost philosophy: only trip-specific planned costs are modeled here.
// mode: 'perPerson' (each participant pays full) | 'shared' (split among eligible people)
//       | 'included' | 'free' (both contribute 0)

export function computeShare(personId, activeIds, experiences, people) {
  const active = new Set(activeIds);
  let total = 0;
  for (const e of experiences) {
    if (!active.has(e.id)) continue;
    if (!e.who.includes(personId)) continue;
    const { amount, mode, shares } = e.cost;
    if (mode === 'perPerson') {
      total += amount;
    } else if (mode === 'shared') {
      const sharers = people.filter((p) => e.who.includes(p.id)).length || 1;
      total += amount / sharers;
    } else if (mode === 'custom') {
      total += (shares && shares[personId]) || 0;
    }
  }
  return Math.round(total);
}

// selectionMap: { [variantGroupId]: chosenExperienceId }
// Returns the list of chosen experience ids across all groups.
export function resolveVariants(selectionMap) {
  return Object.values(selectionMap);
}
