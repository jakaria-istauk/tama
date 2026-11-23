/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * @swagger
 * /cards/{cardId}/card-recurrence:
 *   post:
 *     summary: Create card recurrence
 *     description: Makes a card template recurring, so a card is made from it on a schedule. A template has at most one recurrence. Cards are made on behalf of the user who last set the recurrence up, while that user can edit the board. Requires board editor permissions.
 *     tags:
 *       - Card Recurrences
 *     operationId: createCardRecurrence
 *     parameters:
 *       - name: cardId
 *         in: path
 *         required: true
 *         description: ID of the card template
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
 *               - listId
 *               - rule
 *               - timeZone
 *             properties:
 *               listId:
 *                 type: string
 *                 description: ID of the list on the template's board to make cards in (an active or closed list)
 *                 example: "1357158568008091265"
 *               rule:
 *                 type: string
 *                 maxLength: 512
 *                 description: RFC 5545 recurrence rule, see the CardRecurrence schema
 *                 example: FREQ=WEEKLY;BYDAY=MO,WE;BYHOUR=9;BYMINUTE=0
 *               timeZone:
 *                 type: string
 *                 description: IANA time zone the rule is read in
 *                 example: Europe/Berlin
 *     responses:
 *       200:
 *         description: Card recurrence created successfully
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
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       422:
 *         $ref: '#/components/responses/UnprocessableEntity'
 */

const { idInput } = require('../../../utils/inputs');
const { isTimeZone, normalizeRule } = require('../../../utils/recurrence');

const Errors = {
  NOT_ENOUGH_RIGHTS: {
    notEnoughRights: 'Not enough rights',
  },
  CARD_TEMPLATE_NOT_FOUND: {
    cardTemplateNotFound: 'Card template not found',
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
  ALREADY_EXISTS: {
    cardRecurrenceAlreadyExists: 'Card recurrence already exists',
  },
};

module.exports = {
  inputs: {
    cardId: {
      ...idInput,
      required: true,
    },
    listId: {
      ...idInput,
      required: true,
    },
    rule: {
      type: 'string',
      maxLength: 512,
      required: true,
    },
    timeZone: {
      type: 'string',
      maxLength: 64,
      required: true,
    },
  },

  exits: {
    notEnoughRights: {
      responseType: 'forbidden',
    },
    cardTemplateNotFound: {
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
    cardRecurrenceAlreadyExists: {
      responseType: 'conflict',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const { card, board } = await sails.helpers.cards
      .getPathToProjectById(inputs.cardId)
      .intercept('pathNotFound', () => Errors.CARD_TEMPLATE_NOT_FOUND);

    const boardMembership = await BoardMembership.qm.getOneByBoardIdAndUserId(
      board.id,
      currentUser.id,
    );

    if (!boardMembership) {
      throw Errors.CARD_TEMPLATE_NOT_FOUND; // Forbidden
    }

    if (boardMembership.role !== BoardMembership.Roles.EDITOR) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    if (!card.isTemplate) {
      throw Errors.CARD_TEMPLATE_NOT_FOUND;
    }

    const list = await List.qm.getOneById(inputs.listId, {
      boardId: board.id,
    });

    if (!list || !sails.helpers.lists.isFinite(list)) {
      throw Errors.LIST_NOT_FOUND;
    }

    const rule = normalizeRule(inputs.rule);

    if (!rule) {
      throw Errors.INVALID_RULE;
    }

    if (!isTimeZone(inputs.timeZone)) {
      throw Errors.INVALID_TIME_ZONE;
    }

    const cardRecurrence = await sails.helpers.cardRecurrences.createOne
      .with({
        values: {
          rule,
          list,
          templateCard: card,
          timeZone: inputs.timeZone,
          creatorUser: currentUser,
        },
        request: this.req,
      })
      .intercept('noOccurrences', () => Errors.NO_OCCURRENCES)
      .intercept('alreadyExists', () => Errors.ALREADY_EXISTS);

    return {
      item: cardRecurrence,
    };
  },
};
