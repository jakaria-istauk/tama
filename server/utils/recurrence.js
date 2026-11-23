/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * Recurrence rules of recurring cards: RFC 5545 RRULEs read in an IANA time zone.
 *
 * The rrule package is given wall-clock times as if they were UTC, so it never deals with
 * time zones itself; occurrences are turned back into real instants afterwards. A wall-clock
 * time skipped by a daylight saving change runs an hour later.
 */

const { RRule } = require('rrule');

const MAX_RULE_LENGTH = 512;
const MAX_INTERVAL = 1000;
const MAX_COUNT = 10000;

const FREQUENCIES = [RRule.DAILY, RRule.WEEKLY, RRule.MONTHLY, RRule.YEARLY];

const isTimeZone = (value) => {
  if (typeof value !== 'string' || value.length === 0 || value.length > 64) {
    return false;
  }

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }); // eslint-disable-line no-new
  } catch (error) {
    return false;
  }

  return true;
};

// The wall-clock time of an instant in a time zone, as a Date whose UTC fields hold it
const toWallClock = (date, timeZone) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(date);

  const values = parts.reduce(
    (result, { type, value }) => ({
      ...result,
      [type]: parseInt(value, 10),
    }),
    {},
  );

  return new Date(
    Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute, values.second),
  );
};

// The instant a wall-clock time stands for in a time zone. The offset is looked up twice
// because the first guess can fall on the other side of a daylight saving change. A time
// skipped by the change has no instant; the later guess, after the change, is used then.
const fromWallClock = (wallClock, timeZone) => {
  const getOffset = (date) => toWallClock(date, timeZone).getTime() - date.getTime();

  const firstGuess = new Date(wallClock.getTime() - getOffset(wallClock));
  const secondGuess = new Date(wallClock.getTime() - getOffset(firstGuess));

  if (toWallClock(secondGuess, timeZone).getTime() === wallClock.getTime()) {
    return secondGuess;
  }

  return firstGuess > secondGuess ? firstGuess : secondGuess;
};

const toArray = (value) => {
  if (value === undefined || value === null) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
};

const isIntegerInRange = (value, min, max, allowNegative = false) =>
  Number.isInteger(value) &&
  ((value >= min && value <= max) || (allowNegative && value <= -min && value >= -max));

// Allowed RRULE parts (as rrule options) and a check of their values
const OPTION_CHECKS = {
  freq: (value) => FREQUENCIES.includes(value),
  interval: (value) => isIntegerInRange(value, 1, MAX_INTERVAL),
  count: (value) => isIntegerInRange(value, 1, MAX_COUNT),
  until: (value) => value instanceof Date && !Number.isNaN(value.getTime()),
  wkst: () => true,
  byweekday: () => true,
  bymonth: (value) => toArray(value).every((item) => isIntegerInRange(item, 1, 12)),
  bymonthday: (value) => toArray(value).every((item) => isIntegerInRange(item, 1, 31, true)),
  bysetpos: (value) => toArray(value).every((item) => isIntegerInRange(item, 1, 366, true)),
  byhour: (value) => toArray(value).length === 1 && isIntegerInRange(toArray(value)[0], 0, 23),
  byminute: (value) => toArray(value).length === 1 && isIntegerInRange(toArray(value)[0], 0, 59),
  bysecond: (value) => toArray(value).length === 1 && toArray(value)[0] === 0,
};

/**
 * Checks a rule sent by a client and returns it without the RRULE: prefix and with the time
 * of day spelled out, or null when it is not allowed. Only rules
 * that make at most one card a day are allowed: FREQ is DAILY, WEEKLY, MONTHLY or YEARLY,
 * and BYHOUR and BYMINUTE take one value each (midnight when left out).
 */
const normalizeRule = (rule) => {
  if (typeof rule !== 'string' || rule.length > MAX_RULE_LENGTH || /[\r\n]/.test(rule)) {
    return null;
  }

  const text = rule.trim().replace(/^RRULE:/i, '');

  if (!text) {
    return null;
  }

  let options;
  try {
    options = RRule.parseString(text);
  } catch (error) {
    return null;
  }

  // The time of day is spelled out, so a rule runs at the same time wherever it is read
  options = {
    ...options,
    byhour: options.byhour === undefined ? 0 : options.byhour,
    byminute: options.byminute === undefined ? 0 : options.byminute,
    bysecond: options.bysecond === undefined ? 0 : options.bysecond,
  };

  const isValid =
    options.freq !== undefined &&
    Object.entries(options).every(
      ([name, value]) => OPTION_CHECKS[name] && OPTION_CHECKS[name](value),
    );

  if (!isValid) {
    return null;
  }

  let normalized;
  try {
    normalized = RRule.optionsToString(options);
    new RRule(RRule.parseString(normalized)); // eslint-disable-line no-new
  } catch (error) {
    return null;
  }

  return normalized.replace(/^RRULE:/, '');
};

/**
 * When a rule next runs after a given instant, or null when it has no more occurrences.
 * Occurrences are counted from the start of the day of startAt, which anchors INTERVAL
 * and COUNT.
 */
const getNextRunAt = ({ rule, timeZone, startAt, after }) => {
  const dtstart = toWallClock(new Date(startAt), timeZone);
  dtstart.setUTCHours(0, 0, 0, 0);

  const rrule = new RRule({
    ...RRule.parseString(rule),
    dtstart,
  });

  const occurrence = rrule.after(toWallClock(new Date(after), timeZone), false);
  return occurrence ? fromWallClock(occurrence, timeZone) : null;
};

module.exports = {
  isTimeZone,
  normalizeRule,
  getNextRunAt,
};
