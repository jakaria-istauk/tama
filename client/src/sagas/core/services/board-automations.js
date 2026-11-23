/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { call, put, select } from 'redux-saga/effects';

import request from '../request';
import selectors from '../../../selectors';
import actions from '../../../actions';
import api from '../../../api';

// Rules are saved before they are shown, as the server checks and normalizes them
export function* createBoardAutomationInCurrentBoard(data) {
  const { boardId } = yield select(selectors.selectPath);

  yield put(actions.createBoardAutomation(boardId, data));

  let boardAutomation;
  try {
    ({ item: boardAutomation } = yield call(request, api.createBoardAutomation, boardId, data));
  } catch (error) {
    yield put(actions.createBoardAutomation.failure(boardId, error));
    return;
  }

  yield put(actions.createBoardAutomation.success(boardAutomation));
}

export function* handleBoardAutomationCreate(boardAutomation) {
  yield put(actions.handleBoardAutomationCreate(boardAutomation));
}

export function* updateBoardAutomation(id, data) {
  yield put(actions.updateBoardAutomation(id, data));

  let boardAutomation;
  try {
    ({ item: boardAutomation } = yield call(request, api.updateBoardAutomation, id, data));
  } catch (error) {
    yield put(actions.updateBoardAutomation.failure(id, error));
    return;
  }

  yield put(actions.updateBoardAutomation.success(boardAutomation));
}

export function* handleBoardAutomationUpdate(boardAutomation) {
  yield put(actions.handleBoardAutomationUpdate(boardAutomation));
}

export function* deleteBoardAutomation(id) {
  yield put(actions.deleteBoardAutomation(id));

  let boardAutomation;
  try {
    ({ item: boardAutomation } = yield call(request, api.deleteBoardAutomation, id));
  } catch (error) {
    yield put(actions.deleteBoardAutomation.failure(id, error));
    return;
  }

  yield put(actions.deleteBoardAutomation.success(boardAutomation));
}

export function* handleBoardAutomationDelete(boardAutomation) {
  yield put(actions.handleBoardAutomationDelete(boardAutomation));
}

export default {
  createBoardAutomationInCurrentBoard,
  handleBoardAutomationCreate,
  updateBoardAutomation,
  handleBoardAutomationUpdate,
  deleteBoardAutomation,
  handleBoardAutomationDelete,
};
