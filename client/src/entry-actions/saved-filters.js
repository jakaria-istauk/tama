/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import EntryActionTypes from '../constants/EntryActionTypes';

const createSavedFilterInCurrentBoard = (data) => ({
  type: EntryActionTypes.SAVED_FILTER_IN_CURRENT_BOARD_CREATE,
  payload: {
    data,
  },
});

const handleSavedFilterCreate = (savedFilter) => ({
  type: EntryActionTypes.SAVED_FILTER_CREATE_HANDLE,
  payload: {
    savedFilter,
  },
});

const updateSavedFilter = (id, data) => ({
  type: EntryActionTypes.SAVED_FILTER_UPDATE,
  payload: {
    id,
    data,
  },
});

const handleSavedFilterUpdate = (savedFilter) => ({
  type: EntryActionTypes.SAVED_FILTER_UPDATE_HANDLE,
  payload: {
    savedFilter,
  },
});

const deleteSavedFilter = (id) => ({
  type: EntryActionTypes.SAVED_FILTER_DELETE,
  payload: {
    id,
  },
});

const handleSavedFilterDelete = (savedFilter) => ({
  type: EntryActionTypes.SAVED_FILTER_DELETE_HANDLE,
  payload: {
    savedFilter,
  },
});

export default {
  createSavedFilterInCurrentBoard,
  handleSavedFilterCreate,
  updateSavedFilter,
  handleSavedFilterUpdate,
  deleteSavedFilter,
  handleSavedFilterDelete,
};
