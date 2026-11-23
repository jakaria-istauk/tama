/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

// Makes the card of a recurrence run by duplicating its template into its list, on behalf of
// the user who set the recurrence up. Returns null, without making a card, when the template
// or list is gone, or that user is deactivated or can no longer edit the board.

const { POSITION_GAP } = require('../../../constants');

module.exports = {
  inputs: {
    record: {
      type: 'ref',
      required: true,
    },
  },

  async fn(inputs) {
    const { record } = inputs;

    const path = await sails.helpers.cards
      .getPathToProjectById(record.templateCardId)
      .intercept('pathNotFound', () => null);

    if (!path || !path.card.isTemplate) {
      return null;
    }

    const { card: template, list: templateList, board, project } = path;

    const list = await List.qm.getOneById(record.listId, {
      boardId: board.id,
    });

    if (!list || !sails.helpers.lists.isFinite(list)) {
      return null;
    }

    const creatorUser = await User.qm.getOneById(record.creatorUserId, {
      withDeactivated: false,
    });

    if (!creatorUser) {
      return null;
    }

    const boardMembership = await BoardMembership.qm.getOneByBoardIdAndUserId(
      board.id,
      creatorUser.id,
    );

    if (!boardMembership || boardMembership.role !== BoardMembership.Roles.EDITOR) {
      return null;
    }

    const cards = await Card.qm.getByListId(list.id);

    const position =
      cards.length > 0 ? _.maxBy(cards, 'position').position + POSITION_GAP : POSITION_GAP;

    const { card } = await sails.helpers.cards.duplicateOne.with({
      project,
      board,
      record: template,
      list: templateList,
      values: {
        list,
        position,
        name: template.name,
        isTemplate: false,
        creatorUser,
      },
    });

    return card;
  },
};
