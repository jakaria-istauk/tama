/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import socket from './socket';

/* Actions */

const createBoardAutomation = (boardId, data, headers) =>
  socket.post(`/boards/${boardId}/board-automations`, data, headers);

const updateBoardAutomation = (id, data, headers) =>
  socket.patch(`/board-automations/${id}`, data, headers);

const deleteBoardAutomation = (id, headers) =>
  socket.delete(`/board-automations/${id}`, undefined, headers);

export default {
  createBoardAutomation,
  updateBoardAutomation,
  deleteBoardAutomation,
};
