/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    values: {
      type: 'ref',
      required: true,
    },
    request: {
      type: 'ref',
    },
  },

  async fn(inputs) {
    const { values } = inputs;

    const boardAutomation = await BoardAutomation.qm.createOne({
      ..._.omit(values, ['board', 'creatorUser']),
      boardId: values.board.id,
      creatorUserId: values.creatorUser.id,
      // Due dates that passed before the rule existed do not trigger it
      dueCheckedAt: new Date().toISOString(),
    });

    sails.sockets.broadcast(
      `board:${boardAutomation.boardId}`,
      'boardAutomationCreate',
      {
        item: boardAutomation,
      },
      inputs.request,
    );

    return boardAutomation;
  },
};
