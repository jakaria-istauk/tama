/*
 * Requires a PostgreSQL datastore, see access-tokens/accept-terms.test.js.
 */

const { expect } = require('chai');
const request = require('supertest');
const bcrypt = require('bcrypt');

const { POSITION_GAP } = require('../../../../constants');

describe('Card recurrences', () => {
  const suffix = Date.now().toString(36);
  const userIds = [];
  let counter = 0;
  let project;
  let board;
  let list;
  let otherList;
  let archiveList;
  let editor;
  let viewer;
  let outsider;
  let editorToken;
  let viewerToken;
  let outsiderToken;

  const createUser = async () => {
    counter += 1;

    const user = await User.qm.createOne({
      email: `card-recurrences-${suffix}-${counter}@test.test`,
      password: await bcrypt.hash('password', 4),
      role: User.Roles.BOARD_USER,
      name: `Card Recurrences ${counter}`,
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
      listId: list.id,
      creatorUserId: editor.id,
      type: Card.Types.PROJECT,
      position: POSITION_GAP * counter,
      name: `Card ${counter}`,
      listChangedAt: new Date().toISOString(),
      ...values,
    }).fetch();
  };

  const createTemplate = (values = {}) =>
    createCard({
      isTemplate: true,
      name: 'Weekly report',
      ...values,
    });

  const app = () => request(sails.hooks.http.app);

  const createRecurrence = (accessToken, cardId, data) =>
    app()
      .post(`/api/cards/${cardId}/card-recurrence`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        listId: list.id,
        rule: 'FREQ=WEEKLY;BYDAY=MO;BYHOUR=9',
        timeZone: 'Europe/Berlin',
        ...data,
      });

  const updateRecurrence = (accessToken, id, data) =>
    app()
      .patch(`/api/card-recurrences/${id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(data);

  const deleteRecurrence = (accessToken, id) =>
    app().delete(`/api/card-recurrences/${id}`).set('Authorization', `Bearer ${accessToken}`);

  before(async () => {
    editor = await createUser();
    viewer = await createUser();
    outsider = await createUser();

    ({ project } = await Project.qm.createOne(
      { name: `Card Recurrences ${suffix}` },
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

    archiveList = boardLists.find(({ type }) => type === List.Types.ARCHIVE);

    list = await List.qm.createOne({
      boardId: board.id,
      type: List.Types.ACTIVE,
      position: POSITION_GAP,
      name: 'Todo',
    });

    otherList = await List.qm.createOne({
      boardId: board.id,
      type: List.Types.ACTIVE,
      position: POSITION_GAP * 2,
      name: 'Doing',
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
    it('makes a template recurring and works out its next run', async () => {
      const template = await createTemplate();

      const response = await createRecurrence(editorToken, template.id, {
        rule: 'RRULE:FREQ=WEEKLY;BYDAY=MO;BYHOUR=9',
      });

      expect(response.status).to.equal(200);

      const { item } = response.body;

      expect(item.templateCardId).to.equal(template.id);
      expect(item.boardId).to.equal(board.id);
      expect(item.listId).to.equal(list.id);
      expect(item.creatorUserId).to.equal(editor.id);
      expect(item.rule).to.equal('FREQ=WEEKLY;BYDAY=MO;BYHOUR=9;BYMINUTE=0;BYSECOND=0');
      expect(item.timeZone).to.equal('Europe/Berlin');

      const nextRunAt = new Date(item.nextRunAt);

      expect(nextRunAt.getTime()).to.be.above(Date.now());
      expect(nextRunAt.getTime() - Date.now()).to.be.at.most(7 * 24 * 60 * 60 * 1000);

      const weekday = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Berlin',
        weekday: 'short',
        hour: 'numeric',
        hourCycle: 'h23',
      }).format(nextRunAt);

      expect(weekday).to.equal('Mon, 09');
    });

    it('lists the recurrences of a board with the board', async () => {
      const template = await createTemplate();
      const { body } = await createRecurrence(editorToken, template.id);

      const response = await app()
        .get(`/api/boards/${board.id}`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(response.status).to.equal(200);
      expect(sails.helpers.utils.mapRecords(response.body.included.cardRecurrences)).to.include(
        body.item.id,
      );
    });

    it('allows one recurrence per template', async () => {
      const template = await createTemplate();

      expect((await createRecurrence(editorToken, template.id)).status).to.equal(200);
      expect((await createRecurrence(editorToken, template.id)).status).to.equal(409);
    });

    it('only makes templates recurring', async () => {
      const card = await createCard();

      expect((await createRecurrence(editorToken, card.id)).status).to.equal(404);
    });

    it('needs an active or closed list on the same board', async () => {
      const template = await createTemplate();

      const archiveResponse = await createRecurrence(editorToken, template.id, {
        listId: archiveList.id,
      });

      expect(archiveResponse.status).to.equal(404);
    });

    it('rejects rules that would make more than one card a day, and unknown time zones', async () => {
      const template = await createTemplate();

      expect(
        (await createRecurrence(editorToken, template.id, { rule: 'FREQ=HOURLY' })).status,
      ).to.equal(422);

      expect(
        (await createRecurrence(editorToken, template.id, { rule: 'FREQ=DAILY;BYHOUR=9,17' }))
          .status,
      ).to.equal(422);

      expect(
        (await createRecurrence(editorToken, template.id, { timeZone: 'Mars/Base' })).status,
      ).to.equal(422);
    });

    it('rejects rules that already ended', async () => {
      const template = await createTemplate();

      const response = await createRecurrence(editorToken, template.id, {
        rule: 'FREQ=DAILY;UNTIL=20200101T000000Z',
      });

      expect(response.status).to.equal(422);
    });

    it('needs board editor rights', async () => {
      const template = await createTemplate();

      expect((await createRecurrence(viewerToken, template.id)).status).to.equal(403);
      expect((await createRecurrence(outsiderToken, template.id)).status).to.equal(404);

      const { body } = await createRecurrence(editorToken, template.id);

      expect(
        (await updateRecurrence(viewerToken, body.item.id, { listId: otherList.id })).status,
      ).to.equal(403);

      expect((await deleteRecurrence(outsiderToken, body.item.id)).status).to.equal(404);
    });

    it('changes the schedule and list, and moves the next run', async () => {
      const template = await createTemplate();
      const { body } = await createRecurrence(editorToken, template.id);

      const response = await updateRecurrence(editorToken, body.item.id, {
        listId: otherList.id,
        rule: 'FREQ=DAILY;BYHOUR=7',
        timeZone: 'Asia/Dhaka',
      });

      expect(response.status).to.equal(200);
      expect(response.body.item.listId).to.equal(otherList.id);
      expect(response.body.item.rule).to.equal('FREQ=DAILY;BYHOUR=7;BYMINUTE=0;BYSECOND=0');
      expect(response.body.item.timeZone).to.equal('Asia/Dhaka');

      const nextRunAt = new Date(response.body.item.nextRunAt);

      expect(nextRunAt.getTime() - Date.now()).to.be.at.most(24 * 60 * 60 * 1000);
      expect(nextRunAt.getUTCHours()).to.equal(1); // 07:00 in Dhaka (UTC+6)
    });

    it('stops a recurrence', async () => {
      const template = await createTemplate();
      const { body } = await createRecurrence(editorToken, template.id);

      expect((await deleteRecurrence(editorToken, body.item.id)).status).to.equal(200);
      expect(await CardRecurrence.qm.getOneById(body.item.id)).to.equal(undefined);
    });

    it('goes with its template', async () => {
      const template = await createTemplate();
      const { body } = await createRecurrence(editorToken, template.id);

      const response = await app()
        .delete(`/api/cards/${template.id}`)
        .set('Authorization', `Bearer ${editorToken}`);

      expect(response.status).to.equal(200);
      expect(await CardRecurrence.qm.getOneById(body.item.id)).to.equal(undefined);
    });

    it('goes with the list it makes cards in', async () => {
      const doomedList = await List.qm.createOne({
        boardId: board.id,
        type: List.Types.ACTIVE,
        position: POSITION_GAP * 3,
        name: 'Doomed',
      });

      const template = await createTemplate();
      const { body } = await createRecurrence(editorToken, template.id, {
        listId: doomedList.id,
      });

      const response = await app()
        .delete(`/api/lists/${doomedList.id}`)
        .set('Authorization', `Bearer ${editorToken}`);

      expect(response.status).to.equal(200);
      expect(await CardRecurrence.qm.getOneById(body.item.id)).to.equal(undefined);
    });
  });
});
