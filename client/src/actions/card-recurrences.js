/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import ActionTypes from '../constants/ActionTypes';

const createCardRecurrence = (cardId, data) => ({
  type: ActionTypes.CARD_RECURRENCE_CREATE,
  payload: {
    cardId,
    data,
  },
});

createCardRecurrence.success = (cardRecurrence) => ({
  type: ActionTypes.CARD_RECURRENCE_CREATE__SUCCESS,
  payload: {
    cardRecurrence,
  },
});

createCardRecurrence.failure = (cardId, error) => ({
  type: ActionTypes.CARD_RECURRENCE_CREATE__FAILURE,
  payload: {
    cardId,
    error,
  },
});

const handleCardRecurrenceCreate = (cardRecurrence) => ({
  type: ActionTypes.CARD_RECURRENCE_CREATE_HANDLE,
  payload: {
    cardRecurrence,
  },
});

const updateCardRecurrence = (id, data) => ({
  type: ActionTypes.CARD_RECURRENCE_UPDATE,
  payload: {
    id,
    data,
  },
});

updateCardRecurrence.success = (cardRecurrence) => ({
  type: ActionTypes.CARD_RECURRENCE_UPDATE__SUCCESS,
  payload: {
    cardRecurrence,
  },
});

updateCardRecurrence.failure = (id, error) => ({
  type: ActionTypes.CARD_RECURRENCE_UPDATE__FAILURE,
  payload: {
    id,
    error,
  },
});

const handleCardRecurrenceUpdate = (cardRecurrence) => ({
  type: ActionTypes.CARD_RECURRENCE_UPDATE_HANDLE,
  payload: {
    cardRecurrence,
  },
});

const deleteCardRecurrence = (id) => ({
  type: ActionTypes.CARD_RECURRENCE_DELETE,
  payload: {
    id,
  },
});

deleteCardRecurrence.success = (cardRecurrence) => ({
  type: ActionTypes.CARD_RECURRENCE_DELETE__SUCCESS,
  payload: {
    cardRecurrence,
  },
});

deleteCardRecurrence.failure = (id, error) => ({
  type: ActionTypes.CARD_RECURRENCE_DELETE__FAILURE,
  payload: {
    id,
    error,
  },
});

const handleCardRecurrenceDelete = (cardRecurrence) => ({
  type: ActionTypes.CARD_RECURRENCE_DELETE_HANDLE,
  payload: {
    cardRecurrence,
  },
});

export default {
  createCardRecurrence,
  handleCardRecurrenceCreate,
  updateCardRecurrence,
  handleCardRecurrenceUpdate,
  deleteCardRecurrence,
  handleCardRecurrenceDelete,
};
