/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import EntryActionTypes from '../constants/EntryActionTypes';

const createBoardAutomationInCurrentBoard = (data) => ({
  type: EntryActionTypes.BOARD_AUTOMATION_IN_CURRENT_BOARD_CREATE,
  payload: {
    data,
  },
});

const handleBoardAutomationCreate = (boardAutomation) => ({
  type: EntryActionTypes.BOARD_AUTOMATION_CREATE_HANDLE,
  payload: {
    boardAutomation,
  },
});

const updateBoardAutomation = (id, data) => ({
  type: EntryActionTypes.BOARD_AUTOMATION_UPDATE,
  payload: {
    id,
    data,
  },
});

const handleBoardAutomationUpdate = (boardAutomation) => ({
  type: EntryActionTypes.BOARD_AUTOMATION_UPDATE_HANDLE,
  payload: {
    boardAutomation,
  },
});

const deleteBoardAutomation = (id) => ({
  type: EntryActionTypes.BOARD_AUTOMATION_DELETE,
  payload: {
    id,
  },
});

const handleBoardAutomationDelete = (boardAutomation) => ({
  type: EntryActionTypes.BOARD_AUTOMATION_DELETE_HANDLE,
  payload: {
    boardAutomation,
  },
});

export default {
  createBoardAutomationInCurrentBoard,
  handleBoardAutomationCreate,
  updateBoardAutomation,
  handleBoardAutomationUpdate,
  deleteBoardAutomation,
  handleBoardAutomationDelete,
};
