/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import ActionTypes from '../constants/ActionTypes';

const createBoardAutomation = (boardId, data) => ({
  type: ActionTypes.BOARD_AUTOMATION_CREATE,
  payload: {
    boardId,
    data,
  },
});

createBoardAutomation.success = (boardAutomation) => ({
  type: ActionTypes.BOARD_AUTOMATION_CREATE__SUCCESS,
  payload: {
    boardAutomation,
  },
});

createBoardAutomation.failure = (boardId, error) => ({
  type: ActionTypes.BOARD_AUTOMATION_CREATE__FAILURE,
  payload: {
    boardId,
    error,
  },
});

const handleBoardAutomationCreate = (boardAutomation) => ({
  type: ActionTypes.BOARD_AUTOMATION_CREATE_HANDLE,
  payload: {
    boardAutomation,
  },
});

const updateBoardAutomation = (id, data) => ({
  type: ActionTypes.BOARD_AUTOMATION_UPDATE,
  payload: {
    id,
    data,
  },
});

updateBoardAutomation.success = (boardAutomation) => ({
  type: ActionTypes.BOARD_AUTOMATION_UPDATE__SUCCESS,
  payload: {
    boardAutomation,
  },
});

updateBoardAutomation.failure = (id, error) => ({
  type: ActionTypes.BOARD_AUTOMATION_UPDATE__FAILURE,
  payload: {
    id,
    error,
  },
});

const handleBoardAutomationUpdate = (boardAutomation) => ({
  type: ActionTypes.BOARD_AUTOMATION_UPDATE_HANDLE,
  payload: {
    boardAutomation,
  },
});

const deleteBoardAutomation = (id) => ({
  type: ActionTypes.BOARD_AUTOMATION_DELETE,
  payload: {
    id,
  },
});

deleteBoardAutomation.success = (boardAutomation) => ({
  type: ActionTypes.BOARD_AUTOMATION_DELETE__SUCCESS,
  payload: {
    boardAutomation,
  },
});

deleteBoardAutomation.failure = (id, error) => ({
  type: ActionTypes.BOARD_AUTOMATION_DELETE__FAILURE,
  payload: {
    id,
    error,
  },
});

const handleBoardAutomationDelete = (boardAutomation) => ({
  type: ActionTypes.BOARD_AUTOMATION_DELETE_HANDLE,
  payload: {
    boardAutomation,
  },
});

export default {
  createBoardAutomation,
  handleBoardAutomationCreate,
  updateBoardAutomation,
  handleBoardAutomationUpdate,
  deleteBoardAutomation,
  handleBoardAutomationDelete,
};
