/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * SavedFilter.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     SavedFilter:
 *       type: object
 *       required:
 *         - id
 *         - boardId
 *         - userId
 *         - name
 *         - filter
 *         - createdAt
 *         - updatedAt
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier for the saved filter
 *           example: "1357158568008091264"
 *         boardId:
 *           type: string
 *           description: ID of the board the filter applies to
 *           example: "1357158568008091265"
 *         userId:
 *           type: string
 *           description: ID of the user who owns the filter
 *           example: "1357158568008091266"
 *         name:
 *           type: string
 *           description: Name of the saved filter
 *           example: Due this week
 *         filter:
 *           $ref: '#/components/schemas/SavedFilterValue'
 *         createdAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: When the saved filter was created
 *           example: 2024-01-01T00:00:00.000Z
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: When the saved filter was last updated
 *           example: 2024-01-01T00:00:00.000Z
 *     SavedFilterValue:
 *       type: object
 *       description: What the filter matches. Every field is optional.
 *       properties:
 *         userIds:
 *           type: array
 *           items:
 *             type: string
 *           description: Cards with any of these members (or task assignees)
 *         creatorUserIds:
 *           type: array
 *           items:
 *             type: string
 *           description: Cards created by any of these users
 *         labelIds:
 *           type: array
 *           items:
 *             type: string
 *         excludedLabelIds:
 *           type: array
 *           items:
 *             type: string
 *         listIds:
 *           type: array
 *           items:
 *             type: string
 *         noMember:
 *           type: boolean
 *         search:
 *           type: string
 *         due:
 *           type: object
 *           nullable: true
 *           required:
 *             - range
 *           properties:
 *             range:
 *               type: string
 *               enum: [today, thisWeek, next7Days, thisMonth, next30Days, custom]
 *               description: >
 *                 Relative ranges are worked out when the filter is applied, so a saved
 *                 "this week" always means the current week. thisWeek runs Sunday to Saturday.
 *             from:
 *               type: string
 *               format: date
 *               description: First day of a custom range
 *             to:
 *               type: string
 *               format: date
 *               description: Last day of a custom range
 */

const DueRanges = {
  TODAY: 'today',
  THIS_WEEK: 'thisWeek',
  NEXT_7_DAYS: 'next7Days',
  THIS_MONTH: 'thisMonth',
  NEXT_30_DAYS: 'next30Days',
  CUSTOM: 'custom',
};

const MAX_NAME_LENGTH = 64;
const MAX_PER_BOARD = 50;

module.exports = {
  DueRanges,
  MAX_NAME_LENGTH,
  MAX_PER_BOARD,

  attributes: {
    //  ╔═╗╦═╗╦╔╦╗╦╔╦╗╦╦  ╦╔═╗╔═╗
    //  ╠═╝╠╦╝║║║║║ ║ ║╚╗╔╝║╣ ╚═╗
    //  ╩  ╩╚═╩╩ ╩╩ ╩ ╩ ╚╝ ╚═╝╚═╝

    name: {
      type: 'string',
      required: true,
    },
    filter: {
      type: 'json',
      required: true,
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
    userId: {
      model: 'User',
      required: true,
      columnName: 'user_id',
    },
  },

  tableName: 'saved_filter',
};
