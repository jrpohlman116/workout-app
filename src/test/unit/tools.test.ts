import { describe, it, expect } from 'vitest';
import { meetAttempts, percentageChart } from '../../lib/tools';

describe('percentage chart', () => {
  it('goes from 50% to 100% in 5% steps, rounded to the plates', () => {
    const rows = percentageChart(147.5, 'bench', 'lb', [45, 25, 10, 5, 2.5]);
    expect(rows).toHaveLength(11);
    expect(rows[0]).toEqual({ pct: 50, weight: 75 });
    expect(rows[7]).toEqual({ pct: 85, weight: 125 });
    expect(rows[10]).toEqual({ pct: 100, weight: 150 }); // 147.5 on a 5 lb step rounds half up
    expect(percentageChart(147.5, 'bench', 'lb', [45, 1.25])[10].weight).toBe(147.5);
  });
});

describe('meet attempts', () => {
  it('opens at about 90% (rounded down), then 95% and 100%', () => {
    expect(meetAttempts(265, 'squat', 'lb').map(a => [a.label, a.weight])).toEqual([
      ['Opener', 235], ['Second', 250], ['Third', 265],
    ]);
    expect(meetAttempts(120, 'bench', 'kg').map(a => a.weight)).toEqual([107.5, 113.75, 120]);
  });
});
