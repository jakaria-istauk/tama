/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { TriggerTypes } = require('../../../../utils/automation');

const defaultFind = (criteria) => BoardAutomation.find(criteria).sort('id');

/* Query methods */

const createOne = (values) => BoardAutomation.create({ ...values }).fetch();

const getByBoardId = (boardId, { isEnabled } = {}) =>
  defaultFind({
    boardId,
    ...(_.isUndefined(isEnabled) ? {} : { isEnabled }),
  });

const getOneById = (id) => BoardAutomation.findOne(id);

// Takes the enabled rules triggered by passed due dates and moves how far each has looked
// to a moment, in one transaction. Rows another server instance has taken are skipped, so
// each stretch of time is checked by exactly one instance. Returns each rule with the moment
// it had looked up to before, as checkedFrom.
const claimDueChecks = (date, limit) =>
  sails.getDatastore().transaction(async (db) => {
    const queryResult = await sails
      .sendNativeQuery(
        "SELECT id FROM board_automation WHERE is_enabled = TRUE AND trigger->>'type' = $1 AND (due_checked_at IS NULL OR due_checked_at < $2) ORDER BY due_checked_at NULLS FIRST LIMIT $3 FOR UPDATE SKIP LOCKED",
        [TriggerTypes.DUE_DATE_PASSED, date.toISOString(), limit],
      )
      .usingConnection(db);

    if (queryResult.rows.length === 0) {
      return [];
    }

    const boardAutomations = await BoardAutomation.find({
      id: sails.helpers.utils.mapRecords(queryResult.rows),
    }).usingConnection(db);

    const claimedBoardAutomations = [];

    // eslint-disable-next-line no-restricted-syntax
    for (const boardAutomation of boardAutomations) {
      // eslint-disable-next-line no-await-in-loop
      const claimedBoardAutomation = await BoardAutomation.updateOne(boardAutomation.id)
        .set({
          dueCheckedAt: date.toISOString(),
        })
        .usingConnection(db);

      claimedBoardAutomations.push({
        ...claimedBoardAutomation,
        checkedFrom: boardAutomation.dueCheckedAt,
      });
    }

    return claimedBoardAutomations;
  });

const updateOne = (criteria, values) => BoardAutomation.updateOne(criteria).set({ ...values });

// eslint-disable-next-line no-underscore-dangle
const delete_ = (criteria) => BoardAutomation.destroy(criteria).fetch();

const deleteOne = (criteria) => BoardAutomation.destroyOne(criteria);

module.exports = {
  createOne,
  getByBoardId,
  getOneById,
  claimDueChecks,
  updateOne,
  deleteOne,
  delete: delete_,
};
