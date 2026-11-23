/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

// Checks a filter sent by a client and returns it in one shape, with every
// field present, or null when it is not a valid filter. Unknown fields are
// dropped. Ids are not checked against the
// board: a label or list deleted later only means that part matches nothing.

const { isId } = require('../../../utils/validators');

const MAX_IDS = 100;
const MAX_SEARCH_LENGTH = 128;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const isDate = (value) =>
  typeof value === 'string' && DATE_REGEX.test(value) && !Number.isNaN(Date.parse(value));

const isIdList = (value) =>
  Array.isArray(value) &&
  value.length <= MAX_IDS &&
  value.every((id) => typeof id === 'string' && isId(id));

const normalizeDue = (due) => {
  if (due === undefined || due === null) {
    return null;
  }

  if (!_.isPlainObject(due) || !Object.values(SavedFilter.DueRanges).includes(due.range)) {
    return undefined;
  }

  if (due.range !== SavedFilter.DueRanges.CUSTOM) {
    return {
      range: due.range,
    };
  }

  if (!isDate(due.from) || !isDate(due.to) || due.from > due.to) {
    return undefined;
  }

  return {
    range: due.range,
    from: due.from,
    to: due.to,
  };
};

module.exports = {
  sync: true,

  inputs: {
    filter: {
      type: 'ref',
      required: true,
    },
  },

  fn(inputs) {
    const { filter } = inputs;

    if (!_.isPlainObject(filter)) {
      return null;
    }

    const idListNames = ['userIds', 'creatorUserIds', 'labelIds', 'excludedLabelIds', 'listIds'];

    const idLists = {};

    // eslint-disable-next-line no-restricted-syntax
    for (const name of idListNames) {
      const value = filter[name] === undefined ? [] : filter[name];

      if (!isIdList(value)) {
        return null;
      }

      idLists[name] = _.uniq(value);
    }

    const search = filter.search === undefined ? '' : filter.search;

    if (typeof search !== 'string' || search.length > MAX_SEARCH_LENGTH) {
      return null;
    }

    if (filter.noMember !== undefined && typeof filter.noMember !== 'boolean') {
      return null;
    }

    const due = normalizeDue(filter.due);

    if (due === undefined) {
      return null;
    }

    const normalized = {
      ...idLists,
      noMember: !!filter.noMember,
      search: search.trim(),
      due,
    };

    // An empty filter would show the whole board, which needs no saving.
    const isEmpty =
      idListNames.every((name) => normalized[name].length === 0) &&
      !normalized.noMember &&
      !normalized.search &&
      !normalized.due;

    if (isEmpty) {
      return null;
    }

    return normalized;
  },
};
