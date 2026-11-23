import { getDueFilterInterval, isDueDateInInterval, isSameDueFilter } from './due-filter';

// Wednesday, 18 November 2026, mid-afternoon local time.
const NOW = new Date(2026, 10, 18, 15, 30);

const day = (month, date, hours = 12) => new Date(2026, month, date, hours);

const interval = (range, extra) => getDueFilterInterval({ range, ...extra }, NOW);

describe('getDueFilterInterval', () => {
  it('covers the whole of today', () => {
    const { start, end } = interval('today');

    expect(start).toEqual(new Date(2026, 10, 18, 0, 0, 0, 0));
    expect(end).toEqual(new Date(2026, 10, 18, 23, 59, 59, 999));
  });

  it('runs this week from Sunday to Saturday', () => {
    const { start, end } = interval('thisWeek');

    expect(start).toEqual(new Date(2026, 10, 15, 0, 0, 0, 0));
    expect(end).toEqual(new Date(2026, 10, 21, 23, 59, 59, 999));
  });

  it('runs the next 7 days from today, today included', () => {
    const { start, end } = interval('next7Days');

    expect(start).toEqual(new Date(2026, 10, 18, 0, 0, 0, 0));
    expect(end).toEqual(new Date(2026, 10, 24, 23, 59, 59, 999));
  });

  it('runs this month over the calendar month', () => {
    const { start, end } = interval('thisMonth');

    expect(start).toEqual(new Date(2026, 10, 1, 0, 0, 0, 0));
    expect(end).toEqual(new Date(2026, 10, 30, 23, 59, 59, 999));
  });

  it('runs the next 30 days from today, today included', () => {
    const { start, end } = interval('next30Days');

    expect(start).toEqual(new Date(2026, 10, 18, 0, 0, 0, 0));
    expect(end).toEqual(new Date(2026, 11, 17, 23, 59, 59, 999));
  });

  it('covers both ends of a custom range', () => {
    const { start, end } = interval('custom', { from: '2026-11-01', to: '2026-11-03' });

    expect(start).toEqual(new Date(2026, 10, 1, 0, 0, 0, 0));
    expect(end).toEqual(new Date(2026, 10, 3, 23, 59, 59, 999));
  });

  it('has no interval without a due filter or with an incomplete custom range', () => {
    expect(getDueFilterInterval(null, NOW)).toBeNull();
    expect(interval('custom', { from: '2026-11-01' })).toBeNull();
  });
});

describe('isDueDateInInterval', () => {
  const thisWeek = interval('thisWeek');

  it('matches due dates inside the interval, ends included', () => {
    expect(isDueDateInInterval(day(10, 15, 0), thisWeek)).toBe(true);
    expect(isDueDateInInterval(day(10, 21, 23).toISOString(), thisWeek)).toBe(true);
  });

  it('does not match due dates outside it, or cards without one', () => {
    expect(isDueDateInInterval(day(10, 14, 23), thisWeek)).toBe(false);
    expect(isDueDateInInterval(day(10, 22, 0), thisWeek)).toBe(false);
    expect(isDueDateInInterval(null, thisWeek)).toBe(false);
  });
});

describe('isSameDueFilter', () => {
  it('compares range and dates', () => {
    expect(isSameDueFilter(null, null)).toBe(true);
    expect(isSameDueFilter({ range: 'today' }, null)).toBe(false);
    expect(isSameDueFilter({ range: 'today' }, { range: 'today' })).toBe(true);
    expect(
      isSameDueFilter(
        { range: 'custom', from: '2026-11-01', to: '2026-11-02' },
        { range: 'custom', from: '2026-11-01', to: '2026-11-03' },
      ),
    ).toBe(false);
  });
});
