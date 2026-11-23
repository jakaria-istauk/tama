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
  updateOne,
  deleteOne,
  delete: delete_,
};
