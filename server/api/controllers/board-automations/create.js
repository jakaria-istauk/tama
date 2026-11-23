/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * @swagger
 * /boards/{boardId}/board-automations:
 *   post:
 *     summary: Create board automation rule
 *     description: Adds a "when this happens, do that" rule to a board. When its trigger happens to a card, its actions run on that card on behalf of the user who last set the rule up, while that user can edit the board. A board has at most 50 rules. Requires board editor permissions.
 *     tags:
 *       - Board Automations
 *     operationId: createBoardAutomation
 *     parameters:
 *       - name: boardId
 *         in: path
 *         required: true
 *         description: ID of the board to add the rule to
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
 *               - trigger
 *               - actions
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 128
 *                 description: Name of the rule
 *                 example: Label cards moved to Review
 *               trigger:
 *                 $ref: '#/components/schemas/BoardAutomationTrigger'
 *               actions:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 10
 *                 items:
 *                   $ref: '#/components/schemas/BoardAutomationAction'
 *               isEnabled:
 *                 type: boolean
 *                 default: true
 *                 description: Whether the rule runs
 *     responses:
 *       200:
 *         description: Board automation rule created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - item
 *               properties:
 *                 item:
 *                   $ref: '#/components/schemas/BoardAutomation'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       422:
 *         $ref: '#/components/responses/UnprocessableEntity'
 */

const { idInput } = require('../../../utils/inputs');
const { normalizeTrigger, normalizeActions } = require('../../../utils/automation');

const MAX_PER_BOARD = 50;

const Errors = {
  NOT_ENOUGH_RIGHTS: {
    notEnoughRights: 'Not enough rights',
  },
  BOARD_NOT_FOUND: {
    boardNotFound: 'Board not found',
  },
  LIST_NOT_FOUND: {
    listNotFound: 'List not found',
  },
  LABEL_NOT_FOUND: {
    labelNotFound: 'Label not found',
  },
  USER_NOT_FOUND: {
    userNotFound: 'User not found',
  },
  INVALID_TRIGGER: {
    invalidTrigger: 'Invalid trigger',
  },
  INVALID_ACTIONS: {
    invalidActions: 'Invalid actions',
  },
  TOO_MANY_BOARD_AUTOMATIONS: {
    tooManyBoardAutomations: 'Too many board automations',
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
      maxLength: 128,
      required: true,
    },
    trigger: {
      type: 'json',
      required: true,
    },
    actions: {
      type: 'json',
      required: true,
    },
    isEnabled: {
      type: 'boolean',
    },
  },

  exits: {
    notEnoughRights: {
      responseType: 'forbidden',
    },
    boardNotFound: {
      responseType: 'notFound',
    },
    listNotFound: {
      responseType: 'notFound',
    },
    labelNotFound: {
      responseType: 'notFound',
    },
    userNotFound: {
      responseType: 'notFound',
    },
    invalidTrigger: {
      responseType: 'unprocessableEntity',
    },
    invalidActions: {
      responseType: 'unprocessableEntity',
    },
    tooManyBoardAutomations: {
      responseType: 'unprocessableEntity',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const board = await Board.qm.getOneById(inputs.boardId);

    if (!board) {
      throw Errors.BOARD_NOT_FOUND;
    }

    const boardMembership = await BoardMembership.qm.getOneByBoardIdAndUserId(
      board.id,
      currentUser.id,
    );

    if (!boardMembership) {
      throw Errors.BOARD_NOT_FOUND; // Forbidden
    }

    if (boardMembership.role !== BoardMembership.Roles.EDITOR) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    const trigger = normalizeTrigger(inputs.trigger);

    if (!trigger) {
      throw Errors.INVALID_TRIGGER;
    }

    const actions = normalizeActions(inputs.actions);

    if (!actions) {
      throw Errors.INVALID_ACTIONS;
    }

    await sails.helpers.boardAutomations.checkReferences
      .with({
        trigger,
        actions,
        boardId: board.id,
      })
      .intercept('listNotFound', () => Errors.LIST_NOT_FOUND)
      .intercept('labelNotFound', () => Errors.LABEL_NOT_FOUND)
      .intercept('userNotFound', () => Errors.USER_NOT_FOUND);

    const boardAutomations = await BoardAutomation.qm.getByBoardId(board.id);

    if (boardAutomations.length >= MAX_PER_BOARD) {
      throw Errors.TOO_MANY_BOARD_AUTOMATIONS;
    }

    const boardAutomation = await sails.helpers.boardAutomations.createOne.with({
      values: {
        board,
        trigger,
        actions,
        name: inputs.name.trim(),
        isEnabled: _.isUndefined(inputs.isEnabled) ? true : inputs.isEnabled,
        creatorUser: currentUser,
      },
      request: this.req,
    });

    return {
      item: boardAutomation,
    };
  },
};
