import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { isLegacyPath, parseRoute, routeToPath } from '../../lib/routes';
import { activeSessionFromDraft, formatRest, type DraftSnapshot } from '../../hooks/useActiveSession';
import Navigation from '../../components/layout/Navigation';
import ActiveWorkoutBar from '../../components/layout/ActiveWorkoutBar';
import { nextDayToTrain } from '../../lib/programs/week';
import { getLayout } from '../../lib/programs/registry';

vi.mock('../../lib/supabase', () => ({ supabase: { from: vi.fn() } }));

describe('parseRoute', () => {
  it('reads the four tabs and their sub-pages', () => {
    expect(parseRoute('/')).toEqual({ tab: 'home' });
    expect(parseRoute('/today')).toEqual({ tab: 'today' });
    expect(parseRoute('/today', '?lift=bench')).toEqual({ tab: 'today', lift: 'bench' });
    expect(parseRoute('/progress')).toEqual({ tab: 'progress' });
    expect(parseRoute('/progress/records')).toEqual({ tab: 'progress', sub: 'records' });
    expect(parseRoute('/more')).toEqual({ tab: 'more' });
    expect(parseRoute('/more/program/')).toEqual({ tab: 'more', sub: 'program' });
    expect(parseRoute('/more/profile')).toEqual({ tab: 'more', sub: 'account' });
  });

  it('keeps old links working', () => {
    expect(parseRoute('/workout', '?lift=squat')).toEqual({ tab: 'today', lift: 'squat' });
    expect(parseRoute('/workout')).toEqual({ tab: 'today' });
    expect(parseRoute('/calculator')).toEqual({ tab: 'more', sub: '1rm' });
    expect(parseRoute('/profile')).toEqual({ tab: 'more', sub: 'account' });
    expect(parseRoute('/home')).toEqual({ tab: 'home' });
    expect(parseRoute('/nope')).toEqual({ tab: 'home' });
  });

  it('writes canonical paths and spots old ones', () => {
    expect(routeToPath({ tab: 'today', lift: 'bench' })).toBe('/today?lift=bench');
    expect(routeToPath({ tab: 'more', sub: 'plates' })).toBe('/more/plates');
    expect(routeToPath({ tab: 'home' })).toBe('/');
    expect(isLegacyPath('/workout', '?lift=squat')).toBe(true);
    expect(isLegacyPath('/profile')).toBe(true);
    expect(isLegacyPath('/today', '?lift=squat')).toBe(false);
    expect(isLegacyPath('/')).toBe(false);
    expect(isLegacyPath('/progress/records')).toBe(false);
  });
});

describe('active workout bar content', () => {
  const now = Date.parse('2026-11-27T18:00:00Z');
  const draft = (over: Partial<DraftSnapshot> = {}): DraftSnapshot => ({
    liftType: 'squat',
    mainSets: [{ weight: '205', reps: '3' }, { weight: '185', reps: '3' }, { weight: '185', reps: '3' }],
    setChecks: { main: [true, true, false] },
    topCount: 1,
    cycle: 1, week: 2,
    savedAt: new Date(now - 60_000).toISOString(),
    ...over,
  });

  it('names the next set and its load', () => {
    expect(activeSessionFromDraft(draft(), { now })).toEqual({
      lift: 'squat', title: 'Squat · Back-off set 2', next: 'Next: 185 lb × 3',
    });
    expect(activeSessionFromDraft(draft({ setChecks: { main: [] } }), { now })?.title).toBe('Squat · Top set');
  });

  it('moves to accessories once the main sets are done', () => {
    expect(activeSessionFromDraft(draft({ setChecks: { main: [true, true, true] } }), { now }))
      .toMatchObject({ title: 'Squat · Accessories', next: undefined });
  });

  it('counts down a running rest and drops it when it ends', () => {
    expect(activeSessionFromDraft(draft({ restEndsAt: now + 102_000 }), { now })?.restSeconds).toBe(102);
    expect(activeSessionFromDraft(draft({ restEndsAt: now - 1 }), { now })?.restSeconds).toBeUndefined();
    expect(formatRest(102)).toBe('1:42');
  });

  it('ignores drafts from another week or older than 7 days', () => {
    expect(activeSessionFromDraft(draft(), { now, cycle: 1, week: 3 })).toBeNull();
    expect(activeSessionFromDraft(draft({ savedAt: new Date(now - 8 * 86400000).toISOString() }), { now })).toBeNull();
  });

  it('renders as one button that returns to the workout', async () => {
    const onOpen = vi.fn();
    render(<ActiveWorkoutBar session={{ lift: 'squat', title: 'Squat · Back-off set 2', next: 'Next: 185 lb × 3', restSeconds: 102 }} onOpen={onOpen} />);
    const button = screen.getByRole('button', { name: /Return to your workout\. Squat · Back-off set 2\. Next: 185 lb × 3\. 1:42 rest left/ });
    expect(button).toHaveTextContent('1:42');
    await userEvent.click(button);
    expect(onOpen).toHaveBeenCalled();
  });
});

describe('navigation', () => {
  it('has four tabs and marks the current one', async () => {
    const onNavigate = vi.fn();
    render(<Navigation currentTab="today" onNavigate={onNavigate} />);
    const tabs = screen.getAllByRole('button');
    expect(tabs.map(t => t.getAttribute('aria-label')?.split(' - ')[0])).toEqual(['Home', 'Today', 'Progress', 'More']);
    expect(screen.getByRole('button', { name: /^Today/ })).toHaveAttribute('aria-current', 'page');
    await userEvent.click(screen.getByRole('button', { name: /^More/ }));
    expect(onNavigate).toHaveBeenCalledWith('more');
  });
});

describe('Today picks the day', () => {
  it('is the first day of the week not done yet', () => {
    const layout = getLayout('five_three_one', 3);
    expect(nextDayToTrain(layout, new Set())).toBe('squat');
    expect(nextDayToTrain(layout, new Set(['squat']))).toBe('bench');
    expect(nextDayToTrain(layout, new Set(['squat', 'bench', 'deadlift']))).toBeNull();
  });
});
