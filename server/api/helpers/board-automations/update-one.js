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

    if (values.creatorUser) {
      values.creatorUserId = values.creatorUser.id;
      delete values.creatorUser;
    }

    // Due dates that passed while the rule was off, or had another trigger, do not trigger it
    if ((values.isEnabled && !inputs.record.isEnabled) || values.trigger) {
      values.dueCheckedAt = new Date().toISOString();
    }

    const boardAutomation = await BoardAutomation.qm.updateOne(inputs.record.id, values);

    if (boardAutomation) {
      sails.sockets.broadcast(
        `board:${boardAutomation.boardId}`,
        'boardAutomationUpdate',
        {
          item: boardAutomation,
        },
        inputs.request,
      );
    }

    return boardAutomation;
  },
};
