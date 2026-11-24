/*
 * Requires a PostgreSQL datastore, see access-tokens/accept-terms.test.js.
 */

const { expect } = require('chai');
const request = require('supertest');
const bcrypt = require('bcrypt');

const { POSITION_GAP } = require('../../../../constants');

describe('Card start dates', () => {
  const suffix = Date.now().toString(36);
  let project;
  let board;
  let list;
  let user;
  let accessToken;

  const app = () => request(sails.hooks.http.app);

  const createCard = (data) =>
    app()
      .post(`/api/lists/${list.id}/cards`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: Card.Types.PROJECT,
        position: POSITION_GAP,
        name: 'Card',
        ...data,
      });

  const updateCard = (id, data) =>
    app().patch(`/api/cards/${id}`).set('Authorization', `Bearer ${accessToken}`).send(data);

  before(async () => {
    user = await User.qm.createOne({
      email: `card-start-dates-${suffix}@test.test`,
      password: await bcrypt.hash('password', 4),
      role: User.Roles.BOARD_USER,
      name: 'Card Start Dates',
    });

    ({ project } = await Project.qm.createOne({ name: `Start Dates ${suffix}` }, { user }));

    ({ board } = await Board.qm.createOne(
      {
        projectId: project.id,
        position: POSITION_GAP,
        name: 'Board',
      },
      { user },
    ));

    list = await List.qm.createOne({
      boardId: board.id,
      type: List.Types.ACTIVE,
      position: POSITION_GAP,
      name: 'Todo',
    });

    const { token } = sails.helpers.utils.createJwtToken(user.id, new Date(), 60 * 60);
    accessToken = token;

    await Session.qm.createOne({
      accessToken,
      userId: user.id,
      remoteAddress: '127.0.0.1',
    });
  });

  after(async () => {
    if (project) {
      await sails.helpers.boards.deleteOne.with({ project, record: board, actorUser: user });
      await ProjectManager.destroy({ projectId: project.id });
      await Project.qm.deleteOne(project.id);
    }

    if (user) {
      await Session.destroy({ userId: user.id });
      await User.destroy({ id: user.id });
    }
  });

  it('creates a card with a start date before its due date', async () => {
    const response = await createCard({
      startDate: '2026-01-05T00:00:00.000Z',
      dueDate: '2026-01-09T00:00:00.000Z',
    });

    expect(response.status).to.equal(200);
    expect(new Date(response.body.item.startDate).toISOString()).to.equal(
      '2026-01-05T00:00:00.000Z',
    );
  });

  it('creates a card with only a start date', async () => {
    const response = await createCard({ startDate: '2026-01-05T00:00:00.000Z' });

    expect(response.status).to.equal(200);
    expect(response.body.item.dueDate).to.equal(null);
  });

  it('rejects a new card that starts after it is due', async () => {
    const response = await createCard({
      startDate: '2026-01-10T00:00:00.000Z',
      dueDate: '2026-01-09T00:00:00.000Z',
    });

    expect(response.status).to.equal(422);
    expect(response.body.code).to.equal('E_UNPROCESSABLE_ENTITY');
  });

  it('checks a new start date against the stored due date', async () => {
    const { body } = await createCard({ dueDate: '2026-01-09T00:00:00.000Z' });

    const rejected = await updateCard(body.item.id, { startDate: '2026-01-10T00:00:00.000Z' });
    expect(rejected.status).to.equal(422);

    const accepted = await updateCard(body.item.id, { startDate: '2026-01-09T00:00:00.000Z' });
    expect(accepted.status).to.equal(200);
  });

  it('checks a new due date against the stored start date', async () => {
    const { body } = await createCard({ startDate: '2026-01-05T00:00:00.000Z' });

    const rejected = await updateCard(body.item.id, { dueDate: '2026-01-04T00:00:00.000Z' });
    expect(rejected.status).to.equal(422);

    const moved = await updateCard(body.item.id, {
      startDate: '2026-01-02T00:00:00.000Z',
      dueDate: '2026-01-04T00:00:00.000Z',
    });
    expect(moved.status).to.equal(200);
  });

  it('keeps the start date when the due date is cleared', async () => {
    const { body } = await createCard({
      startDate: '2026-01-05T00:00:00.000Z',
      dueDate: '2026-01-09T00:00:00.000Z',
    });

    const response = await updateCard(body.item.id, { dueDate: null });

    expect(response.status).to.equal(200);
    expect(response.body.item.startDate).to.not.equal(null);
    expect(response.body.item.isDueCompleted).to.equal(null);
  });

});
