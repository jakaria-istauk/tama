/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { all, takeEvery } from 'redux-saga/effects';

import services from '../services';
import EntryActionTypes from '../../../constants/EntryActionTypes';

export default function* savedFiltersWatchers() {
  yield all([
    takeEvery(EntryActionTypes.SAVED_FILTER_IN_CURRENT_BOARD_CREATE, ({ payload: { data } }) =>
      services.createSavedFilterInCurrentBoard(data),
    ),
    takeEvery(EntryActionTypes.SAVED_FILTER_CREATE_HANDLE, ({ payload: { savedFilter } }) =>
      services.handleSavedFilterCreate(savedFilter),
    ),
    takeEvery(EntryActionTypes.SAVED_FILTER_UPDATE, ({ payload: { id, data } }) =>
      services.updateSavedFilter(id, data),
    ),
    takeEvery(EntryActionTypes.SAVED_FILTER_UPDATE_HANDLE, ({ payload: { savedFilter } }) =>
      services.handleSavedFilterUpdate(savedFilter),
    ),
    takeEvery(EntryActionTypes.SAVED_FILTER_DELETE, ({ payload: { id } }) =>
      services.deleteSavedFilter(id),
    ),
    takeEvery(EntryActionTypes.SAVED_FILTER_DELETE_HANDLE, ({ payload: { savedFilter } }) =>
      services.handleSavedFilterDelete(savedFilter),
    ),
  ]);
}
