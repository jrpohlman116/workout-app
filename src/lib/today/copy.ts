import type { SessionLimits } from '../readiness/effects';

/** What a state changes about today's session, in plain words. */
export function changesFor(limits: SessionLimits): string[] {
  if (limits.topSetOnly) {
    return [
      'One light top set at about your deload weight',
      'No back-offs or accessories today. An easy run or mobility work is a good swap',
      'Your training max does not change',
    ];
  }
  const lines: string[] = [];
  if (limits.backoffCap != null) lines.push(`Back-offs capped at ${limits.backoffCap} ${limits.backoffCap === 1 ? 'set' : 'sets'}`);
  if (limits.extraAccessories === 'half') lines.push('Accessories cut in half, priority one kept');
  else if (limits.extraAccessories === 0) lines.push('Only the priority accessory');
  else if (typeof limits.extraAccessories === 'number') lines.push(`The priority accessory plus ${limits.extraAccessories} more`);
  lines.push(lines.length ? 'Loads stay the same. Readiness changes volume, never weight' : 'Train as written');
  return lines;
}

