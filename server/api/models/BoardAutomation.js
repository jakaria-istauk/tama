/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * BoardAutomation.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     BoardAutomationTrigger:
 *       type: object
 *       required:
 *         - type
 *       description: >
 *         What starts the rule. cardCreated takes an optional listId (null for any list),
 *         cardMoved a listId, labelAdded a labelId; dueDatePassed and allTasksCompleted take
 *         nothing else.
 *       properties:
 *         type:
 *           type: string
 *           enum: [cardCreated, cardMoved, labelAdded, dueDatePassed, allTasksCompleted]
 *           example: cardMoved
 *         listId:
 *           type: string
 *           nullable: true
 *           example: "1357158568008091265"
 *         labelId:
 *           type: string
 *           example: "1357158568008091266"
 *     BoardAutomationAction:
 *       type: object
 *       required:
 *         - type
 *       description: >
 *         What the rule does to the card. moveCard takes a listId, addLabel and removeLabel a
 *         labelId, addMember and removeMember a userId, setDueDate days from now (0-365),
 *         postComment a text; clearDueDate and completeDueDate take nothing else.
 *       properties:
 *         type:
 *           type: string
 *           enum: [moveCard, addLabel, removeLabel, addMember, removeMember, setDueDate, clearDueDate, completeDueDate, postComment]
 *           example: addLabel
 *         listId:
 *           type: string
 *           example: "1357158568008091265"
 *         labelId:
 *           type: string
 *           example: "1357158568008091266"
 *         userId:
 *           type: string
 *           example: "1357158568008091267"
 *         days:
 *           type: integer
 *           minimum: 0
 *           maximum: 365
 *           example: 3
 *         text:
 *           type: string
 *           maxLength: 10000
 *           example: Ready for review
 *     BoardAutomation:
 *       type: object
 *       required:
 *         - id
 *         - boardId
 *         - creatorUserId
 *         - name
 *         - trigger
 *         - actions
 *         - isEnabled
 *         - createdAt
 *         - updatedAt
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier for the automation rule
 *           example: "1357158568008091264"
 *         boardId:
 *           type: string
 *           description: ID of the board the rule belongs to
 *           example: "1357158568008091265"
 *         creatorUserId:
 *           type: string
 *           description: ID of the user who set the rule up; its actions run on their behalf
 *           example: "1357158568008091268"
 *         name:
 *           type: string
 *           description: Name of the rule, shown in the activity of the cards it changes
 *           example: Label cards moved to Review
 *         trigger:
 *           $ref: '#/components/schemas/BoardAutomationTrigger'
 *         actions:
 *           type: array
 *           minItems: 1
 *           maxItems: 10
 *           description: Actions run in order on the card the trigger happened to
 *           items:
 *             $ref: '#/components/schemas/BoardAutomationAction'
 *         isEnabled:
 *           type: boolean
 *           description: Whether the rule runs
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: When the rule was created
 *           example: 2024-01-01T00:00:00.000Z
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: When the rule was last updated
 *           example: 2024-01-01T00:00:00.000Z
 */

module.exports = {
  attributes: {
    //  ╔═╗╦═╗╦╔╦╗╦╔╦╗╦╦  ╦╔═╗╔═╗
    //  ╠═╝╠╦╝║║║║║ ║ ║╚╗╔╝║╣ ╚═╗
    //  ╩  ╩╚═╩╩ ╩╩ ╩ ╩ ╚╝ ╚═╝╚═╝

    name: {
      type: 'string',
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
      required: true,
      columnName: 'is_enabled',
    },
    dueCheckedAt: {
      type: 'ref',
      columnName: 'due_checked_at',
    },

    //  ╔═╗╔╦╗╔╗ ╔═╗╔╦╗╔═╗
    //  ║╣ ║║║╠╩╗║╣  ║║╚═╗
    //  ╚═╝╩ ╩╚═╝╚═╝═╩╝╚═╝

    //  ╔═╗╔═╗╔═╗╔═╗╔═╗╦╔═╗╔╦╗╦╔═╗╔╗╔╔═╗
    //  ╠═╣╚═╗╚═╗║ ║║  ║╠═╣ ║ ║║ ║║║║╚═╗
    //  ╩ ╩╚═╝╚═╝╚═╝╚═╝╩╩ ╩ ╩ ╩╚═╝╝╚╝╚═╝

    boardId: {
      model: 'Board',
      required: true,
      columnName: 'board_id',
    },
    creatorUserId: {
      model: 'User',
      required: true,
      columnName: 'creator_user_id',
    },
  },

  tableName: 'board_automation',

  // How far the due date check has got is internal to the automation hook
  customToJSON() {
    return _.omit(this, ['dueCheckedAt']);
  },
};
