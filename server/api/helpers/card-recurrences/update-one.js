/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { getNextRunAt } = require('../../../utils/recurrence');

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

  exits: {
    noOccurrences: {},
  },

  async fn(inputs) {
    const { values } = inputs;

    if (values.list) {
      values.listId = values.list.id;
      delete values.list;
    }

    if (!_.isUndefined(values.rule) || !_.isUndefined(values.timeZone)) {
      const nextRunAt = getNextRunAt({
        rule: values.rule || inputs.record.rule,
        timeZone: values.timeZone || inputs.record.timeZone,
        startAt: inputs.record.createdAt,
        after: new Date(),
      });

      if (!nextRunAt) {
        throw 'noOccurrences';
      }

      values.nextRunAt = nextRunAt.toISOString();
    }

    const cardRecurrence = await CardRecurrence.qm.updateOne(inputs.record.id, values);

    if (cardRecurrence) {
      sails.sockets.broadcast(
        `board:${cardRecurrence.boardId}`,
        'cardRecurrenceUpdate',
        {
          item: cardRecurrence,
        },
        inputs.request,
      );
    }

    return cardRecurrence;
  },
};
