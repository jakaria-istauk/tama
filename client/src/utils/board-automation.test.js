import {
  ActionTypes,
  TriggerTypes,
  isRuleValid,
  makeAction,
  makeTrigger,
} from './board-automation';

describe('board-automation', () => {
  test('makes triggers and actions with their fields', () => {
    expect(makeTrigger(TriggerTypes.CARD_MOVED)).toEqual({ type: 'cardMoved', listId: null });
    expect(makeTrigger(TriggerTypes.DUE_DATE_PASSED)).toEqual({ type: 'dueDatePassed' });
    expect(makeAction(ActionTypes.SET_DUE_DATE)).toEqual({ type: 'setDueDate', days: 1 });
    expect(makeAction(ActionTypes.POST_COMMENT)).toEqual({ type: 'postComment', text: '' });
    expect(makeAction(ActionTypes.CLEAR_DUE_DATE)).toEqual({ type: 'clearDueDate' });
  });

  test('checks rules before they are saved', () => {
    const rule = {
      name: 'Review',
      trigger: { type: 'cardMoved', listId: '1' },
      actions: [{ type: 'addLabel', labelId: '2' }],
    };

    expect(isRuleValid(rule)).toBe(true);
    expect(isRuleValid({ ...rule, name: '  ' })).toBe(false);
    expect(isRuleValid({ ...rule, trigger: { type: 'cardMoved', listId: null } })).toBe(false);
    expect(isRuleValid({ ...rule, trigger: { type: 'cardCreated', listId: null } })).toBe(true);
    expect(isRuleValid({ ...rule, actions: [] })).toBe(false);
    expect(isRuleValid({ ...rule, actions: [{ type: 'setDueDate', days: 366 }] })).toBe(false);
    expect(isRuleValid({ ...rule, actions: [{ type: 'postComment', text: ' ' }] })).toBe(false);
    expect(isRuleValid({ ...rule, actions: [{ type: 'completeDueDate' }] })).toBe(true);
  });
});
