/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * CardRecurrence.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CardRecurrence:
 *       type: object
 *       required:
 *         - id
 *         - boardId
 *         - templateCardId
 *         - listId
 *         - creatorUserId
 *         - rule
 *         - timeZone
 *         - nextRunAt
 *         - createdAt
 *         - updatedAt
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier for the recurrence
 *           example: "1357158568008091264"
 *         boardId:
 *           type: string
 *           description: ID of the board of the template card
 *           example: "1357158568008091265"
 *         templateCardId:
 *           type: string
 *           description: ID of the card template new cards are made from
 *           example: "1357158568008091266"
 *         listId:
 *           type: string
 *           description: ID of the list new cards are made in
 *           example: "1357158568008091267"
 *         creatorUserId:
 *           type: string
 *           description: ID of the user who set the recurrence up; cards are made on their behalf
 *           example: "1357158568008091268"
 *         rule:
 *           type: string
 *           description: >
 *             RFC 5545 recurrence rule, without the RRULE: prefix. FREQ is DAILY, WEEKLY,
 *             MONTHLY or YEARLY, and BYHOUR and BYMINUTE take one value each (the time of
 *             day, midnight when left out). COUNT and UNTIL end the recurrence.
 *           example: FREQ=WEEKLY;BYDAY=MO,WE;BYHOUR=9;BYMINUTE=0
 *         timeZone:
 *           type: string
 *           description: IANA time zone the rule is read in
 *           example: Europe/Berlin
 *         nextRunAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: When the next card is made; null once the rule has no more occurrences
 *           example: 2024-01-01T09:00:00.000Z
 *         createdAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: When the recurrence was created
 *           example: 2024-01-01T00:00:00.000Z
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: When the recurrence was last updated
 *           example: 2024-01-01T00:00:00.000Z
 */

module.exports = {
  attributes: {
    //  ╔═╗╦═╗╦╔╦╗╦╔╦╗╦╦  ╦╔═╗╔═╗
    //  ╠═╝╠╦╝║║║║║ ║ ║╚╗╔╝║╣ ╚═╗
    //  ╩  ╩╚═╩╩ ╩╩ ╩ ╩ ╚╝ ╚═╝╚═╝

    rule: {
      type: 'string',
      required: true,
    },
    timeZone: {
      type: 'string',
      required: true,
      columnName: 'time_zone',
    },
    nextRunAt: {
      type: 'ref',
      columnName: 'next_run_at',
    },

    //  ╔═╗╔╦╗╔╗ ╔═╗╔╦╗╔═╗
    //  ║╣ ║║║╠╩╗║╣  ║║╚═╗
    //  ╚═╝╩ ╩╚═╝╚═╝═╩╝╚═╝

    //  ╔═╗╔═╗╔═╗╔═╗╔═╗╦╔═╗╔╦╗╦╔═╗╔╗╔╔═╗
    //  ╠═╣╚═╗╚═╗║ ║║  ║╠═╣ ║ ║║ ║║║║╚═╗
    //  ╩ ╩╚═╝╚═╝╚═╝╚═╝╩╩ ╩ ╩ ╩╚═╝╝╚╝╚═╝

    // Denormalization
    boardId: {
      model: 'Board',
      required: true,
      columnName: 'board_id',
    },
    templateCardId: {
      model: 'Card',
      required: true,
      columnName: 'template_card_id',
    },
    listId: {
      model: 'List',
      required: true,
      columnName: 'list_id',
    },
    creatorUserId: {
      model: 'User',
      required: true,
      columnName: 'creator_user_id',
    },
  },

  tableName: 'card_recurrence',
};
