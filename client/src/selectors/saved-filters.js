/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { createSelector } from 'redux-orm';

import orm from '../orm';
import { selectPath } from './router';
import { selectCurrentUserId } from './users';
import { isLocalId } from '../utils/local-id';

// The current user's saved filters on the current board, newest first.
export const selectSavedFiltersForCurrentBoard = createSelector(
  orm,
  (state) => selectPath(state).boardId,
  (state) => selectCurrentUserId(state),
  ({ SavedFilter }, boardId, currentUserId) => {
    if (!boardId || !currentUserId) {
      return [];
    }

    return SavedFilter.filter({
      boardId,
      userId: currentUserId,
    })
      .orderBy(['id.length', 'id'], ['desc', 'desc'])
      .toRefArray()
      .map((savedFilter) => ({
        ...savedFilter,
        isPersisted: !isLocalId(savedFilter.id),
      }));
  },
);

export default {
  selectSavedFiltersForCurrentBoard,
};
