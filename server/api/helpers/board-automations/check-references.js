/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

// Checks that the lists, labels and users a rule's trigger and actions name belong to its
// board: lists other than the trash, labels of the board and members of the board.

const { ActionTypes } = require('../../../utils/automation');

module.exports = {
  inputs: {
    boardId: {
      type: 'string',
      required: true,
    },
    trigger: {
      type: 'ref',
      required: true,
    },
    actions: {
      type: 'ref',
      required: true,
    },
  },

  exits: {
    listNotFound: {},
    labelNotFound: {},
    userNotFound: {},
  },

  async fn(inputs) {
    const items = [inputs.trigger, ...inputs.actions];

    const listIds = _.uniq(items.map((item) => item.listId).filter(Boolean));
    const labelIds = _.uniq(items.map((item) => item.labelId).filter(Boolean));

    const userIds = _.uniq(
      inputs.actions
        .filter(({ type }) => type === ActionTypes.ADD_MEMBER || type === ActionTypes.REMOVE_MEMBER)
        .map((action) => action.userId),
    );

    if (listIds.length > 0) {
      const lists = await List.qm.getByIds(listIds);

      const isValid =
        lists.length === listIds.length &&
        lists.every((list) => list.boardId === inputs.boardId && list.type !== List.Types.TRASH);

      if (!isValid) {
        throw 'listNotFound';
      }
    }

    if (labelIds.length > 0) {
      const labels = await Label.qm.getByIds(labelIds);

      if (
        labels.length !== labelIds.length ||
        labels.some((label) => label.boardId !== inputs.boardId)
      ) {
        throw 'labelNotFound';
      }
    }

    if (userIds.length > 0) {
      const memberUserIds = await sails.helpers.boards.getMemberUserIds(inputs.boardId);

      if (_.difference(userIds, memberUserIds).length > 0) {
        throw 'userNotFound';
      }
    }
  },
};
