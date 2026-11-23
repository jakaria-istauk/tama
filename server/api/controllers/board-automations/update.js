/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * @swagger
 * /board-automations/{id}:
 *   patch:
 *     summary: Update board automation rule
 *     description: Changes the name, trigger or actions of a board automation rule, or turns it on or off. The user who changes it becomes the one its actions run on behalf of. Requires board editor permissions.
 *     tags:
 *       - Board Automations
 *     operationId: updateBoardAutomation
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID of the board automation rule to update
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
 *                 description: Whether the rule runs
 *     responses:
 *       200:
 *         description: Board automation rule updated successfully
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

const Errors = {
  NOT_ENOUGH_RIGHTS: {
    notEnoughRights: 'Not enough rights',
  },
  BOARD_AUTOMATION_NOT_FOUND: {
    boardAutomationNotFound: 'Board automation not found',
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
      maxLength: 128,
    },
    trigger: {
      type: 'json',
    },
    actions: {
      type: 'json',
    },
    isEnabled: {
      type: 'boolean',
    },
  },

  exits: {
    notEnoughRights: {
      responseType: 'forbidden',
    },
    boardAutomationNotFound: {
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
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const boardAutomation = await BoardAutomation.qm.getOneById(inputs.id);

    if (!boardAutomation) {
      throw Errors.BOARD_AUTOMATION_NOT_FOUND;
    }

    const boardMembership = await BoardMembership.qm.getOneByBoardIdAndUserId(
      boardAutomation.boardId,
      currentUser.id,
    );

    if (!boardMembership) {
      throw Errors.BOARD_AUTOMATION_NOT_FOUND; // Forbidden
    }

    if (boardMembership.role !== BoardMembership.Roles.EDITOR) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    const values = {
      creatorUser: currentUser,
    };

    if (!_.isUndefined(inputs.name)) {
      values.name = inputs.name.trim();
    }

    if (!_.isUndefined(inputs.isEnabled)) {
      values.isEnabled = inputs.isEnabled;
    }

    if (!_.isUndefined(inputs.trigger)) {
      values.trigger = normalizeTrigger(inputs.trigger);

      if (!values.trigger) {
        throw Errors.INVALID_TRIGGER;
      }
    }

    if (!_.isUndefined(inputs.actions)) {
      values.actions = normalizeActions(inputs.actions);

      if (!values.actions) {
        throw Errors.INVALID_ACTIONS;
      }
    }

    if (values.trigger || values.actions) {
      await sails.helpers.boardAutomations.checkReferences
        .with({
          boardId: boardAutomation.boardId,
          trigger: values.trigger || boardAutomation.trigger,
          actions: values.actions || boardAutomation.actions,
        })
        .intercept('listNotFound', () => Errors.LIST_NOT_FOUND)
        .intercept('labelNotFound', () => Errors.LABEL_NOT_FOUND)
        .intercept('userNotFound', () => Errors.USER_NOT_FOUND);
    }

    const nextBoardAutomation = await sails.helpers.boardAutomations.updateOne.with({
      values,
      record: boardAutomation,
      request: this.req,
    });

    if (!nextBoardAutomation) {
      throw Errors.BOARD_AUTOMATION_NOT_FOUND;
    }

    return {
      item: nextBoardAutomation,
    };
  },
};
