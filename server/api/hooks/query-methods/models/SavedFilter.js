/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const defaultFind = (criteria) => SavedFilter.find(criteria).sort('id');

/* Query methods */

const createOne = (values) => SavedFilter.create({ ...values }).fetch();

const getByUserId = (userId) =>
  defaultFind({
    userId,
  });

const getByBoardIdAndUserId = (boardId, userId) =>
  defaultFind({
    boardId,
    userId,
  });

const getOneById = (id) => SavedFilter.findOne(id);

const updateOne = (criteria, values) => SavedFilter.updateOne(criteria).set({ ...values });

// eslint-disable-next-line no-underscore-dangle
const delete_ = (criteria) => SavedFilter.destroy(criteria).fetch();

const deleteOne = (criteria) => SavedFilter.destroyOne(criteria);

module.exports = {
  createOne,
  getByUserId,
  getByBoardIdAndUserId,
  getOneById,
  updateOne,
  deleteOne,
  delete: delete_,
};
