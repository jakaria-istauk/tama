const { expect } = require('chai');

const {
  normalizeTrigger,
  normalizeActions,
  parseEvent,
  matchesTrigger,
} = require('../../utils/automation');

describe('automation', () => {
  describe('#normalizeTrigger(trigger)', () => {
    it('accepts each trigger type', () => {
      expect(normalizeTrigger({ type: 'cardCreated', listId: '1' })).to.deep.equal({
        type: 'cardCreated',
        listId: '1',
      });

      expect(normalizeTrigger({ type: 'cardMoved', listId: '1' })).to.deep.equal({
        type: 'cardMoved',
        listId: '1',
      });

      expect(normalizeTrigger({ type: 'labelAdded', labelId: '2' })).to.deep.equal({
        type: 'labelAdded',
        labelId: '2',
      });

      expect(normalizeTrigger({ type: 'dueDatePassed' })).to.deep.equal({
        type: 'dueDatePassed',
      });

      expect(normalizeTrigger({ type: 'allTasksCompleted' })).to.deep.equal({
        type: 'allTasksCompleted',
      });
    });

    it('reads a card created trigger without a list as any list', () => {
      expect(normalizeTrigger({ type: 'cardCreated' })).to.deep.equal({
        type: 'cardCreated',
        listId: null,
      });
    });

    [
      null,
      'cardMoved',
      [],
      {},
      { type: 'cardDeleted' },
      { type: 'cardMoved' },
      { type: 'cardMoved', listId: null },
      { type: 'cardMoved', listId: 1 },
      { type: 'cardMoved', listId: 'abc' },
      { type: 'labelAdded', labelId: '0' },
      { type: 'dueDatePassed', listId: '1' },
    ].forEach((trigger) => {
      it(`rejects ${JSON.stringify(trigger)}`, () => {
        expect(normalizeTrigger(trigger)).to.equal(null);
      });
    });
  });

  describe('#normalizeActions(actions)', () => {
    it('accepts each action type and trims comments', () => {
      const actions = [
        { type: 'moveCard', listId: '1' },
        { type: 'addLabel', labelId: '2' },
        { type: 'removeLabel', labelId: '2' },
        { type: 'addMember', userId: '3' },
        { type: 'removeMember', userId: '3' },
        { type: 'setDueDate', days: 0 },
        { type: 'setDueDate', days: 365 },
        { type: 'clearDueDate' },
        { type: 'completeDueDate' },
      ];

      expect(normalizeActions(actions)).to.deep.equal(actions);

      expect(normalizeActions([{ type: 'postComment', text: '  Done  ' }])).to.deep.equal([
        { type: 'postComment', text: 'Done' },
      ]);
    });

    [
      null,
      {},
      [],
      new Array(11).fill({ type: 'clearDueDate' }),
      [{ type: 'archiveCard' }],
      [{ type: 'moveCard' }],
      [{ type: 'setDueDate', days: -1 }],
      [{ type: 'setDueDate', days: 366 }],
      [{ type: 'setDueDate', days: 1.5 }],
      [{ type: 'postComment', text: '   ' }],
      [{ type: 'postComment', text: 'x'.repeat(10001) }],
      [{ type: 'clearDueDate', days: 1 }],
      [{ type: 'clearDueDate' }, null],
    ].forEach((actions) => {
      it(`rejects ${JSON.stringify(actions).slice(0, 60)}`, () => {
        expect(normalizeActions(actions)).to.equal(null);
      });
    });
  });

  describe('#parseEvent(event)', () => {
    const scope = { projectId: '1', boardId: '2' };
    const card = { id: '3', boardId: '2', listId: '4', isTemplate: false };

    it('reads card creations', () => {
      expect(parseEvent({ scope, event: 'cardCreate', data: { item: card } })).to.deep.equal({
        type: 'cardCreated',
        boardId: '2',
        cardId: '3',
        listId: '4',
      });
    });

    it('skips card templates', () => {
      expect(
        parseEvent({ scope, event: 'cardCreate', data: { item: { ...card, isTemplate: true } } }),
      ).to.equal(null);
    });

    it('reads card updates that change the list as moves', () => {
      expect(
        parseEvent({
          scope,
          event: 'cardUpdate',
          data: { item: { ...card, listId: '5' } },
          prevData: { item: card },
        }),
      ).to.deep.equal({
        type: 'cardMoved',
        boardId: '2',
        cardId: '3',
        listId: '5',
      });

      expect(
        parseEvent({
          scope,
          event: 'cardUpdate',
          data: { item: { ...card, name: 'Renamed' } },
          prevData: { item: card },
        }),
      ).to.equal(null);

      // Moves to another board are not moves within the rule's board
      expect(
        parseEvent({
          scope,
          event: 'cardUpdate',
          data: { item: { ...card, boardId: '6', listId: '7' } },
          prevData: { item: card },
        }),
      ).to.equal(null);
    });

    it('reads labels added to cards', () => {
      expect(
        parseEvent({
          scope,
          event: 'cardLabelCreate',
          data: { item: { cardId: '3', labelId: '8' } },
        }),
      ).to.deep.equal({
        type: 'labelAdded',
        boardId: '2',
        cardId: '3',
        labelId: '8',
      });
    });

    it('reads completed tasks as candidates for all tasks completed', () => {
      const event = {
        scope,
        event: 'taskUpdate',
        data: { item: { id: '9', isCompleted: true }, included: { cards: [card] } },
        prevData: { item: { id: '9', isCompleted: false } },
      };

      expect(parseEvent(event)).to.deep.equal({
        type: 'allTasksCompleted',
        boardId: '2',
        cardId: '3',
      });

      expect(parseEvent({ ...event, prevData: { item: { id: '9', isCompleted: true } } })).to.equal(
        null,
      );
    });

    it('skips other events and events without a board', () => {
      expect(parseEvent({ scope, event: 'cardDelete', data: { item: card } })).to.equal(null);
      expect(
        parseEvent({ scope: { boardId: null }, event: 'cardCreate', data: { item: card } }),
      ).to.equal(null);
    });
  });

  describe('#matchesTrigger(trigger, parsedEvent)', () => {
    it('matches on type, list and label', () => {
      const created = { type: 'cardCreated', listId: '4' };

      expect(matchesTrigger({ type: 'cardCreated', listId: null }, created)).to.equal(true);
      expect(matchesTrigger({ type: 'cardCreated', listId: '4' }, created)).to.equal(true);
      expect(matchesTrigger({ type: 'cardCreated', listId: '5' }, created)).to.equal(false);
      expect(matchesTrigger({ type: 'cardMoved', listId: '4' }, created)).to.equal(false);

      expect(
        matchesTrigger({ type: 'labelAdded', labelId: '8' }, { type: 'labelAdded', labelId: '8' }),
      ).to.equal(true);

      expect(
        matchesTrigger({ type: 'labelAdded', labelId: '8' }, { type: 'labelAdded', labelId: '9' }),
      ).to.equal(false);
    });
  });
});
