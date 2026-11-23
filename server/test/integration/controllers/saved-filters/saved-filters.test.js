/*
 * Requires a PostgreSQL datastore, see access-tokens/accept-terms.test.js.
 */

const { expect } = require('chai');
const request = require('supertest');
const bcrypt = require('bcrypt');

describe('Saved filters API', () => {
  const suffix = Date.now().toString(36);
  const userIds = [];
  let counter = 0;
  let project;
  let board;
  let owner;
  let member;
  let stranger;
  let ownerToken;
  let memberToken;
  let strangerToken;

  const createUser = async () => {
    counter += 1;

    const user = await User.qm.createOne({
      email: `saved-filters-${suffix}-${counter}@test.test`,
      password: await bcrypt.hash('password', 4),
      role: User.Roles.BOARD_USER,
      name: `Saved Filters ${counter}`,
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

  const app = () => request(sails.hooks.http.app);

  const createSavedFilter = (accessToken, data, boardId = board.id) =>
    app()
      .post(`/api/boards/${boardId}/saved-filters`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(data);

  before(async () => {
    owner = await createUser();
    member = await createUser();
    stranger = await createUser();

    project = await Project.create({ name: `Saved Filters ${suffix}` }).fetch();

    board = await Board.create({
      projectId: project.id,
      position: 1,
      name: 'Board',
    }).fetch();

    await BoardMembership.qm.createOne({
      projectId: project.id,
      boardId: board.id,
      userId: owner.id,
      role: BoardMembership.Roles.EDITOR,
    });

    await BoardMembership.qm.createOne({
      projectId: project.id,
      boardId: board.id,
      userId: member.id,
      role: BoardMembership.Roles.VIEWER,
    });

    ownerToken = await createAccessToken(owner);
    memberToken = await createAccessToken(member);
    strangerToken = await createAccessToken(stranger);
  });

  after(async () => {
    await SavedFilter.destroy({ userId: userIds });

    if (project) {
      await BoardMembership.destroy({ projectId: project.id });
      await Board.destroy({ projectId: project.id });
      await Project.destroy({ id: project.id });
    }

    await Session.destroy({ userId: userIds });
    await User.destroy({ id: userIds });
  });

  it('saves a filter in one shape, with the due range kept relative', async () => {
    const response = await createSavedFilter(ownerToken, {
      name: '  Due this week  ',
      filter: {
        creatorUserIds: [owner.id, owner.id],
        due: { range: 'thisWeek', from: '2026-01-01' },
        unknown: 'dropped',
      },
    });

    expect(response.status).to.equal(200);
    expect(response.body.item.name).to.equal('Due this week');
    expect(response.body.item.userId).to.equal(owner.id);
    expect(response.body.item.boardId).to.equal(board.id);

    expect(response.body.item.filter).to.deep.equal({
      userIds: [],
      creatorUserIds: [owner.id],
      labelIds: [],
      excludedLabelIds: [],
      listIds: [],
      noMember: false,
      search: '',
      due: { range: 'thisWeek' },
    });
  });

  it('keeps the dates of a custom range', async () => {
    const response = await createSavedFilter(ownerToken, {
      name: 'Sprint',
      filter: { due: { range: 'custom', from: '2026-11-01', to: '2026-11-14' } },
    });

    expect(response.status).to.equal(200);
    expect(response.body.item.filter.due).to.deep.equal({
      range: 'custom',
      from: '2026-11-01',
      to: '2026-11-14',
    });
  });

  [
    ['an empty filter', {}],
    ['an unknown due range', { due: { range: 'yesterday' } }],
    ['a custom range without dates', { due: { range: 'custom' } }],
    [
      'a custom range that ends before it starts',
      { due: { range: 'custom', from: '2026-11-14', to: '2026-11-01' } },
    ],
    ['a malformed id', { userIds: ['abc'] }],
    ['a non-boolean noMember', { noMember: 'yes' }],
  ].forEach(([description, filter]) => {
    it(`refuses ${description}`, async () => {
      const response = await createSavedFilter(ownerToken, { name: 'Bad', filter });

      expect(response.status).to.equal(422);
    });
  });

  it('lets a viewer save filters, since filtering is reading', async () => {
    const response = await createSavedFilter(memberToken, {
      name: 'Mine',
      filter: { userIds: [member.id] },
    });

    expect(response.status).to.equal(200);
  });

  it('responds with 404 to a user without access to the board', async () => {
    const response = await createSavedFilter(strangerToken, {
      name: 'Nope',
      filter: { noMember: true },
    });

    expect(response.status).to.equal(404);
  });

  it('returns only the current user’s saved filters from users/me', async () => {
    const response = await app().get('/api/users/me').set('Authorization', `Bearer ${memberToken}`);

    expect(response.status).to.equal(200);

    const { savedFilters } = response.body.included;

    expect(savedFilters).to.have.lengthOf(1);
    expect(savedFilters[0].userId).to.equal(member.id);
  });

  it('lets the owner rename and change a filter, and no one else', async () => {
    const created = await createSavedFilter(ownerToken, {
      name: 'Old',
      filter: { search: 'bug' },
    });

    const { id } = created.body.item;

    const foreign = await app()
      .patch(`/api/saved-filters/${id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ name: 'Taken' });

    expect(foreign.status).to.equal(404);

    const response = await app()
      .patch(`/api/saved-filters/${id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'New', filter: { due: { range: 'today' } } });

    expect(response.status).to.equal(200);
    expect(response.body.item.name).to.equal('New');
    expect(response.body.item.filter.search).to.equal('');
    expect(response.body.item.filter.due).to.deep.equal({ range: 'today' });
  });

  it('lets only the owner delete a filter', async () => {
    const created = await createSavedFilter(ownerToken, {
      name: 'Temporary',
      filter: { noMember: true },
    });

    const { id } = created.body.item;

    const foreign = await app()
      .delete(`/api/saved-filters/${id}`)
      .set('Authorization', `Bearer ${strangerToken}`);

    expect(foreign.status).to.equal(404);

    const response = await app()
      .delete(`/api/saved-filters/${id}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(response.status).to.equal(200);
    expect(await SavedFilter.qm.getOneById(id)).to.equal(undefined);
  });

  it('removes a board’s saved filters with the board', async () => {
    const otherBoard = await Board.create({
      projectId: project.id,
      position: 2,
      name: 'Other',
    }).fetch();

    await SavedFilter.qm.createOne({
      boardId: otherBoard.id,
      userId: owner.id,
      name: 'Gone',
      filter: { noMember: true },
    });

    await sails.helpers.boards.deleteRelated(otherBoard);
    await Board.destroy({ id: otherBoard.id });

    const savedFilters = await SavedFilter.find({ boardId: otherBoard.id });

    expect(savedFilters).to.have.lengthOf(0);
  });
});
