/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * MCP tools. Each one runs the REST controller action behind it through `runAction`, so it
 * validates inputs and checks permissions exactly like the matching HTTP route does.
 */

const { z } = require('zod');

const { POSITION_GAP } = require('../../constants');
const { ID_REGEX } = require('../validators');
const { ActionError, runAction } = require('./run-action');

const DEFAULT_TASK_LIST_NAME = 'Tasks';

const id = (description) => z.string().regex(ID_REGEX).describe(description);

const getEndPosition = (records) =>
  records.length > 0 ? records[records.length - 1].position + POSITION_GAP : POSITION_GAP;

const getCardEndPosition = async (listId) => {
  const list = await List.qm.getOneById(listId);

  if (!list || !sails.helpers.lists.isFinite(list)) {
    return undefined;
  }

  const cards = await Card.qm.getByListId(list.id);
  return getEndPosition(cards);
};

const matchesSearch = (card, search) => {
  const text = `${card.name}\n${card.description || ''}`.toLowerCase();

  return search
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => text.includes(term));
};

const pickCardRelations = (cards, included) => {
  const cardIdsSet = new Set(sails.helpers.utils.mapRecords(cards));

  return {
    cards,
    cardLabels: included.cardLabels.filter(({ cardId }) => cardIdsSet.has(cardId)),
    cardMemberships: included.cardMemberships.filter(({ cardId }) => cardIdsSet.has(cardId)),
  };
};

// Board responses only carry cards of finite lists (active, closed); cards of endless lists
// (archive, trash) are paged through `cards/index`
// Templates are hidden like they are in the board views, unless asked for
const getCards = async ({ boardId, listId, search, includeTemplates }, req) => {
  const { included } = await runAction('boards/show', { id: boardId }, req);

  if (listId) {
    const list = included.lists.find(({ id: listItemId }) => listItemId === listId);

    if (!list) {
      throw new ActionError('listNotFound', 'List not found');
    }

    if (!sails.helpers.lists.isFinite(list)) {
      const { items, included: cardsIncluded } = await runAction(
        'cards/index',
        { listId, search },
        req,
      );

      return pickCardRelations(
        items.filter((card) => includeTemplates || !card.isTemplate),
        cardsIncluded,
      );
    }
  }

  let cards = included.cards.filter(
    (card) => (!listId || card.listId === listId) && (includeTemplates || !card.isTemplate),
  );

  if (search) {
    cards = cards.filter((card) => matchesSearch(card, search));
  }

  return pickCardRelations(cards, included);
};

const getTaskListIdForCard = async (cardId, taskListId, req) => {
  if (taskListId) {
    const taskList = await TaskList.qm.getOneById(taskListId, {
      cardId,
    });

    if (!taskList) {
      throw new ActionError('taskListNotFound', 'Task list not found');
    }

    return taskList.id;
  }

  const taskLists = await TaskList.qm.getByCardId(cardId);

  if (taskLists.length > 0) {
    return taskLists[0].id;
  }

  const { item } = await runAction(
    'task-lists/create',
    {
      cardId,
      position: POSITION_GAP,
      name: DEFAULT_TASK_LIST_NAME,
    },
    req,
  );

  return item.id;
};

const READ_ONLY = {
  readOnlyHint: true,
};

const DESTRUCTIVE = {
  readOnlyHint: false,
  destructiveHint: true,
};

const WRITE = {
  readOnlyHint: false,
  destructiveHint: false,
};

