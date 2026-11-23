/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { getNextRunAt } = require('../../../utils/recurrence');

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
    noOccurrences: {},
    alreadyExists: {},
  },

  async fn(inputs) {
    const { values } = inputs;

    const now = new Date();

    const nextRunAt = getNextRunAt({
      rule: values.rule,
      timeZone: values.timeZone,
      startAt: now,
      after: now,
    });

    if (!nextRunAt) {
      throw 'noOccurrences';
    }

    let cardRecurrence;
    try {
      cardRecurrence = await CardRecurrence.qm.createOne({
        ..._.pick(values, ['rule', 'timeZone']),
        boardId: values.templateCard.boardId,
        templateCardId: values.templateCard.id,
        listId: values.list.id,
        creatorUserId: values.creatorUser.id,
        nextRunAt: nextRunAt.toISOString(),
      });
    } catch (error) {
      if (error.code === 'E_UNIQUE') {
        throw 'alreadyExists';
      }

      throw error;
    }

    sails.sockets.broadcast(
      `board:${cardRecurrence.boardId}`,
      'cardRecurrenceCreate',
      {
        item: cardRecurrence,
      },
      inputs.request,
    );

    return cardRecurrence;
  },
};
