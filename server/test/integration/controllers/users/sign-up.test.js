/*
 * Requires a PostgreSQL datastore, see access-tokens/accept-terms.test.js.
 */

const { expect } = require('chai');
const request = require('supertest');

const { AccessTokenSteps } = require('../../../../constants');

// A new account has signed no terms, so a sign-up that worked ends at the
// terms step, or with a token when the instance has no terms to sign.
const expectSignedIn = (response) => {
  if (response.status === 403) {
    expect(response.body.step).to.equal(AccessTokenSteps.ACCEPT_TERMS);
    expect(response.body.pendingToken).to.be.a('string');
  } else {
    expect(response.status).to.equal(200);
    expect(response.body.item).to.be.a('string');
  }
};

describe('POST /api/users/sign-up', () => {
  const suffix = Date.now().toString(36);
  const password = 'correct horse battery staple';
  let wasSignUpEnabled;
  let wasInitialized;

  const signUp = (data) =>
    request(sails.hooks.http.app)
      .post('/api/users/sign-up')
      .send({
        name: 'Sign Up',
        password,
        ...data,
      });

  before(async () => {
    wasSignUpEnabled = sails.config.custom.signUpEnabled;

    const internalConfig = await InternalConfig.qm.getOneMain();
    wasInitialized = internalConfig.isInitialized;

    if (!wasInitialized) {
      await InternalConfig.updateOne(InternalConfig.MAIN_ID).set({ isInitialized: true });
    }
  });

  afterEach(() => {
    sails.config.custom.signUpEnabled = wasSignUpEnabled;
  });

  after(async () => {
    const users = await User.find({ email: { startsWith: `sign-up-${suffix}` } });
    const userIds = users.map(({ id }) => id);

    if (userIds.length > 0) {
      await Session.destroy({ userId: userIds });
      await User.destroy({ id: userIds });
    }

    if (!wasInitialized) {
      await InternalConfig.updateOne(InternalConfig.MAIN_ID).set({ isInitialized: false });
    }
  });

  it('refuses when sign-up is disabled', async () => {
    sails.config.custom.signUpEnabled = false;

    const email = `sign-up-${suffix}-disabled@test.test`;
    const response = await signUp({ email });

    expect(response.status).to.equal(403);
    expect(response.body.message).to.equal('Sign up disabled');
    expect(await User.qm.getOneByEmail(email)).to.equal(undefined);
  });

  it('creates a board user and signs it in', async () => {
    sails.config.custom.signUpEnabled = true;

    const email = `sign-up-${suffix}-ok@test.test`;
    // A role in the request is not an input, so it cannot raise the account.
    const response = await signUp({ email: email.toUpperCase(), role: User.Roles.ADMIN });
    expectSignedIn(response);

    const user = await User.qm.getOneByEmail(email);
    expect(user.role).to.equal(User.Roles.BOARD_USER);
    expect(user.password).to.not.equal(password);

    const loginResponse = await request(sails.hooks.http.app)
      .post('/api/access-tokens')
      .send({ emailOrUsername: email, password });
    expectSignedIn(loginResponse);
  });

  it('refuses an email that is already in use', async () => {
    sails.config.custom.signUpEnabled = true;

    const email = `sign-up-${suffix}-taken@test.test`;
    expectSignedIn(await signUp({ email }));

    const response = await signUp({ email });

    expect(response.status).to.equal(409);
    expect(response.body.message).to.equal('Email already in use');
  });

  it('refuses a weak password', async () => {
    sails.config.custom.signUpEnabled = true;

    const response = await signUp({
      email: `sign-up-${suffix}-weak@test.test`,
      password: '123',
    });

    expect(response.status).to.equal(400);
  });
});
