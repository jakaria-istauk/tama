/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { createSelector } from 'redux-orm';

import orm from '../orm';

// The recurrence of a card template, or null when it does not recur
export const selectCardRecurrenceByCardId = createSelector(
  orm,
  (_, cardId) => cardId,
  ({ CardRecurrence }, cardId) => {
    const cardRecurrenceModel = CardRecurrence.filter({
      templateCardId: cardId,
    }).first();

    return cardRecurrenceModel ? cardRecurrenceModel.ref : null;
  },
);

export default {
  selectCardRecurrenceByCardId,
};
