const { expect } = require('chai');

const { isTimeZone, normalizeRule, getNextRunAt } = require('../../utils/recurrence');

describe('recurrence', () => {
  describe('#isTimeZone(value)', () => {
    it('accepts IANA time zones', () => {
      expect(isTimeZone('Europe/Berlin')).to.equal(true);
      expect(isTimeZone('Asia/Dhaka')).to.equal(true);
      expect(isTimeZone('UTC')).to.equal(true);
    });

    it('rejects anything else', () => {
      expect(isTimeZone('Mars/Base')).to.equal(false);
      expect(isTimeZone('')).to.equal(false);
      expect(isTimeZone(5)).to.equal(false);
    });
  });

  describe('#normalizeRule(rule)', () => {
    it('spells out the time of day and drops the RRULE: prefix', () => {
      expect(normalizeRule('RRULE:FREQ=DAILY')).to.equal(
        'FREQ=DAILY;BYHOUR=0;BYMINUTE=0;BYSECOND=0',
      );

      expect(normalizeRule('FREQ=WEEKLY;BYDAY=MO,WE;BYHOUR=9;BYMINUTE=30')).to.equal(
        'FREQ=WEEKLY;BYDAY=MO,WE;BYHOUR=9;BYMINUTE=30;BYSECOND=0',
      );
    });

    it('accepts month ends, intervals, counts and end dates', () => {
      expect(normalizeRule('FREQ=MONTHLY;BYMONTHDAY=31,-1;BYSETPOS=1;BYHOUR=9')).to.be.a('string');
      expect(normalizeRule('FREQ=DAILY;INTERVAL=2;COUNT=3')).to.be.a('string');
      expect(normalizeRule('FREQ=DAILY;UNTIL=20261231T000000Z')).to.be.a('string');
      expect(normalizeRule('FREQ=YEARLY;BYMONTH=3;BYMONTHDAY=1')).to.be.a('string');
    });

    [
      'FREQ=HOURLY',
      'FREQ=MINUTELY',
      'FREQ=DAILY;BYHOUR=9,17',
      'FREQ=DAILY;BYMINUTE=0,30',
      'FREQ=DAILY;BYSECOND=5',
      'FREQ=MONTHLY;BYMONTHDAY=40',
      'FREQ=YEARLY;BYMONTH=13',
      'FREQ=WEEKLY;BYDAY=XX',
      'FREQ=DAILY;FOO=1',
      'FREQ=DAILY;INTERVAL=0',
      'BYDAY=MO',
      'DTSTART:20260101T000000Z\nRRULE:FREQ=DAILY',
      'junk',
      '',
    ].forEach((rule) => {
      it(`rejects ${JSON.stringify(rule)}`, () => {
        expect(normalizeRule(rule)).to.equal(null);
      });
    });
  });

  describe('#getNextRunAt(options)', () => {
    const next = (rule, timeZone, after, startAt = '2026-01-01T00:00:00Z') =>
      getNextRunAt({
        timeZone,
        startAt,
        after,
        rule: normalizeRule(rule),
      }).toISOString();

    it('runs at the time of day in the time zone', () => {
      expect(next('FREQ=DAILY;BYHOUR=9', 'Asia/Dhaka', '2026-11-23T02:00:00Z')).to.equal(
        '2026-11-23T03:00:00.000Z',
      );

      expect(next('FREQ=DAILY;BYHOUR=9', 'Asia/Dhaka', '2026-11-23T05:00:00Z')).to.equal(
        '2026-11-24T03:00:00.000Z',
      );
    });

    it('never returns the instant it is asked after', () => {
      expect(next('FREQ=DAILY;BYHOUR=9', 'UTC', '2026-11-23T09:00:00Z')).to.equal(
        '2026-11-24T09:00:00.000Z',
      );
    });

    it('runs on the chosen week days', () => {
      // 2026-11-23 is a Monday
      expect(next('FREQ=WEEKLY;BYDAY=MO,WE;BYHOUR=9', 'UTC', '2026-11-23T10:00:00Z')).to.equal(
        '2026-11-25T09:00:00.000Z',
      );
    });

    it('runs on the last day of months shorter than the chosen day', () => {
      const rule = 'FREQ=MONTHLY;BYMONTHDAY=31,-1;BYSETPOS=1;BYHOUR=9';

      expect(next(rule, 'UTC', '2026-01-31T10:00:00Z')).to.equal('2026-02-28T09:00:00.000Z');
      expect(next(rule, 'UTC', '2028-01-31T10:00:00Z')).to.equal('2028-02-29T09:00:00.000Z');
      expect(next(rule, 'UTC', '2026-03-31T10:00:00Z')).to.equal('2026-04-30T09:00:00.000Z');
      expect(next(rule, 'UTC', '2026-04-30T10:00:00Z')).to.equal('2026-05-31T09:00:00.000Z');
    });

    it('runs on the last day of the month', () => {
      expect(next('FREQ=MONTHLY;BYMONTHDAY=-1;BYHOUR=18', 'UTC', '2026-02-01T00:00:00Z')).to.equal(
        '2026-02-28T18:00:00.000Z',
      );
    });

    it('crosses the end of the year', () => {
      expect(next('FREQ=MONTHLY;BYMONTHDAY=1;BYHOUR=9', 'UTC', '2026-12-15T00:00:00Z')).to.equal(
        '2027-01-01T09:00:00.000Z',
      );
    });

    it('keeps the wall-clock time across daylight saving changes', () => {
      // Clocks go forward on 2026-03-08 in New York and on 2026-03-29 in Berlin
      expect(next('FREQ=DAILY;BYHOUR=9', 'America/New_York', '2026-03-07T15:00:00Z')).to.equal(
        '2026-03-08T13:00:00.000Z',
      );

      expect(next('FREQ=DAILY;BYHOUR=9', 'Europe/Berlin', '2026-03-28T09:00:00Z')).to.equal(
        '2026-03-29T07:00:00.000Z',
      );

      // Clocks go back on 2026-10-25 in Berlin
      expect(next('FREQ=DAILY;BYHOUR=9', 'Europe/Berlin', '2026-10-24T08:00:00Z')).to.equal(
        '2026-10-25T08:00:00.000Z',
      );
    });

    it('runs a time skipped by a daylight saving change after the change', () => {
      expect(
        next('FREQ=DAILY;BYHOUR=2;BYMINUTE=30', 'America/New_York', '2026-03-07T12:00:00Z'),
      ).to.equal('2026-03-08T07:30:00.000Z');

      expect(
        next('FREQ=DAILY;BYHOUR=2;BYMINUTE=30', 'Europe/Berlin', '2026-03-28T12:00:00Z'),
      ).to.equal('2026-03-29T01:30:00.000Z');
    });

    it('reads week days in the time zone, not in UTC', () => {
      // Monday 00:30 in Dhaka is still Sunday in UTC
      expect(
        next('FREQ=WEEKLY;BYDAY=MO;BYHOUR=0;BYMINUTE=30', 'Asia/Dhaka', '2026-11-20T00:00:00Z'),
      ).to.equal('2026-11-22T18:30:00.000Z');
    });

    it('counts intervals from the start date', () => {
      const rule = 'FREQ=WEEKLY;INTERVAL=2;BYDAY=MO;BYHOUR=9';
      const startAt = '2026-11-23T08:00:00Z';

      expect(next(rule, 'UTC', '2026-11-23T10:00:00Z', startAt)).to.equal(
        '2026-12-07T09:00:00.000Z',
      );
    });

    it('returns null once the rule has no more occurrences', () => {
      expect(
        getNextRunAt({
          rule: normalizeRule('FREQ=DAILY;UNTIL=20260105T000000Z'),
          timeZone: 'UTC',
          startAt: '2026-01-01T00:00:00Z',
          after: '2026-02-01T00:00:00Z',
        }),
      ).to.equal(null);
    });
  });
});
