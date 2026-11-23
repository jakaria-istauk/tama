import { Frequencies, LAST_MONTH_DAY, buildRule, parseRule } from './card-recurrence-rule';

const time = { hour: 9, minute: 30 };

describe('card recurrence rule', () => {
  test('builds a daily rule', () => {
    expect(buildRule({ ...time, frequency: Frequencies.DAILY })).toBe(
      'FREQ=DAILY;BYHOUR=9;BYMINUTE=30',
    );
  });

  test('builds a weekly rule with the days in week order', () => {
    expect(buildRule({ ...time, frequency: Frequencies.WEEKLY, weekdays: ['FR', 'MO'] })).toBe(
      'FREQ=WEEKLY;BYDAY=MO,FR;BYHOUR=9;BYMINUTE=30',
    );
  });

  test('builds a monthly rule that falls back to the last day of shorter months', () => {
    expect(buildRule({ ...time, frequency: Frequencies.MONTHLY, monthDay: 15 })).toBe(
      'FREQ=MONTHLY;BYMONTHDAY=15;BYHOUR=9;BYMINUTE=30',
    );

    expect(buildRule({ ...time, frequency: Frequencies.MONTHLY, monthDay: 31 })).toBe(
      'FREQ=MONTHLY;BYMONTHDAY=31,-1;BYSETPOS=1;BYHOUR=9;BYMINUTE=30',
    );

    expect(buildRule({ ...time, frequency: Frequencies.MONTHLY, monthDay: LAST_MONTH_DAY })).toBe(
      'FREQ=MONTHLY;BYMONTHDAY=-1;BYHOUR=9;BYMINUTE=30',
    );
  });

  test('reads back the rules it builds, as the server returns them', () => {
    [
      { frequency: Frequencies.DAILY, weekdays: [], monthDay: 1 },
      { frequency: Frequencies.WEEKLY, weekdays: ['MO', 'WE'], monthDay: 1 },
      { frequency: Frequencies.MONTHLY, weekdays: [], monthDay: 30 },
      { frequency: Frequencies.MONTHLY, weekdays: [], monthDay: LAST_MONTH_DAY },
    ].forEach((choices) => {
      const rule = `${buildRule({ ...choices, ...time })};BYSECOND=0`;

      expect(parseRule(rule)).toEqual({ ...choices, ...time });
    });
  });

  test('reads rules in any part order and with the time left out', () => {
    expect(parseRule('BYDAY=TU;FREQ=WEEKLY')).toEqual({
      frequency: Frequencies.WEEKLY,
      weekdays: ['TU'],
      monthDay: 1,
      hour: 0,
      minute: 0,
    });
  });

  test('does not read rules it cannot build', () => {
    [
      'FREQ=YEARLY;BYMONTH=1',
      'FREQ=DAILY;INTERVAL=2',
      'FREQ=DAILY;COUNT=5',
      'FREQ=WEEKLY',
      'FREQ=MONTHLY;BYMONTHDAY=15,-1;BYSETPOS=1',
      'FREQ=MONTHLY;BYDAY=1MO',
      'junk',
      '',
      null,
    ].forEach((rule) => {
      expect(parseRule(rule)).toBe(null);
    });
  });
});
