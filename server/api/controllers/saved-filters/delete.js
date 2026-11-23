/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * @swagger
 * /saved-filters/{id}:
 *   delete:
 *     summary: Delete saved filter
 *     description: Deletes a saved filter. Only its owner can delete it.
 *     tags:
 *       - Saved Filters
 *     operationId: deleteSavedFilter
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID of the saved filter to delete
 *         schema:
 *           type: string
 *           example: "1357158568008091264"
 *     responses:
 *       200:
 *         description: Saved filter deleted successfully
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
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  SAVED_FILTER_NOT_FOUND: {
    savedFilterNotFound: 'Saved filter not found',
  },
};

module.exports = {
  inputs: {
    id: {
      ...idInput,
      required: true,
    },
  },

  exits: {
    savedFilterNotFound: {
      responseType: 'notFound',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    let savedFilter = await SavedFilter.qm.getOneById(inputs.id);

    if (!savedFilter || savedFilter.userId !== currentUser.id) {
      throw Errors.SAVED_FILTER_NOT_FOUND; // Forbidden
    }

    savedFilter = await sails.helpers.savedFilters.deleteOne.with({
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
