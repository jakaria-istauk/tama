/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import socket from './socket';

/* Actions */

const createCardRecurrence = (cardId, data, headers) =>
  socket.post(`/cards/${cardId}/card-recurrence`, data, headers);

const updateCardRecurrence = (id, data, headers) =>
  socket.patch(`/card-recurrences/${id}`, data, headers);

const deleteCardRecurrence = (id, headers) =>
  socket.delete(`/card-recurrences/${id}`, undefined, headers);

export default {
  createCardRecurrence,
  updateCardRecurrence,
  deleteCardRecurrence,
};
