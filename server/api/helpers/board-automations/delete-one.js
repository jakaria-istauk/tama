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
    const boardAutomation = await BoardAutomation.qm.deleteOne(inputs.record.id);

    if (boardAutomation) {
      sails.sockets.broadcast(
        `board:${boardAutomation.boardId}`,
        'boardAutomationDelete',
        {
          item: boardAutomation,
        },
        inputs.request,
      );
    }

    return boardAutomation;
  },
};
