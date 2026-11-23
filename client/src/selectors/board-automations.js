/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { createSelector } from 'redux-orm';

import orm from '../orm';
import { selectPath } from './router';

export const selectBoardAutomationsForCurrentBoard = createSelector(
  orm,
  (state) => selectPath(state).boardId,
  ({ BoardAutomation }, boardId) => {
    if (!boardId) {
      return [];
    }

    return BoardAutomation.filter({
      boardId,
    })
      .orderBy('id')
      .toRefArray();
  },
);

export default {
  selectBoardAutomationsForCurrentBoard,
};
