/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * @swagger
 * /card-recurrences/{id}:
 *   patch:
 *     summary: Update card recurrence
 *     description: Changes the schedule or list of a card recurrence. The user who changes it becomes the one cards are made on behalf of. Requires board editor permissions.
 *     tags:
 *       - Card Recurrences
 *     operationId: updateCardRecurrence
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID of the card recurrence to update
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
 *               listId:
 *                 type: string
 *                 description: ID of the list on the template's board to make cards in (an active or closed list)
 *                 example: "1357158568008091265"
 *               rule:
 *                 type: string
 *                 maxLength: 512
 *                 description: RFC 5545 recurrence rule, see the CardRecurrence schema
 *                 example: FREQ=MONTHLY;BYMONTHDAY=1;BYHOUR=9;BYMINUTE=0
 *               timeZone:
 *                 type: string
 *                 description: IANA time zone the rule is read in
 *                 example: Europe/Berlin
 *     responses:
 *       200:
 *         description: Card recurrence updated successfully
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
 *       422:
 *         $ref: '#/components/responses/UnprocessableEntity'
 */

const { idInput } = require('../../../utils/inputs');
const { isTimeZone, normalizeRule } = require('../../../utils/recurrence');

const Errors = {
  NOT_ENOUGH_RIGHTS: {
    notEnoughRights: 'Not enough rights',
  },
  CARD_RECURRENCE_NOT_FOUND: {
    cardRecurrenceNotFound: 'Card recurrence not found',
  },
  LIST_NOT_FOUND: {
    listNotFound: 'List not found',
  },
  INVALID_RULE: {
    invalidRule: 'Invalid rule',
  },
  INVALID_TIME_ZONE: {
    invalidTimeZone: 'Invalid time zone',
  },
  NO_OCCURRENCES: {
    noOccurrences: 'Rule has no upcoming occurrences',
  },
};

module.exports = {
  inputs: {
    id: {
      ...idInput,
      required: true,
    },
    listId: idInput,
    rule: {
      type: 'string',
      maxLength: 512,
    },
    timeZone: {
      type: 'string',
      maxLength: 64,
    },
  },

  exits: {
    notEnoughRights: {
      responseType: 'forbidden',
    },
    cardRecurrenceNotFound: {
      responseType: 'notFound',
    },
    listNotFound: {
      responseType: 'notFound',
    },
    invalidRule: {
      responseType: 'unprocessableEntity',
    },
    invalidTimeZone: {
      responseType: 'unprocessableEntity',
    },
    noOccurrences: {
      responseType: 'unprocessableEntity',
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

    const values = {
      creatorUserId: currentUser.id,
    };

    if (!_.isUndefined(inputs.listId)) {
      const list = await List.qm.getOneById(inputs.listId, {
        boardId: cardRecurrence.boardId,
      });

      if (!list || !sails.helpers.lists.isFinite(list)) {
        throw Errors.LIST_NOT_FOUND;
      }

      values.list = list;
    }

    if (!_.isUndefined(inputs.rule)) {
      values.rule = normalizeRule(inputs.rule);

      if (!values.rule) {
        throw Errors.INVALID_RULE;
      }
    }

    if (!_.isUndefined(inputs.timeZone)) {
      if (!isTimeZone(inputs.timeZone)) {
        throw Errors.INVALID_TIME_ZONE;
      }

      values.timeZone = inputs.timeZone;
    }

    const nextCardRecurrence = await sails.helpers.cardRecurrences.updateOne
      .with({
        values,
        record: cardRecurrence,
        request: this.req,
      })
      .intercept('noOccurrences', () => Errors.NO_OCCURRENCES);

    if (!nextCardRecurrence) {
      throw Errors.CARD_RECURRENCE_NOT_FOUND;
    }

    return {
      item: nextCardRecurrence,
    };
  },
};
