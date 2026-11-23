/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

// LocalStorage helpers behind the "last filter" recall: clearing the
// whole filter via the X leaves a snapshot here, so the next click of the
// restore button can put it back.
//
// Saved filters used to live here too, per user and per board. They are
// kept on the server now (the SavedFilter model); takeLegacySavedFilters
// hands over whatever a browser still holds, once.
//
// NOTHING IN HERE IS EVER APPLIED ON ITS OWN. There is no effect that
// reads a stored filter when a board opens; every read below happens
// inside a click handler, or to decide whether a button is worth
// rendering. That restraint is what makes localStorage the right home
// for this: two windows on the same board hold their own live filter
// (which still lives on the Board model in redux-orm and still travels
// over the existing entry actions) and neither one is ever overwritten
// by what the other stashed away.
//
// Saved filters from before the rename to Tama are moved over to these
// keys at startup (see utils/legacy-storage.js).

const LAST_KEY_PREFIX = 'tama:filter:last';
const SAVED_KEY_PREFIX = 'tama:filter:saved';

const buildKey = (prefix, userId, boardId) => {
  if (!userId || !boardId) {
    return null;
  }

  return `${prefix}:${userId}:${boardId}`;
};

// A filter worth remembering. Every dimension Community can filter on
// counts, including the ones Pro has no equivalent for — otherwise a
// "cards without a member" filter could never be saved.
const isFilterMeaningful = (filter) =>
  !!filter &&
  ((filter.userIds && filter.userIds.length > 0) ||
    (filter.labelIds && filter.labelIds.length > 0) ||
    (filter.excludedLabelIds && filter.excludedLabelIds.length > 0) ||
    (filter.listIds && filter.listIds.length > 0) ||
    !!filter.noMember ||
    (filter.search && filter.search.length > 0) ||
    (filter.creatorUserIds && filter.creatorUserIds.length > 0) ||
    !!filter.due);

// One shape for both buckets. `userIds` / `labelIds` / `search` are the
// fields Pro reads; the rest are Community-only and additive.
const normalizeFilter = (filter) => ({
  userIds: filter.userIds || [],
  labelIds: filter.labelIds || [],
  search: filter.search || '',
  excludedLabelIds: filter.excludedLabelIds || [],
  listIds: filter.listIds || [],
  noMember: !!filter.noMember,
  creatorUserIds: filter.creatorUserIds || [],
  due: filter.due || null,
});

export const readLastFilter = (userId, boardId) => {
  const key = buildKey(LAST_KEY_PREFIX, userId, boardId);

  if (!key) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(key);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);

    return isFilterMeaningful(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const writeLastFilter = (userId, boardId, filter) => {
  const key = buildKey(LAST_KEY_PREFIX, userId, boardId);

  if (!key) {
    return;
  }

  try {
    if (isFilterMeaningful(filter)) {
      window.localStorage.setItem(key, JSON.stringify(normalizeFilter(filter)));
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Storage may be full, blocked (private mode), or otherwise
    // unavailable. The feature degrades silently — worst case the user
    // just doesn't get the recall behaviour.
  }
};

export const clearLastFilter = (userId, boardId) => {
  const key = buildKey(LAST_KEY_PREFIX, userId, boardId);

  if (!key) {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {
    // See writeLastFilter.
  }
};

// Saved filters this browser kept before they moved to the server, as
// { name, filter } entries ready to be created there. Reading them also
// removes them, so they are handed over only once.
export const takeLegacySavedFilters = (userId, boardId) => {
  const key = buildKey(SAVED_KEY_PREFIX, userId, boardId);

  if (!key) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(key);

    if (!raw) {
      return [];
    }

    window.localStorage.removeItem(key);

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (entry) =>
          entry && typeof entry.name === 'string' && entry.name.trim() && isFilterMeaningful(entry),
      )
      .map(({ name, ...filter }) => ({
        name: name.trim(),
        filter: normalizeFilter(filter),
      }));
  } catch {
    return [];
  }
};
