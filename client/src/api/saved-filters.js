/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import socket from './socket';

/* Actions */

const createSavedFilter = (boardId, data, headers) =>
  socket.post(`/boards/${boardId}/saved-filters`, data, headers);

const updateSavedFilter = (id, data, headers) =>
  socket.patch(`/saved-filters/${id}`, data, headers);

const deleteSavedFilter = (id, headers) =>
  socket.delete(`/saved-filters/${id}`, undefined, headers);

export default {
  createSavedFilter,
  updateSavedFilter,
  deleteSavedFilter,
};
