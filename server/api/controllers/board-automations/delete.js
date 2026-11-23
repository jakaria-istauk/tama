/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * @swagger
 * /board-automations/{id}:
 *   delete:
 *     summary: Delete board automation rule
 *     description: Removes a rule from a board. Changes it already made are kept. Requires board editor permissions.
 *     tags:
 *       - Board Automations
 *     operationId: deleteBoardAutomation
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID of the board automation rule to delete
 *         schema:
 *           type: string
 *           example: "1357158568008091264"
 *     responses:
 *       200:
 *         description: Board automation rule deleted successfully
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
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  NOT_ENOUGH_RIGHTS: {
    notEnoughRights: 'Not enough rights',
  },
  BOARD_AUTOMATION_NOT_FOUND: {
    boardAutomationNotFound: 'Board automation not found',
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
    notEnoughRights: {
      responseType: 'forbidden',
    },
    boardAutomationNotFound: {
      responseType: 'notFound',
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

    const deletedBoardAutomation = await sails.helpers.boardAutomations.deleteOne.with({
      record: boardAutomation,
      request: this.req,
    });

    if (!deletedBoardAutomation) {
      throw Errors.BOARD_AUTOMATION_NOT_FOUND;
    }

    return {
      item: deletedBoardAutomation,
    };
  },
};
