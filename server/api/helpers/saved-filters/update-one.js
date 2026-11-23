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
    const savedFilter = await SavedFilter.qm.updateOne(inputs.record.id, inputs.values);

    if (savedFilter) {
      sails.sockets.broadcast(
        `user:${savedFilter.userId}`,
        'savedFilterUpdate',
        {
          item: savedFilter,
        },
        inputs.request,
      );
    }

    return savedFilter;
  },
};
