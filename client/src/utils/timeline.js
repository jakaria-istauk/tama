/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { addDays, differenceInCalendarDays } from 'date-fns';

export const DragModes = {
  MOVE: 'move',
  START: 'start',
  END: 'end',
};

// A card spans from its start date to its due date. With only one of them it
// takes up that single day; with neither it is not on the timeline.
export const getCardSpan = (card) => {
  const start = card.startDate || card.dueDate;
  const end = card.dueDate || card.startDate;

  if (!start) {
    return null;
  }

  return { start, end };
};

// Places cards that overlap the visible days, each in the first lane where it
// does not overlap another card. Indexes are clamped to the visible days, and
// isClippedStart / isClippedEnd tell when a card runs on past them.
export const layoutBars = (cards, rangeStart, daysTotal) => {
  const bars = [];

  cards.forEach((card) => {
    const span = getCardSpan(card);

    if (!span) {
      return;
    }

    const startIndex = differenceInCalendarDays(span.start, rangeStart);
    const endIndex = differenceInCalendarDays(span.end, rangeStart);

    if (endIndex < 0 || startIndex >= daysTotal) {
      return;
    }

    bars.push({
      card,
      startIndex: Math.max(startIndex, 0),
      endIndex: Math.min(endIndex, daysTotal - 1),
      isClippedStart: startIndex < 0,
      isClippedEnd: endIndex >= daysTotal,
    });
  });

  bars.sort(
    (a, b) =>
      a.startIndex - b.startIndex ||
      b.endIndex - a.endIndex ||
      a.card.name.localeCompare(b.card.name),
  );

  const laneEnds = [];
  bars.forEach((bar) => {
    let lane = laneEnds.findIndex((laneEnd) => laneEnd < bar.startIndex);

    if (lane === -1) {
      lane = laneEnds.length;
    }

    laneEnds[lane] = bar.endIndex;
    bar.lane = lane; // eslint-disable-line no-param-reassign
  });

  return {
    bars,
    lanesTotal: laneEnds.length,
  };
};

// The card values a drag by a number of days makes: moving shifts every date the
// card has, while dragging an edge changes one date, and adds it when the card
// had only the other one. A start date never goes past the due date or the other
// way round. Returns null when nothing changes.
export const getDraggedValues = (card, mode, days) => {
  const span = getCardSpan(card);

  if (!span || days === 0) {
    return null;
  }

  if (mode === DragModes.MOVE) {
    return {
      ...(card.startDate && { startDate: addDays(card.startDate, days) }),
      ...(card.dueDate && { dueDate: addDays(card.dueDate, days) }),
    };
  }

  if (mode === DragModes.START) {
    let startDate = addDays(span.start, days);

    if (startDate > span.end) {
      startDate = span.end;
    }

    if (card.startDate && startDate.getTime() === card.startDate.getTime()) {
      return null;
    }

    return {
      startDate,
      // A card with only a start date gets a due date where it was, so it keeps a span
      ...(!card.dueDate && { dueDate: span.end }),
    };
  }

  let dueDate = addDays(span.end, days);

  if (dueDate < span.start) {
    dueDate = span.start;
  }

  if (card.dueDate && dueDate.getTime() === card.dueDate.getTime()) {
    return null;
  }

  return {
    dueDate,
    ...(!card.startDate && { startDate: span.start }),
  };
};
