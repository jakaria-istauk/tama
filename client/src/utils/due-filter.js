/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import {
  addDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

import { DueFilterRanges } from '../constants/Enums';

const DATE_FORMAT = 'yyyy-MM-dd';

// Ranges are stored by name and worked out against "now" each time the filter
// runs, so a saved "this week" always means the current week. Custom ranges
// keep their own dates, read in the viewer's time zone.
export const getDueFilterInterval = (due, now = new Date()) => {
  if (!due) {
    return null;
  }

  switch (due.range) {
    case DueFilterRanges.TODAY:
      return { start: startOfDay(now), end: endOfDay(now) };
    case DueFilterRanges.THIS_WEEK:
      return {
        start: startOfWeek(now, { weekStartsOn: 0 }),
        end: endOfWeek(now, { weekStartsOn: 0 }),
      };
    case DueFilterRanges.NEXT_7_DAYS:
      return { start: startOfDay(now), end: endOfDay(addDays(now, 6)) };
    case DueFilterRanges.THIS_MONTH:
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case DueFilterRanges.NEXT_30_DAYS:
      return { start: startOfDay(now), end: endOfDay(addDays(now, 29)) };
    case DueFilterRanges.CUSTOM:
      if (!due.from || !due.to) {
        return null;
      }

      return { start: startOfDay(parseISO(due.from)), end: endOfDay(parseISO(due.to)) };
    default:
      return null;
  }
};

// Cards without a due date never match a due filter.
export const isDueDateInInterval = (dueDate, interval) => {
  if (!dueDate) {
    return false;
  }

  const time = new Date(dueDate).getTime();

  return time >= interval.start.getTime() && time <= interval.end.getTime();
};

export const formatDueFilterDate = (date) => format(date, DATE_FORMAT);

export const parseDueFilterDate = (value) => parseISO(value);

export const isSameDueFilter = (a, b) => {
  if (!a || !b) {
    return !a && !b;
  }

  return (
    a.range === b.range &&
    (a.from || null) === (b.from || null) &&
    (a.to || null) === (b.to || null)
  );
};