module.exports = [
  {
    name: 'list_projects',
    description: 'List the projects the current user can access, with their boards.',
    annotations: READ_ONLY,
    inputSchema: {},
    async handler(inputs, req) {
      const { items, included } = await runAction('projects/index', {}, req);

      return {
        projects: items,
        boards: included.boards,
      };
    },
  },
  {
    name: 'get_project',
    description: 'Get a project with its boards, managers and board memberships.',
    annotations: READ_ONLY,
    inputSchema: {
      projectId: id('Project ID'),
    },
    handler: (inputs, req) => runAction('projects/show', { id: inputs.projectId }, req),
  },
  {
    name: 'list_boards',
    description: 'List the boards the current user can access, optionally in one project.',
    annotations: READ_ONLY,
    inputSchema: {
      projectId: id('Only boards of this project').optional(),
    },
    async handler(inputs, req) {
      const { included } = await runAction('projects/index', {}, req);

      return {
        boards: inputs.projectId
          ? included.boards.filter((board) => board.projectId === inputs.projectId)
          : included.boards,
      };
    },
  },
  {
    name: 'get_board',
    description: 'Get a board with its lists, labels and members. Use list_cards for its cards.',
    annotations: READ_ONLY,
    inputSchema: {
      boardId: id('Board ID'),
    },
    async handler(inputs, req) {
      const { item, included } = await runAction('boards/show', { id: inputs.boardId }, req);

      return {
        board: item,
        lists: included.lists,
        labels: included.labels,
        boardMemberships: included.boardMemberships,
        users: included.users,
      };
    },
  },
  {
    name: 'list_cards',
    description:
      'List the cards of a board, or of one list on it, with their labels and members. Archive and trash lists return their latest cards. Card templates are left out unless includeTemplates is set.',
    annotations: READ_ONLY,
    inputSchema: {
      boardId: id('Board ID'),
      listId: id('Only cards of this list').optional(),
      includeTemplates: z.boolean().optional().describe('Also list card templates'),
    },
    handler: (inputs, req) => getCards(inputs, req),
  },
  {
    name: 'get_card',
    description:
      'Get a card with its labels, members, task lists, tasks, attachments and custom fields.',
    annotations: READ_ONLY,
    inputSchema: {
      cardId: id('Card ID'),
    },
    handler: (inputs, req) => runAction('cards/show', { id: inputs.cardId }, req),
  },
  {
    name: 'search_cards',
    description:
      'Search the cards of a board by words in their name or description, optionally in one list. Card templates are left out unless includeTemplates is set.',
    annotations: READ_ONLY,
    inputSchema: {
      boardId: id('Board ID'),
      query: z.string().trim().min(1).max(128).describe('Words that must all appear'),
      listId: id('Only cards of this list').optional(),
      includeTemplates: z.boolean().optional().describe('Also search card templates'),
    },
    handler: (inputs, req) =>
      getCards(
        {
          boardId: inputs.boardId,
          listId: inputs.listId,
          search: inputs.query,
          includeTemplates: inputs.includeTemplates,
        },
        req,
      ),
  },
  {
    name: 'create_card',
    description:
      'Create a card in a list. It goes to the end of the list unless a position is set.',
    annotations: WRITE,
    inputSchema: {
      listId: id('List ID'),
      name: z.string().min(1).max(1024),
      description: z.string().min(1).max(1048576).optional().describe('Markdown'),
      type: z.enum(Object.values(Card.Types)).default(Card.Types.PROJECT),
      position: z.number().min(0).optional(),
      dueDate: z.iso.datetime({ offset: true }).optional(),
    },
    async handler(inputs, req) {
      const position = _.isUndefined(inputs.position)
        ? await getCardEndPosition(inputs.listId)
        : inputs.position;

      return runAction(
        'cards/create',
        {
          ...inputs,
          position,
        },
        req,
      );
    },
  },
  {
    name: 'list_card_templates',
    description:
      'List the card templates of a board, with the schedules of recurring ones. Use create_card_from_template to make a card from one.',
    annotations: READ_ONLY,
    inputSchema: {
      boardId: id('Board ID'),
    },
    async handler(inputs, req) {
      const { included } = await runAction('boards/show', { id: inputs.boardId }, req);

      const templates = included.cards.filter((card) => card.isTemplate);

      return {
        ...pickCardRelations(templates, included),
        cardRecurrences: included.cardRecurrences,
      };
    },
  },
  {
    name: 'create_card_from_template',
    description:
      'Create a card in a list from a card template, copying its description, labels, members, task lists, attachments and custom fields. It goes to the end of the list unless a position is set.',
    annotations: WRITE,
    inputSchema: {
      templateCardId: id('Card template ID'),
      listId: id('List ID on the board of the template'),
      name: z.string().min(1).max(1024).optional().describe('Defaults to the template name'),
      position: z.number().min(0).optional(),
    },
    async handler(inputs, req) {
      const { item: template } = await runAction('cards/show', { id: inputs.templateCardId }, req);

      if (!template.isTemplate) {
        throw new ActionError('cardTemplateNotFound', 'Card template not found');
      }

      const position = _.isUndefined(inputs.position)
        ? await getCardEndPosition(inputs.listId)
        : inputs.position;

      return runAction(
        'cards/duplicate',
        {
          position,
          id: template.id,
          listId: inputs.listId,
          name: inputs.name || template.name,
          isTemplate: false,
        },
        req,
      );
    },
  },
  {
    name: 'save_card_as_template',
    description:
      'Save a copy of a card as a card template on its board. The card itself is left as it is.',
    annotations: WRITE,
    inputSchema: {
      cardId: id('Card ID'),
      name: z.string().min(1).max(1024).optional().describe('Defaults to the card name'),
    },
    async handler(inputs, req) {
      const { item: card } = await runAction('cards/show', { id: inputs.cardId }, req);

      return runAction(
        'cards/duplicate',
        {
          id: card.id,
          position: await getCardEndPosition(card.listId),
          name: inputs.name || card.name,
          isTemplate: true,
        },
        req,
      );
    },
  },
  {
    name: 'set_card_recurrence',
    description:
      'Make a card template recurring, or change its schedule, so a card is made from it automatically. The rule is an RFC 5545 RRULE such as FREQ=WEEKLY;BYDAY=MO,WE;BYHOUR=9;BYMINUTE=0 (FREQ is DAILY, WEEKLY, MONTHLY or YEARLY; one BYHOUR and BYMINUTE, midnight when left out). For "day 31, or the last day of shorter months" use BYMONTHDAY=31,-1;BYSETPOS=1. Cards are made on your behalf.',
    annotations: WRITE,
    inputSchema: {
      templateCardId: id('Card template ID'),
      rule: z.string().min(1).max(512).describe('RRULE, without the RRULE: prefix'),
      timeZone: z
        .string()
        .min(1)
        .max(64)
        .optional()
        .describe('IANA time zone the rule is read in, such as Europe/Berlin. Defaults to UTC'),
      listId: id(
        'List to make cards in, on the board of the template. Defaults to the list of the template',
      ).optional(),
    },
    async handler(inputs, req) {
      const { item: template } = await runAction('cards/show', { id: inputs.templateCardId }, req);

      if (!template.isTemplate) {
        throw new ActionError('cardTemplateNotFound', 'Card template not found');
      }

      const cardRecurrence = await CardRecurrence.qm.getOneByTemplateCardId(template.id);

      if (cardRecurrence) {
        return runAction(
          'card-recurrences/update',
          {
            id: cardRecurrence.id,
            ..._.pickBy(_.pick(inputs, ['rule', 'timeZone', 'listId']), (value) => !!value),
          },
          req,
        );
      }

      return runAction(
        'card-recurrences/create',
        {
          cardId: template.id,
          listId: inputs.listId || template.listId,
          rule: inputs.rule,
          timeZone: inputs.timeZone || 'UTC',
        },
        req,
      );
    },
  },
  {
    name: 'delete_card_recurrence',
    description:
      'Stop a card template from recurring. The template and the cards already made are kept.',
    annotations: DESTRUCTIVE,
    inputSchema: {
      templateCardId: id('Card template ID'),
    },
    async handler(inputs, req) {
      const { item: template } = await runAction('cards/show', { id: inputs.templateCardId }, req);
      const cardRecurrence = await CardRecurrence.qm.getOneByTemplateCardId(template.id);

      if (!cardRecurrence) {
        throw new ActionError('cardRecurrenceNotFound', 'Card recurrence not found');
      }

      return runAction('card-recurrences/delete', { id: cardRecurrence.id }, req);
    },
  },
  {
    name: 'update_card',
    description: 'Update the name, description, type or due date of a card.',
    annotations: WRITE,
    inputSchema: {
      cardId: id('Card ID'),
      name: z.string().min(1).max(1024).optional(),
      description: z.string().min(1).max(1048576).nullable().optional().describe('Markdown'),
      type: z.enum(Object.values(Card.Types)).optional(),
      dueDate: z.iso.datetime({ offset: true }).nullable().optional(),
      isDueCompleted: z.boolean().nullable().optional(),
    },
    handler: ({ cardId, ...values }, req) =>
      runAction(
        'cards/update',
        {
          ...values,
          id: cardId,
        },
        req,
      ),
  },
  {
    name: 'move_card',
    description:
      'Move a card to another list, on the same or another board. It goes to the end of the list unless a position is set.',
    annotations: WRITE,
    inputSchema: {
      cardId: id('Card ID'),
      listId: id('Target list ID'),
      boardId: id('Target board ID, when moving to another board').optional(),
      position: z.number().min(0).optional(),
    },
    async handler(inputs, req) {
      const position = _.isUndefined(inputs.position)
        ? await getCardEndPosition(inputs.listId)
        : inputs.position;

      return runAction(
        'cards/update',
        {
          position,
          id: inputs.cardId,
          boardId: inputs.boardId,
          listId: inputs.listId,
        },
        req,
      );
    },
  },
  {
    name: 'delete_card',
    description: 'Delete a card permanently.',
    annotations: DESTRUCTIVE,
    inputSchema: {
      cardId: id('Card ID'),
    },
    handler: (inputs, req) => runAction('cards/delete', { id: inputs.cardId }, req),
  },
  {
    name: 'create_task',
    description:
      'Add a task to a card. Without a task list ID it goes to the first task list of the card, which is created when the card has none.',
    annotations: WRITE,
    inputSchema: {
      cardId: id('Card ID'),
      name: z.string().min(1).max(1024),
      taskListId: id('Task list ID on that card').optional(),
      isCompleted: z.boolean().optional(),
    },
    async handler(inputs, req) {
      const taskListId = await getTaskListIdForCard(inputs.cardId, inputs.taskListId, req);
      const tasks = await Task.qm.getByTaskListId(taskListId);

      return runAction(
        'tasks/create',
        {
          taskListId,
          position: getEndPosition(tasks),
          name: inputs.name,
          isCompleted: inputs.isCompleted,
        },
        req,
      );
    },
  },
  {
    name: 'update_task',
    description: 'Rename a task, complete or reopen it, or change its assignee.',
    annotations: WRITE,
    inputSchema: {
      taskId: id('Task ID'),
      name: z.string().min(1).max(1024).optional(),
      isCompleted: z.boolean().optional(),
      assigneeUserId: id('User ID, or null to unassign').nullable().optional(),
    },
    handler: ({ taskId, ...values }, req) =>
      runAction(
        'tasks/update',
        {
          ...values,
          id: taskId,
        },
        req,
      ),
  },
  {
    name: 'delete_task',
    description: 'Delete a task.',
    annotations: DESTRUCTIVE,
    inputSchema: {
      taskId: id('Task ID'),
    },
    handler: (inputs, req) => runAction('tasks/delete', { id: inputs.taskId }, req),
  },
  {
    name: 'add_label_to_card',
    description: 'Add a board label to a card.',
    annotations: WRITE,
    inputSchema: {
      cardId: id('Card ID'),
      labelId: id('Label ID'),
    },
    handler: (inputs, req) => runAction('card-labels/create', inputs, req),
  },
  {
    name: 'remove_label_from_card',
    description: 'Remove a label from a card.',
    annotations: DESTRUCTIVE,
    inputSchema: {
      cardId: id('Card ID'),
      labelId: id('Label ID'),
    },
    handler: (inputs, req) => runAction('card-labels/delete', inputs, req),
  },
  {
    name: 'add_member_to_card',
    description: 'Add a board member to a card.',
    annotations: WRITE,
    inputSchema: {
      cardId: id('Card ID'),
      userId: id('User ID'),
    },
    handler: (inputs, req) => runAction('card-memberships/create', inputs, req),
  },
  {
    name: 'remove_member_from_card',
    description: 'Remove a member from a card.',
    annotations: DESTRUCTIVE,
    inputSchema: {
      cardId: id('Card ID'),
      userId: id('User ID'),
    },
    handler: (inputs, req) => runAction('card-memberships/delete', inputs, req),
  },
  {
    name: 'create_comment',
    description: 'Comment on a card.',
    annotations: WRITE,
    inputSchema: {
      cardId: id('Card ID'),
      text: z.string().min(1).max(1048576).describe('Markdown'),
    },
    handler: (inputs, req) => runAction('comments/create', inputs, req),
  },
  {
    name: 'list_comments',
    description: 'List the comments of a card, newest first, a page at a time.',
    annotations: READ_ONLY,
    inputSchema: {
      cardId: id('Card ID'),
      beforeId: id('Return comments older than this comment').optional(),
    },
    handler: (inputs, req) => runAction('comments/index', inputs, req),
  },
];
