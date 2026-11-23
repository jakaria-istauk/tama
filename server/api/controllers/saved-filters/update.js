/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * @swagger
 * /saved-filters/{id}:
 *   patch:
 *     summary: Update saved filter
 *     description: Renames a saved filter or replaces what it filters by. Only its owner can update it.
 *     tags:
 *       - Saved Filters
 *     operationId: updateSavedFilter
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID of the saved filter to update
 *         schema:
 *           type: string
 *           example: "1357158568008091264"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 64
 *                 description: Name of the saved filter
 *                 example: Due this week
 *               filter:
 *                 $ref: '#/components/schemas/SavedFilterValue'
 *     responses:
 *       200:
 *         description: Saved filter updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - item
 *               properties:
 *                 item:
 *                   $ref: '#/components/schemas/SavedFilter'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       422:
 *         $ref: '#/components/responses/UnprocessableEntity'
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  SAVED_FILTER_NOT_FOUND: {
    savedFilterNotFound: 'Saved filter not found',
  },
  INVALID_FILTER: {
    invalidFilter: 'Invalid filter',
  },
};

module.exports = {
  inputs: {
    id: {
      ...idInput,
      required: true,
    },
    name: {
      type: 'string',
      isNotEmptyString: true,
      maxLength: SavedFilter.MAX_NAME_LENGTH,
    },
    filter: {
      type: 'json',
    },
  },

  exits: {
    savedFilterNotFound: {
      responseType: 'notFound',
    },
    invalidFilter: {
      responseType: 'unprocessableEntity',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    let savedFilter = await SavedFilter.qm.getOneById(inputs.id);

    if (!savedFilter || savedFilter.userId !== currentUser.id) {
      throw Errors.SAVED_FILTER_NOT_FOUND; // Forbidden
    }

    const values = {};

    if (!_.isUndefined(inputs.name)) {
      values.name = inputs.name.trim();
    }

    if (!_.isUndefined(inputs.filter)) {
      values.filter = sails.helpers.savedFilters.normalizeFilter(inputs.filter);

      if (!values.filter) {
        throw Errors.INVALID_FILTER;
      }
    }

    savedFilter = await sails.helpers.savedFilters.updateOne.with({
      values,
      record: savedFilter,
      request: this.req,
    });

    if (!savedFilter) {
      throw Errors.SAVED_FILTER_NOT_FOUND;
    }

    return {
      item: savedFilter,
    };
  },
};
