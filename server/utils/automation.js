/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * Board automation rules: "when this happens to a card, do that". A rule has one trigger and
 * a list of actions, both plain objects with a `type`. This module checks their shape and
 * turns event bus events into trigger matches; whether the lists, labels and users they name
 * belong to the board is checked by the board-automations helpers.
 */

const validators = require('./validators');

const TriggerTypes = {
  CARD_CREATED: 'cardCreated',
  CARD_MOVED: 'cardMoved',
  LABEL_ADDED: 'labelAdded',
  DUE_DATE_PASSED: 'dueDatePassed',
  ALL_TASKS_COMPLETED: 'allTasksCompleted',
};

const ActionTypes = {
  MOVE_CARD: 'moveCard',
  ADD_LABEL: 'addLabel',
  REMOVE_LABEL: 'removeLabel',
  ADD_MEMBER: 'addMember',
  REMOVE_MEMBER: 'removeMember',
  SET_DUE_DATE: 'setDueDate',
  CLEAR_DUE_DATE: 'clearDueDate',
  COMPLETE_DUE_DATE: 'completeDueDate',
  POST_COMMENT: 'postComment',
};

const MAX_ACTIONS = 10;
const MAX_DUE_DAYS = 365;
const MAX_COMMENT_LENGTH = 10000;

const isId = (value) => typeof value === 'string' && validators.isId(value);

const isNullableId = (value) => value === null || isId(value);

// Allowed fields of each trigger and action type, other than `type`, with a check of each
const TRIGGER_FIELDS = {
  [TriggerTypes.CARD_CREATED]: {
    listId: isNullableId, // null for any list
  },
  [TriggerTypes.CARD_MOVED]: {
    listId: isId,
  },
  [TriggerTypes.LABEL_ADDED]: {
    labelId: isId,
  },
  [TriggerTypes.DUE_DATE_PASSED]: {},
  [TriggerTypes.ALL_TASKS_COMPLETED]: {},
};

const ACTION_FIELDS = {
  [ActionTypes.MOVE_CARD]: {
    listId: isId,
  },
  [ActionTypes.ADD_LABEL]: {
    labelId: isId,
  },
  [ActionTypes.REMOVE_LABEL]: {
    labelId: isId,
  },
  [ActionTypes.ADD_MEMBER]: {
    userId: isId,
  },
  [ActionTypes.REMOVE_MEMBER]: {
    userId: isId,
  },
  [ActionTypes.SET_DUE_DATE]: {
    days: (value) => Number.isInteger(value) && value >= 0 && value <= MAX_DUE_DAYS,
  },
  [ActionTypes.CLEAR_DUE_DATE]: {},
  [ActionTypes.COMPLETE_DUE_DATE]: {},
  [ActionTypes.POST_COMMENT]: {
    text: (value) =>
      typeof value === 'string' && value.trim().length > 0 && value.length <= MAX_COMMENT_LENGTH,
  },
};

// Returns the object with only its known fields, or null when its type is unknown or a field
// is missing or invalid. Optional nullable fields (listId of cardCreated) default to null.
const normalizeItem = (item, fieldsByType) => {
  if (!_.isPlainObject(item)) {
    return null;
  }

  const fields = fieldsByType[item.type];

  if (!fields) {
    return null;
  }

  const unknownKeys = Object.keys(item).filter((key) => key !== 'type' && !fields[key]);

  if (unknownKeys.length > 0) {
    return null;
  }

  const result = {
    type: item.type,
  };

  const isValid = Object.entries(fields).every(([name, check]) => {
    const value = _.isUndefined(item[name]) && check === isNullableId ? null : item[name];

    if (!check(value)) {
      return false;
    }

    result[name] = name === 'text' ? value.trim() : value;
    return true;
  });

  return isValid ? result : null;
};

const normalizeTrigger = (trigger) => normalizeItem(trigger, TRIGGER_FIELDS);

const normalizeActions = (actions) => {
  if (!Array.isArray(actions) || actions.length === 0 || actions.length > MAX_ACTIONS) {
    return null;
  }

  const result = actions.map((action) => normalizeItem(action, ACTION_FIELDS));
  return result.every(Boolean) ? result : null;
};

/**
 * Reads an event bus event as a trigger: the card it happened to and what happened, or null
 * when no trigger type covers it. allTasksCompleted is only a candidate here (a task was just
 * completed); the caller checks that the card has no other open tasks.
 */
const parseEvent = ({ event, data, prevData, scope }) => {
  if (!data || !data.item || !scope || !scope.boardId) {
    return null;
  }

  const { item } = data;
  const included = data.included || {};

  switch (event) {
    case 'cardCreate':
      if (item.isTemplate) {
        return null;
      }

      return {
        type: TriggerTypes.CARD_CREATED,
        boardId: scope.boardId,
        cardId: item.id,
        listId: item.listId,
      };
    case 'cardUpdate': {
      const prevItem = prevData && prevData.item;

      if (
        item.isTemplate ||
        !prevItem ||
        !item.listId ||
        item.listId === prevItem.listId ||
        item.boardId !== prevItem.boardId
      ) {
        return null;
      }

      return {
        type: TriggerTypes.CARD_MOVED,
        boardId: scope.boardId,
        cardId: item.id,
        listId: item.listId,
      };
    }
    case 'cardLabelCreate':
      return {
        type: TriggerTypes.LABEL_ADDED,
        boardId: scope.boardId,
        cardId: item.cardId,
        labelId: item.labelId,
      };
    case 'taskUpdate': {
      const prevItem = prevData && prevData.item;

      if (!item.isCompleted || (prevItem && prevItem.isCompleted) || !included.cards) {
        return null;
      }

      return {
        type: TriggerTypes.ALL_TASKS_COMPLETED,
        boardId: scope.boardId,
        cardId: included.cards[0].id,
      };
    }
    default:
      return null;
  }
};

const matchesTrigger = (trigger, parsedEvent) => {
  if (trigger.type !== parsedEvent.type) {
    return false;
  }

  switch (trigger.type) {
    case TriggerTypes.CARD_CREATED:
      return trigger.listId === null || trigger.listId === parsedEvent.listId;
    case TriggerTypes.CARD_MOVED:
      return trigger.listId === parsedEvent.listId;
    case TriggerTypes.LABEL_ADDED:
      return trigger.labelId === parsedEvent.labelId;
    default:
      return true;
  }
};

module.exports = {
  TriggerTypes,
  ActionTypes,
  MAX_ACTIONS,
  normalizeTrigger,
  normalizeActions,
  parseEvent,
  matchesTrigger,
};
