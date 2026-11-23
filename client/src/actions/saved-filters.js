/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import ActionTypes from '../constants/ActionTypes';

const createSavedFilter = (savedFilter) => ({
  type: ActionTypes.SAVED_FILTER_CREATE,
  payload: {
    savedFilter,
  },
});

createSavedFilter.success = (localId, savedFilter) => ({
  type: ActionTypes.SAVED_FILTER_CREATE__SUCCESS,
  payload: {
    localId,
    savedFilter,
  },
});

createSavedFilter.failure = (localId, error) => ({
  type: ActionTypes.SAVED_FILTER_CREATE__FAILURE,
  payload: {
    localId,
    error,
  },
});

const handleSavedFilterCreate = (savedFilter) => ({
  type: ActionTypes.SAVED_FILTER_CREATE_HANDLE,
  payload: {
    savedFilter,
  },
});

const updateSavedFilter = (id, data) => ({
  type: ActionTypes.SAVED_FILTER_UPDATE,
  payload: {
    id,
    data,
  },
});

updateSavedFilter.success = (savedFilter) => ({
  type: ActionTypes.SAVED_FILTER_UPDATE__SUCCESS,
  payload: {
    savedFilter,
  },
});

updateSavedFilter.failure = (id, error) => ({
  type: ActionTypes.SAVED_FILTER_UPDATE__FAILURE,
  payload: {
    id,
    error,
  },
});

const handleSavedFilterUpdate = (savedFilter) => ({
  type: ActionTypes.SAVED_FILTER_UPDATE_HANDLE,
  payload: {
    savedFilter,
  },
});

const deleteSavedFilter = (id) => ({
  type: ActionTypes.SAVED_FILTER_DELETE,
  payload: {
    id,
  },
});

deleteSavedFilter.success = (savedFilter) => ({
  type: ActionTypes.SAVED_FILTER_DELETE__SUCCESS,
  payload: {
    savedFilter,
  },
});

deleteSavedFilter.failure = (id, error) => ({
  type: ActionTypes.SAVED_FILTER_DELETE__FAILURE,
  payload: {
    id,
    error,
  },
});

const handleSavedFilterDelete = (savedFilter) => ({
  type: ActionTypes.SAVED_FILTER_DELETE_HANDLE,
  payload: {
    savedFilter,
  },
});

export default {
  createSavedFilter,
  handleSavedFilterCreate,
  updateSavedFilter,
  handleSavedFilterUpdate,
  deleteSavedFilter,
  handleSavedFilterDelete,
};
