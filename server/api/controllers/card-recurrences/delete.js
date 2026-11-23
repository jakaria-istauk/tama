/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * @swagger
 * /card-recurrences/{id}:
 *   delete:
 *     summary: Delete card recurrence
 *     description: Stops a card template from recurring. Cards already made are kept. Requires board editor permissions.
 *     tags:
 *       - Card Recurrences
 *     operationId: deleteCardRecurrence
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID of the card recurrence to delete
 *         schema:
 *           type: string
 *           example: "1357158568008091264"
 *     responses:
 *       200:
 *         description: Card recurrence deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - item
 *               properties:
 *                 item:
 *                   $ref: '#/components/schemas/CardRecurrence'
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
  CARD_RECURRENCE_NOT_FOUND: {
    cardRecurrenceNotFound: 'Card recurrence not found',
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
    cardRecurrenceNotFound: {
      responseType: 'notFound',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const cardRecurrence = await CardRecurrence.qm.getOneById(inputs.id);

    if (!cardRecurrence) {
      throw Errors.CARD_RECURRENCE_NOT_FOUND;
    }

    const boardMembership = await BoardMembership.qm.getOneByBoardIdAndUserId(
      cardRecurrence.boardId,
      currentUser.id,
    );

    if (!boardMembership) {
      throw Errors.CARD_RECURRENCE_NOT_FOUND; // Forbidden
    }

    if (boardMembership.role !== BoardMembership.Roles.EDITOR) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    const deletedCardRecurrence = await sails.helpers.cardRecurrences.deleteOne.with({
      record: cardRecurrence,
      request: this.req,
    });

    if (!deletedCardRecurrence) {
      throw Errors.CARD_RECURRENCE_NOT_FOUND;
    }

    return {
      item: deletedCardRecurrence,
    };
  },
};
