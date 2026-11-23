/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

// Turns the choices of the Repeat step into an RFC 5545 RRULE and back. Only the rules the
// step can build are read back; any other rule (set through the API) parses to null.

export const Frequencies = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
};

export const WEEKDAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

export const LAST_MONTH_DAY = -1;

// Longer months than this are the only ones that have the day, so later days fall back to
// the last day of shorter months
const DAYS_IN_SHORTEST_MONTH = 28;

const FREQ_BY_FREQUENCY = {
  [Frequencies.DAILY]: 'DAILY',
  [Frequencies.WEEKLY]: 'WEEKLY',
  [Frequencies.MONTHLY]: 'MONTHLY',
};

export const buildRule = ({ frequency, weekdays, monthDay, hour, minute }) => {
  const parts = [`FREQ=${FREQ_BY_FREQUENCY[frequency]}`];

  if (frequency === Frequencies.WEEKLY) {
    parts.push(`BYDAY=${WEEKDAYS.filter((weekday) => weekdays.includes(weekday)).join(',')}`);
  } else if (frequency === Frequencies.MONTHLY) {
    if (monthDay > DAYS_IN_SHORTEST_MONTH) {
      parts.push(`BYMONTHDAY=${monthDay},-1`, 'BYSETPOS=1');
    } else {
      parts.push(`BYMONTHDAY=${monthDay}`);
    }
  }

  parts.push(`BYHOUR=${hour}`, `BYMINUTE=${minute}`);

  return parts.join(';');
};

const toInteger = (value) => (/^-?\d+$/.test(value) ? parseInt(value, 10) : NaN);

export const parseRule = (rule) => {
  if (!rule) {
    return null;
  }

  const values = {};

  // eslint-disable-next-line no-restricted-syntax
  for (const part of rule.replace(/^RRULE:/, '').split(';')) {
    const [name, value] = part.split('=');

    if (!name || value === undefined) {
      return null;
    }

    values[name] = value;
  }

  const {
    FREQ: freq,
    BYDAY: byday,
    BYMONTHDAY: bymonthday,
    BYSETPOS: bysetpos,
    BYHOUR: byhour = '0',
    BYMINUTE: byminute = '0',
    BYSECOND: bysecond = '0',
    INTERVAL: interval = '1',
    ...rest
  } = values;

  if (Object.keys(rest).length > 0 || interval !== '1' || bysecond !== '0') {
    return null;
  }

  const hour = toInteger(byhour);
  const minute = toInteger(byminute);

  if (!(hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59)) {
    return null;
  }

  const result = {
    hour,
    minute,
    weekdays: [],
    monthDay: 1,
  };

  if (freq === 'DAILY' && !byday && !bymonthday && !bysetpos) {
    return {
      ...result,
      frequency: Frequencies.DAILY,
    };
  }

  if (freq === 'WEEKLY' && byday && !bymonthday && !bysetpos) {
    const weekdays = byday.split(',');

    if (!weekdays.every((weekday) => WEEKDAYS.includes(weekday))) {
      return null;
    }

    return {
      ...result,
      weekdays,
      frequency: Frequencies.WEEKLY,
    };
  }

  if (freq === 'MONTHLY' && bymonthday && !byday) {
    const days = bymonthday.split(',').map(toInteger);

    let monthDay;
    if (days.length === 1 && !bysetpos) {
      [monthDay] = days;

      if (!(monthDay === LAST_MONTH_DAY || (monthDay >= 1 && monthDay <= 31))) {
        return null;
      }
    } else if (
      days.length === 2 &&
      days[1] === LAST_MONTH_DAY &&
      bysetpos === '1' &&
      days[0] > DAYS_IN_SHORTEST_MONTH &&
      days[0] <= 31
    ) {
      [monthDay] = days;
    } else {
      return null;
    }

    return {
      ...result,
      monthDay,
      frequency: Frequencies.MONTHLY,
    };
  }

  return null;
};
