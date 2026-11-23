/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * @swagger
 * /boards/{boardId}/saved-filters:
 *   post:
 *     summary: Create saved filter
 *     description: Saves a named filter on a board for the current user. Requires access to the board.
 *     tags:
 *       - Saved Filters
 *     operationId: createSavedFilter
 *     parameters:
 *       - name: boardId
 *         in: path
 *         required: true
 *         description: ID of the board to save the filter on
 *         schema:
 *           type: string
 *           example: "1357158568008091264"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - filter
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
 *         description: Saved filter created successfully
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
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       422:
 *         $ref: '#/components/responses/UnprocessableEntity'
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  BOARD_NOT_FOUND: {
    boardNotFound: 'Board not found',
  },
  INVALID_FILTER: {
    invalidFilter: 'Invalid filter',
  },
  LIMIT_REACHED: {
    limitReached: 'Limit reached',
  },
};

module.exports = {
  inputs: {
    boardId: {
      ...idInput,
      required: true,
    },
    name: {
      type: 'string',
      isNotEmptyString: true,
      maxLength: SavedFilter.MAX_NAME_LENGTH,
      required: true,
    },
    filter: {
      type: 'json',
      required: true,
    },
  },

  exits: {
    boardNotFound: {
      responseType: 'notFound',
    },
    invalidFilter: {
      responseType: 'unprocessableEntity',
    },
    limitReached: {
      responseType: 'conflict',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const { board, project } = await sails.helpers.boards
      .getPathToProjectById(inputs.boardId)
      .intercept('pathNotFound', () => Errors.BOARD_NOT_FOUND);

    // Same reach as reading the board: a filter is only worth saving where the
    // user can see the cards it filters.
    if (currentUser.role !== User.Roles.ADMIN || project.ownerProjectManagerId) {
      const isProjectManager = await sails.helpers.users.isProjectManager(
        currentUser.id,
        project.id,
      );

      if (!isProjectManager) {
        const boardMembership = await BoardMembership.qm.getOneByBoardIdAndUserId(
          board.id,
          currentUser.id,
        );

        if (!boardMembership) {
          throw Errors.BOARD_NOT_FOUND; // Forbidden
        }
      }
    }

    const filter = sails.helpers.savedFilters.normalizeFilter(inputs.filter);

    if (!filter) {
      throw Errors.INVALID_FILTER;
    }

    const savedFilter = await sails.helpers.savedFilters.createOne
      .with({
        values: {
          board,
          filter,
          name: inputs.name.trim(),
          user: currentUser,
        },
        request: this.req,
      })
      .intercept('limitReached', () => Errors.LIMIT_REACHED);

    return {
      item: savedFilter,
    };
  },
};
