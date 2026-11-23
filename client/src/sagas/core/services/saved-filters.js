/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { call, put, select } from 'redux-saga/effects';

import request from '../request';
import selectors from '../../../selectors';
import actions from '../../../actions';
import api from '../../../api';
import { createLocalId } from '../../../utils/local-id';

export function* createSavedFilterInCurrentBoard(data) {
  const localId = yield call(createLocalId);
  const { boardId } = yield select(selectors.selectPath);
  const currentUserId = yield select(selectors.selectCurrentUserId);

  yield put(
    actions.createSavedFilter({
      ...data,
      boardId,
      id: localId,
      userId: currentUserId,
    }),
  );

  let savedFilter;
  try {
    ({ item: savedFilter } = yield call(request, api.createSavedFilter, boardId, data));
  } catch (error) {
    yield put(actions.createSavedFilter.failure(localId, error));
    return;
  }

  yield put(actions.createSavedFilter.success(localId, savedFilter));
}

export function* handleSavedFilterCreate(savedFilter) {
  yield put(actions.handleSavedFilterCreate(savedFilter));
}

export function* updateSavedFilter(id, data) {
  yield put(actions.updateSavedFilter(id, data));

  let savedFilter;
  try {
    ({ item: savedFilter } = yield call(request, api.updateSavedFilter, id, data));
  } catch (error) {
    yield put(actions.updateSavedFilter.failure(id, error));
    return;
  }

  yield put(actions.updateSavedFilter.success(savedFilter));
}

export function* handleSavedFilterUpdate(savedFilter) {
  yield put(actions.handleSavedFilterUpdate(savedFilter));
}

export function* deleteSavedFilter(id) {
  yield put(actions.deleteSavedFilter(id));

  let savedFilter;
  try {
    ({ item: savedFilter } = yield call(request, api.deleteSavedFilter, id));
  } catch (error) {
    yield put(actions.deleteSavedFilter.failure(id, error));
    return;
  }

  yield put(actions.deleteSavedFilter.success(savedFilter));
}

export function* handleSavedFilterDelete(savedFilter) {
  yield put(actions.handleSavedFilterDelete(savedFilter));
}

export default {
  createSavedFilterInCurrentBoard,
  handleSavedFilterCreate,
  updateSavedFilter,
  handleSavedFilterUpdate,
  deleteSavedFilter,
  handleSavedFilterDelete,
};
