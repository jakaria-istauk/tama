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

  exits: {
    limitReached: {},
  },

  async fn(inputs) {
    const { values } = inputs;

    const savedFilters = await SavedFilter.qm.getByBoardIdAndUserId(
      values.board.id,
      values.user.id,
    );

    if (savedFilters.length >= SavedFilter.MAX_PER_BOARD) {
      throw 'limitReached';
    }

    const savedFilter = await SavedFilter.qm.createOne({
      ..._.omit(values, ['board', 'user']),
      boardId: values.board.id,
      userId: values.user.id,
    });

    // Only the owner's other windows hear about it: a saved filter is personal.
    sails.sockets.broadcast(
      `user:${savedFilter.userId}`,
      'savedFilterCreate',
      {
        item: savedFilter,
      },
      inputs.request,
    );

    return savedFilter;
  },
};
