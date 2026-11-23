/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import EntryActionTypes from '../constants/EntryActionTypes';

// Creates the recurrence of a card template, or updates the one it has
const saveCardRecurrence = (cardId, data) => ({
  type: EntryActionTypes.CARD_RECURRENCE_SAVE,
  payload: {
    cardId,
    data,
  },
});

const handleCardRecurrenceCreate = (cardRecurrence) => ({
  type: EntryActionTypes.CARD_RECURRENCE_CREATE_HANDLE,
  payload: {
    cardRecurrence,
  },
});

const handleCardRecurrenceUpdate = (cardRecurrence) => ({
  type: EntryActionTypes.CARD_RECURRENCE_UPDATE_HANDLE,
  payload: {
    cardRecurrence,
  },
});

const deleteCardRecurrence = (id) => ({
  type: EntryActionTypes.CARD_RECURRENCE_DELETE,
  payload: {
    id,
  },
});

const handleCardRecurrenceDelete = (cardRecurrence) => ({
  type: EntryActionTypes.CARD_RECURRENCE_DELETE_HANDLE,
  payload: {
    cardRecurrence,
  },
});

export default {
  saveCardRecurrence,
  handleCardRecurrenceCreate,
  handleCardRecurrenceUpdate,
  deleteCardRecurrence,
  handleCardRecurrenceDelete,
};
