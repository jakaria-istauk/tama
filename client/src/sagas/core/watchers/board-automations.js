/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { all, takeEvery } from 'redux-saga/effects';

import services from '../services';
import EntryActionTypes from '../../../constants/EntryActionTypes';

export default function* boardAutomationsWatchers() {
  yield all([
    takeEvery(EntryActionTypes.BOARD_AUTOMATION_IN_CURRENT_BOARD_CREATE, ({ payload: { data } }) =>
      services.createBoardAutomationInCurrentBoard(data),
    ),
    takeEvery(EntryActionTypes.BOARD_AUTOMATION_CREATE_HANDLE, ({ payload: { boardAutomation } }) =>
      services.handleBoardAutomationCreate(boardAutomation),
    ),
    takeEvery(EntryActionTypes.BOARD_AUTOMATION_UPDATE, ({ payload: { id, data } }) =>
      services.updateBoardAutomation(id, data),
    ),
    takeEvery(EntryActionTypes.BOARD_AUTOMATION_UPDATE_HANDLE, ({ payload: { boardAutomation } }) =>
      services.handleBoardAutomationUpdate(boardAutomation),
    ),
    takeEvery(EntryActionTypes.BOARD_AUTOMATION_DELETE, ({ payload: { id } }) =>
      services.deleteBoardAutomation(id),
    ),
    takeEvery(EntryActionTypes.BOARD_AUTOMATION_DELETE_HANDLE, ({ payload: { boardAutomation } }) =>
      services.handleBoardAutomationDelete(boardAutomation),
    ),
  ]);
}
