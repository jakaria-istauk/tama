/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

// Shapes of board automation triggers and actions, matching the server's whitelist

export const TriggerTypes = {
  CARD_CREATED: 'cardCreated',
  CARD_MOVED: 'cardMoved',
  LABEL_ADDED: 'labelAdded',
  DUE_DATE_PASSED: 'dueDatePassed',
  ALL_TASKS_COMPLETED: 'allTasksCompleted',
};

export const ActionTypes = {
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

export const MAX_ACTIONS = 10;
export const MAX_DUE_DAYS = 365;
export const MAX_COMMENT_LENGTH = 10000;

// The field each type takes, other than type, if any
const TRIGGER_FIELD = {
  [TriggerTypes.CARD_CREATED]: 'listId',
  [TriggerTypes.CARD_MOVED]: 'listId',
  [TriggerTypes.LABEL_ADDED]: 'labelId',
};

const ACTION_FIELD = {
  [ActionTypes.MOVE_CARD]: 'listId',
  [ActionTypes.ADD_LABEL]: 'labelId',
  [ActionTypes.REMOVE_LABEL]: 'labelId',
  [ActionTypes.ADD_MEMBER]: 'userId',
  [ActionTypes.REMOVE_MEMBER]: 'userId',
  [ActionTypes.SET_DUE_DATE]: 'days',
  [ActionTypes.POST_COMMENT]: 'text',
};

export const getTriggerField = (type) => TRIGGER_FIELD[type] || null;
export const getActionField = (type) => ACTION_FIELD[type] || null;

const FIELD_DEFAULTS = {
  listId: null,
  labelId: null,
  userId: null,
  days: 1,
  text: '',
};

const make = (type, field) => (field ? { type, [field]: FIELD_DEFAULTS[field] } : { type });

export const makeTrigger = (type) => make(type, getTriggerField(type));
export const makeAction = (type) => make(type, getActionField(type));

const isFieldValid = (field, value, isOptional = false) => {
  switch (field) {
    case 'listId':
    case 'labelId':
    case 'userId':
      return (isOptional && value === null) || (typeof value === 'string' && value.length > 0);
    case 'days':
      return Number.isInteger(value) && value >= 0 && value <= MAX_DUE_DAYS;
    case 'text':
      return (
        typeof value === 'string' && value.trim().length > 0 && value.length <= MAX_COMMENT_LENGTH
      );
    default:
      return true;
  }
};

export const isTriggerValid = (trigger) => {
  const field = getTriggerField(trigger.type);

  return (
    Object.values(TriggerTypes).includes(trigger.type) &&
    (!field || isFieldValid(field, trigger[field], trigger.type === TriggerTypes.CARD_CREATED))
  );
};

export const isActionValid = (action) => {
  const field = getActionField(action.type);

  return (
    Object.values(ActionTypes).includes(action.type) &&
    (!field || isFieldValid(field, action[field]))
  );
};

export const isRuleValid = ({ name, trigger, actions }) =>
  name.trim().length > 0 &&
  isTriggerValid(trigger) &&
  actions.length > 0 &&
  actions.length <= MAX_ACTIONS &&
  actions.every(isActionValid);
