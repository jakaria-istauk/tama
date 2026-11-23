/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    record: {
      type: 'ref',
      required: true,
    },
    request: {
      type: 'ref',
    },
  },

  async fn(inputs) {
    const cardRecurrence = await CardRecurrence.qm.deleteOne(inputs.record.id);

    if (cardRecurrence) {
      sails.sockets.broadcast(
        `board:${cardRecurrence.boardId}`,
        'cardRecurrenceDelete',
        {
          item: cardRecurrence,
        },
        inputs.request,
      );
    }

    return cardRecurrence;
  },
};
