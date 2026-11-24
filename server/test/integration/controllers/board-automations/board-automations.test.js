/*
 * Requires a PostgreSQL datastore, see access-tokens/accept-terms.test.js.
 */

const { expect } = require('chai');
const request = require('supertest');
const bcrypt = require('bcrypt');

const { POSITION_GAP } = require('../../../../constants');

describe('Board automations', () => {
  const suffix = Date.now().toString(36);
  const userIds = [];
  let counter = 0;
  let project;
  let board;
  let todoList;
  let doingList;
  let trashList;
  let label;
  let otherLabel;
  let editor;
  let viewer;
  let outsider;
  let editorToken;
  let viewerToken;
  let outsiderToken;

  const createUser = async () => {
    counter += 1;

    const user = await User.qm.createOne({
      email: `board-automations-${suffix}-${counter}@test.test`,
      password: await bcrypt.hash('password', 4),
      role: User.Roles.BOARD_USER,
      name: `Board Automations ${counter}`,
    });

    userIds.push(user.id);
    return user;
  };

  const createAccessToken = async (user) => {
    const { token } = sails.helpers.utils.createJwtToken(user.id, new Date(), 60 * 60);

    await Session.qm.createOne({
      accessToken: token,
      userId: user.id,
      remoteAddress: '127.0.0.1',
    });

    return token;
  };

  const createCard = (values = {}) => {
    counter += 1;

    return Card.create({
      boardId: board.id,
      listId: todoList.id,
      creatorUserId: editor.id,
      type: Card.Types.PROJECT,
      position: POSITION_GAP * counter,
      name: `Card ${counter}`,
      listChangedAt: new Date().toISOString(),
      ...values,
    }).fetch();
  };

  const app = () => request(sails.hooks.http.app);

  const as = (accessToken, req) => req.set('Authorization', `Bearer ${accessToken}`);

  const createRule = (accessToken, data) =>
    as(accessToken, app().post(`/api/boards/${board.id}/board-automations`)).send({
      name: 'Rule',
      trigger: { type: 'cardMoved', listId: doingList.id },
      actions: [{ type: 'addLabel', labelId: label.id }],
      ...data,
    });

  const updateRule = (accessToken, id, data) =>
    as(accessToken, app().patch(`/api/board-automations/${id}`)).send(data);

  const deleteRule = (accessToken, id) =>
    as(accessToken, app().delete(`/api/board-automations/${id}`));

  const moveCard = (card, list) =>
    as(editorToken, app().patch(`/api/cards/${card.id}`)).send({
      listId: list.id,
      position: POSITION_GAP,
    });

  const sleep = (ms) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    });

  // Rules run after the request that triggers them has returned
  const waitFor = async (check, timeout = 3000) => {
    const startedAt = Date.now();

    for (;;) {
      const result = await check(); // eslint-disable-line no-await-in-loop

      if (result) {
        return result;
      }

      if (Date.now() - startedAt > timeout) {
        throw new Error('Timed out waiting for the automation');
      }

      await sleep(20); // eslint-disable-line no-await-in-loop
    }
  };

  // Gives rules a moment to run, to check that nothing (more) happens
  const settle = () => sleep(300);

  const getLabelIds = async (card) =>
    sails.helpers.utils.mapRecords(await CardLabel.qm.getByCardId(card.id), 'labelId');

  const getComments = (card) => Comment.qm.getByCardId(card.id);

  // Runs actions on a card as a rule of the editor would
  const runActions = (card, actions) =>
    sails.helpers.boardAutomations.runOne.with({
      record: {
        actions,
        id: '1',
        name: 'Test rule',
        boardId: board.id,
        creatorUserId: editor.id,
      },
      cardId: card.id,
    });

  before(async () => {
    editor = await createUser();
    viewer = await createUser();
    outsider = await createUser();

    ({ project } = await Project.qm.createOne(
      { name: `Board Automations ${suffix}` },
      { user: editor },
    ));

    let boardLists;
    // Makes the editor a board editor too
    ({ board, lists: boardLists } = await Board.qm.createOne(
      {
        projectId: project.id,
        position: POSITION_GAP,
        name: 'Board',
      },
      { user: editor },
    ));

    trashList = boardLists.find(({ type }) => type === List.Types.TRASH);

    todoList = await List.qm.createOne({
      boardId: board.id,
      type: List.Types.ACTIVE,
      position: POSITION_GAP,
      name: 'Todo',
    });

    doingList = await List.qm.createOne({
      boardId: board.id,
      type: List.Types.ACTIVE,
      position: POSITION_GAP * 2,
      name: 'Doing',
    });

    label = await Label.qm.createOne({
      boardId: board.id,
      position: POSITION_GAP,
      name: 'Review',
      color: Label.COLORS[0],
    });

    otherLabel = await Label.qm.createOne({
      boardId: board.id,
      position: POSITION_GAP * 2,
      name: 'Urgent',
      color: Label.COLORS[1],
    });

    await BoardMembership.qm.createOne({
      projectId: project.id,
      boardId: board.id,
      userId: viewer.id,
      role: BoardMembership.Roles.VIEWER,
    });

    editorToken = await createAccessToken(editor);
    viewerToken = await createAccessToken(viewer);
    outsiderToken = await createAccessToken(outsider);
  });

  afterEach(async () => {
    await BoardAutomation.qm.delete({ boardId: board.id });
    await settle();
  });

  after(async () => {
    if (project) {
      await sails.helpers.boards.deleteOne.with({ project, record: board, actorUser: editor });
      await ProjectManager.destroy({ projectId: project.id });
      await Project.qm.deleteOne(project.id);
    }

    await Session.destroy({ userId: userIds });
    await User.destroy({ id: userIds });
  });

  describe('API', () => {
    it('adds a rule to a board and lists it with the board', async () => {
      const response = await createRule(editorToken, {
        name: '  Label reviews  ',
        trigger: { type: 'cardCreated' },
        actions: [{ type: 'postComment', text: ' Welcome ' }],
      });

      expect(response.status).to.equal(200);

      const { item } = response.body;

      expect(item.boardId).to.equal(board.id);
      expect(item.creatorUserId).to.equal(editor.id);
      expect(item.name).to.equal('Label reviews');
      expect(item.trigger).to.deep.equal({ type: 'cardCreated', listId: null });
      expect(item.actions).to.deep.equal([{ type: 'postComment', text: 'Welcome' }]);
      expect(item.isEnabled).to.equal(true);
      expect(item).to.not.have.property('dueCheckedAt');

      const boardResponse = await as(viewerToken, app().get(`/api/boards/${board.id}`));

      expect(boardResponse.status).to.equal(200);
      expect(
        sails.helpers.utils.mapRecords(boardResponse.body.included.boardAutomations),
      ).to.deep.equal([item.id]);
    });

    it('rejects invalid triggers and actions', async () => {
      let response = await createRule(editorToken, { trigger: { type: 'cardDeleted' } });
      expect(response.status).to.equal(422);
      expect(response.body.code).to.equal('E_UNPROCESSABLE_ENTITY');

      response = await createRule(editorToken, { actions: [] });
      expect(response.status).to.equal(422);

      response = await createRule(editorToken, { actions: [{ type: 'setDueDate', days: 400 }] });
      expect(response.status).to.equal(422);
    });

    it('rejects lists, labels and users from outside the board', async () => {
      let response = await createRule(editorToken, {
        trigger: { type: 'cardMoved', listId: trashList.id },
      });

      expect(response.status).to.equal(404);

      response = await createRule(editorToken, {
        actions: [{ type: 'moveCard', listId: '1' }],
      });

      expect(response.status).to.equal(404);

      response = await createRule(editorToken, {
        actions: [{ type: 'removeLabel', labelId: '1' }],
      });

      expect(response.status).to.equal(404);

      response = await createRule(editorToken, {
        actions: [{ type: 'addMember', userId: outsider.id }],
      });

      expect(response.status).to.equal(404);

      response = await createRule(editorToken, {
        actions: [{ type: 'addMember', userId: viewer.id }],
      });

      expect(response.status).to.equal(200);
    });

    it('lets only board editors manage rules', async () => {
      let response = await createRule(viewerToken);
      expect(response.status).to.equal(403);

      response = await createRule(outsiderToken);
      expect(response.status).to.equal(404);

      const { body } = await createRule(editorToken);

      response = await updateRule(viewerToken, body.item.id, { isEnabled: false });
      expect(response.status).to.equal(403);

      response = await deleteRule(outsiderToken, body.item.id);
      expect(response.status).to.equal(404);
    });

    it('updates and deletes rules', async () => {
      const { body } = await createRule(editorToken);

      let response = await updateRule(editorToken, body.item.id, {
        name: 'Renamed',
        isEnabled: false,
        trigger: { type: 'labelAdded', labelId: label.id },
        actions: [{ type: 'clearDueDate' }],
      });

      expect(response.status).to.equal(200);
      expect(response.body.item).to.include({ name: 'Renamed', isEnabled: false });
      expect(response.body.item.trigger).to.deep.equal({ type: 'labelAdded', labelId: label.id });
      expect(response.body.item.actions).to.deep.equal([{ type: 'clearDueDate' }]);

      response = await updateRule(editorToken, body.item.id, { actions: [{ type: 'nope' }] });
      expect(response.status).to.equal(422);

      response = await deleteRule(editorToken, body.item.id);
      expect(response.status).to.equal(200);
      expect(await BoardAutomation.qm.getOneById(body.item.id)).to.equal(undefined);
    });
  });

  describe('triggers', () => {
    it('runs when a card is created in a list', async () => {
      await createRule(editorToken, {
        trigger: { type: 'cardCreated', listId: doingList.id },
      });

      const response = await as(editorToken, app().post(`/api/lists/${doingList.id}/cards`)).send({
        type: Card.Types.PROJECT,
        position: POSITION_GAP,
        name: 'New card',
      });

      expect(response.status).to.equal(200);

      const card = response.body.item;

      await waitFor(async () => (await getLabelIds(card)).includes(label.id));
    });

    it('runs when a card is moved to a list', async () => {
      await createRule(editorToken);

      const card = await createCard();

      // Moves to other lists do not trigger it
      await moveCard(card, todoList);
      await settle();
      expect(await getLabelIds(card)).to.deep.equal([]);

      const response = await moveCard(card, doingList);
      expect(response.status).to.equal(200);

      await waitFor(async () => (await getLabelIds(card)).includes(label.id));
    });

    it('runs when a label is added to a card', async () => {
      await createRule(editorToken, {
        trigger: { type: 'labelAdded', labelId: label.id },
        actions: [{ type: 'moveCard', listId: doingList.id }],
      });

      const card = await createCard();

      const response = await as(editorToken, app().post(`/api/cards/${card.id}/card-labels`)).send({
        labelId: label.id,
      });

      expect(response.status).to.equal(200);

      await waitFor(async () => (await Card.qm.getOneById(card.id)).listId === doingList.id);
    });

    it('runs when the last open task of a card is completed', async () => {
      await createRule(editorToken, {
        trigger: { type: 'allTasksCompleted' },
        actions: [{ type: 'completeDueDate' }],
      });

      const card = await createCard({
        dueDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        isDueCompleted: false,
      });

      const taskList = await TaskList.qm.createOne({
        cardId: card.id,
        position: POSITION_GAP,
        name: 'Checklist',
      });

      const tasks = await Promise.all(
        [1, 2].map((position) =>
          Task.qm.createOne({
            taskListId: taskList.id,
            position: POSITION_GAP * position,
            name: `Task ${position}`,
            isCompleted: false,
          }),
        ),
      );

      let response = await as(editorToken, app().patch(`/api/tasks/${tasks[0].id}`)).send({
        isCompleted: true,
      });

      expect(response.status).to.equal(200);

      await settle();
      expect((await Card.qm.getOneById(card.id)).isDueCompleted).to.equal(false);

      response = await as(editorToken, app().patch(`/api/tasks/${tasks[1].id}`)).send({
        isCompleted: true,
      });

      expect(response.status).to.equal(200);

      await waitFor(async () => (await Card.qm.getOneById(card.id)).isDueCompleted);
    });

    it('runs once on cards whose due date has passed', async () => {
      const { body } = await createRule(editorToken, {
        trigger: { type: 'dueDatePassed' },
        actions: [{ type: 'postComment', text: 'Overdue' }],
      });

      // As if the rule had last looked an hour ago
      await BoardAutomation.qm.updateOne(body.item.id, {
        dueCheckedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      });

      const overdueCard = await createCard({
        dueDate: new Date(Date.now() - 60 * 1000).toISOString(),
        isDueCompleted: false,
      });

      const completedCard = await createCard({
        dueDate: new Date(Date.now() - 60 * 1000).toISOString(),
        isDueCompleted: true,
      });

      const oldCard = await createCard({
        dueDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        isDueCompleted: false,
      });

      const upcomingCard = await createCard({
        dueDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        isDueCompleted: false,
      });

      await sails.hooks.automation.runDueDates();
      await sails.hooks.automation.runDueDates();

      const comments = await getComments(overdueCard);

      expect(comments).to.have.lengthOf(1);
      expect(comments[0]).to.include({ text: 'Overdue', userId: editor.id });

      expect(await getComments(completedCard)).to.have.lengthOf(0);
      expect(await getComments(oldCard)).to.have.lengthOf(0);
      expect(await getComments(upcomingCard)).to.have.lengthOf(0);
    });

    it('does not run when off, or when its creator can no longer edit the board', async () => {
      const { body } = await createRule(editorToken, { isEnabled: false });

      const card = await createCard();

      await moveCard(card, doingList);
      await settle();
      expect(await getLabelIds(card)).to.deep.equal([]);

      // A viewer cannot change cards, so neither can their rules
      await updateRule(editorToken, body.item.id, { isEnabled: true });
      await BoardAutomation.qm.updateOne(body.item.id, { creatorUserId: viewer.id });

      await moveCard(card, todoList);
      await moveCard(card, doingList);
      await settle();
      expect(await getLabelIds(card)).to.deep.equal([]);
    });
  });

  describe('actions', () => {
    it('move the card to the end of a list', async () => {
      const lastCard = await createCard({ listId: doingList.id });
      const card = await createCard();

      await runActions(card, [{ type: 'moveCard', listId: doingList.id }]);

      const movedCard = await Card.qm.getOneById(card.id);

      expect(movedCard.listId).to.equal(doingList.id);
      expect(movedCard.position).to.be.above(lastCard.position);
    });

    it('add and remove labels', async () => {
      const card = await createCard();

      await runActions(card, [
        { type: 'addLabel', labelId: label.id },
        { type: 'addLabel', labelId: otherLabel.id },
        { type: 'addLabel', labelId: label.id }, // Already on the card, skipped
      ]);

      expect((await getLabelIds(card)).sort()).to.deep.equal([label.id, otherLabel.id].sort());

      await runActions(card, [{ type: 'removeLabel', labelId: label.id }]);

      expect(await getLabelIds(card)).to.deep.equal([otherLabel.id]);
    });

    it('add and remove members', async () => {
      const card = await createCard();

      const getMemberIds = async () =>
        sails.helpers.utils.mapRecords(await CardMembership.qm.getByCardId(card.id), 'userId');

      await runActions(card, [
        { type: 'addMember', userId: viewer.id },
        { type: 'addMember', userId: outsider.id }, // Not a board member, skipped
      ]);

      expect(await getMemberIds()).to.deep.equal([viewer.id]);

      await runActions(card, [{ type: 'removeMember', userId: viewer.id }]);

      expect(await getMemberIds()).to.deep.equal([]);
    });

    it('set, complete and clear the due date', async () => {
      const card = await createCard();

      await runActions(card, [{ type: 'setDueDate', days: 3 }]);

      let nextCard = await Card.qm.getOneById(card.id);
      const days = (new Date(nextCard.dueDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000);

      expect(days).to.be.within(2.99, 3);
      expect(nextCard.isDueCompleted).to.equal(false);

      await runActions(card, [{ type: 'completeDueDate' }]);

      nextCard = await Card.qm.getOneById(card.id);
      expect(nextCard.isDueCompleted).to.equal(true);

      await runActions(card, [{ type: 'clearDueDate' }]);

      nextCard = await Card.qm.getOneById(card.id);
      expect(nextCard.dueDate).to.equal(null);
      expect(nextCard.isDueCompleted).to.equal(null);
    });

    it('clears a start date that would fall after the due date it sets', async () => {
      const day = 24 * 60 * 60 * 1000;
      const keptStartDate = new Date(Date.now() + day).toISOString();

      const card = await createCard({ startDate: keptStartDate });

      await runActions(card, [{ type: 'setDueDate', days: 3 }]);

      let nextCard = await Card.qm.getOneById(card.id);
      expect(new Date(nextCard.startDate).toISOString()).to.equal(keptStartDate);

      await Card.qm.updateOne(card.id, {
        startDate: new Date(Date.now() + 10 * day).toISOString(),
      });

      await runActions(card, [{ type: 'setDueDate', days: 3 }]);

      nextCard = await Card.qm.getOneById(card.id);
      expect(nextCard.startDate).to.equal(null);
      expect(nextCard.dueDate).to.not.equal(null);
    });

    it('post a comment as the rule creator', async () => {
      const card = await createCard();

      await runActions(card, [{ type: 'postComment', text: 'Ready for review' }]);

      const comments = await getComments(card);

      expect(comments).to.have.lengthOf(1);
      expect(comments[0]).to.include({ text: 'Ready for review', userId: editor.id });
    });

    it('skip card templates', async () => {
      const template = await createCard({ isTemplate: true });

      expect(await runActions(template, [{ type: 'postComment', text: 'No' }])).to.equal(null);
      expect(await getComments(template)).to.have.lengthOf(0);
    });
  });

  it('marks the changes it makes in the action log', async () => {
    const { body } = await createRule(editorToken, {
      name: 'Send back',
      actions: [{ type: 'moveCard', listId: todoList.id }],
    });

    const card = await createCard();
    await moveCard(card, doingList);

    await waitFor(async () => (await Card.qm.getOneById(card.id)).listId === todoList.id);

    const actions = await Action.find({ cardId: card.id, type: Action.Types.MOVE_CARD }).sort('id');

    expect(actions).to.have.lengthOf(2);
    expect(actions[0].data).to.not.have.property('boardAutomation');
    expect(actions[1].data.boardAutomation).to.deep.equal({ id: body.item.id, name: 'Send back' });
  });

  describe('loops', () => {
    it('never runs a rule again for changes it made itself', async () => {
      // Moving the card back into its own trigger list would trigger it again
      await createRule(editorToken, {
        actions: [
          { type: 'moveCard', listId: todoList.id },
          { type: 'moveCard', listId: doingList.id },
          { type: 'postComment', text: 'Ran' },
        ],
      });

      const card = await createCard();
      await moveCard(card, doingList);

      await waitFor(async () => (await getComments(card)).length > 0);
      await settle();

      expect(await getComments(card)).to.have.lengthOf(1);
      expect((await Card.qm.getOneById(card.id)).listId).to.equal(doingList.id);
    });

    it('stops rules that trigger each other', async () => {
      await createRule(editorToken, {
        name: 'To todo',
        actions: [
          { type: 'postComment', text: 'To todo' },
          { type: 'moveCard', listId: todoList.id },
        ],
      });

      await createRule(editorToken, {
        name: 'To doing',
        trigger: { type: 'cardMoved', listId: todoList.id },
        actions: [
          { type: 'postComment', text: 'To doing' },
          { type: 'moveCard', listId: doingList.id },
        ],
      });

      const card = await createCard();
      await moveCard(card, doingList);

      await waitFor(async () => (await getComments(card)).length >= 2);
      await settle();

      const texts = (await getComments(card)).map(({ text }) => text).sort();

      expect(texts).to.deep.equal(['To doing', 'To todo']);
      expect((await Card.qm.getOneById(card.id)).listId).to.equal(doingList.id);
    });
  });
});
