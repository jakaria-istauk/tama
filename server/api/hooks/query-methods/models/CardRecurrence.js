/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const defaultFind = (criteria) => CardRecurrence.find(criteria).sort('id');

/* Query methods */

const createOne = (values) => CardRecurrence.create({ ...values }).fetch();

const getByBoardId = (boardId) =>
  defaultFind({
    boardId,
  });

const getByListId = (listId) =>
  defaultFind({
    listId,
  });

const getOneById = (id) => CardRecurrence.findOne(id);

const getOneByTemplateCardId = (templateCardId) =>
  CardRecurrence.findOne({
    templateCardId,
  });

// Takes the recurrences due at a moment and moves each one to its next run, in one
// transaction. Rows another server instance has taken are skipped, so each run is claimed
// by exactly one instance; the caller then makes the cards of the claimed runs.
const claimDue = (date, limit, getNextRunAt) =>
  sails.getDatastore().transaction(async (db) => {
    const queryResult = await sails
      .sendNativeQuery(
        'SELECT id FROM card_recurrence WHERE next_run_at <= $1 ORDER BY next_run_at LIMIT $2 FOR UPDATE SKIP LOCKED',
        [date.toISOString(), limit],
      )
      .usingConnection(db);

    if (queryResult.rows.length === 0) {
      return [];
    }

    const cardRecurrences = await CardRecurrence.find({
      id: sails.helpers.utils.mapRecords(queryResult.rows),
    })
      .sort('nextRunAt')
      .usingConnection(db);

    const claimedCardRecurrences = [];

    // eslint-disable-next-line no-restricted-syntax
    for (const cardRecurrence of cardRecurrences) {
      // eslint-disable-next-line no-await-in-loop
      const claimedCardRecurrence = await CardRecurrence.updateOne(cardRecurrence.id)
        .set({
          nextRunAt: getNextRunAt(cardRecurrence),
        })
        .usingConnection(db);

      claimedCardRecurrences.push(claimedCardRecurrence);
    }

    return claimedCardRecurrences;
  });

const updateOne = (criteria, values) => CardRecurrence.updateOne(criteria).set({ ...values });

// eslint-disable-next-line no-underscore-dangle
const delete_ = (criteria) => CardRecurrence.destroy(criteria).fetch();

const deleteOne = (criteria) => CardRecurrence.destroyOne(criteria);

module.exports = {
  createOne,
  getByBoardId,
  getByListId,
  getOneById,
  getOneByTemplateCardId,
  claimDue,
  updateOne,
  deleteOne,
  delete: delete_,
};
