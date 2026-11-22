/*
 * Requires a PostgreSQL datastore, see accept-terms.test.js.
 * Google's token endpoint is replaced by a stub of the global fetch.
 */

const { expect } = require('chai');
const request = require('supertest');
const sharp = require('sharp');

const { AccessTokenSteps } = require('../../../../constants');

const CLIENT_ID = 'test-client-id.apps.googleusercontent.com';
const NONCE = 'test-nonce';
const PICTURE_URL = 'https://lh3.googleusercontent.com/a/test-picture=s96-c';

const encodeIdToken = (claims) =>
  ['header', JSON.stringify(claims), 'signature']
    .map((part) => Buffer.from(part).toString('base64url'))
    .join('.');

describe('POST /api/access-tokens/exchange-with-google', () => {
  const suffix = Date.now().toString(36);
  const originalFetch = global.fetch;
  const originalCustom = {};
  let wasInitialized;
  let tokenResponse;
  let tokenRequestBody;
  let pictureRequestUrl;

  const buildClaims = (claims) => ({
    iss: 'https://accounts.google.com',
    aud: CLIENT_ID,
    exp: Math.floor(Date.now() / 1000) + 300,
    nonce: NONCE,
    email_verified: true,
    name: 'Google User',
    ...claims,
  });

  const respondWithClaims = (claims) => {
    tokenResponse = {
      status: 200,
      body: { id_token: encodeIdToken(buildClaims(claims)) },
    };
  };

  const exchange = (data = {}) =>
    request(sails.hooks.http.app)
      .post('/api/access-tokens/exchange-with-google')
      .send({ code: 'test-code', nonce: NONCE, ...data });

  before(async () => {
    ['googleClientId', 'googleClientSecret', 'signUpEnabled'].forEach((key) => {
      originalCustom[key] = sails.config.custom[key];
    });

    Object.assign(sails.config.custom, {
      googleClientId: CLIENT_ID,
      googleClientSecret: 'test-client-secret',
    });

    const picture = await sharp({
      create: { width: 360, height: 360, channels: 3, background: '#4285f4' },
    })
      .png()
      .toBuffer();

    global.fetch = async (url, options) => {
      if (url.startsWith('https://lh3.googleusercontent.com/')) {
        pictureRequestUrl = url;

        return new Response(picture, {
          status: 200,
          headers: { 'Content-Type': 'image/png' },
        });
      }

      if (url !== 'https://oauth2.googleapis.com/token') {
        return originalFetch(url, options);
      }

      tokenRequestBody = new URLSearchParams(options.body.toString());

      return new Response(JSON.stringify(tokenResponse.body), {
        status: tokenResponse.status,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const internalConfig = await InternalConfig.qm.getOneMain();
    wasInitialized = internalConfig.isInitialized;

    if (!wasInitialized) {
      await InternalConfig.updateOne(InternalConfig.MAIN_ID).set({ isInitialized: true });
    }
  });

  beforeEach(() => {
    sails.config.custom.signUpEnabled = false;
  });

  after(async () => {
    global.fetch = originalFetch;
    Object.assign(sails.config.custom, originalCustom);

    const users = await User.find({ email: { startsWith: `google-${suffix}` } });
    const userIds = users.map(({ id }) => id);

    if (userIds.length > 0) {
      await Session.destroy({ userId: userIds });
      await User.destroy({ id: userIds });
    }

    if (!wasInitialized) {
      await InternalConfig.updateOne(InternalConfig.MAIN_ID).set({ isInitialized: false });
    }
  });

  it('signs in an existing user by verified email', async () => {
    const email = `google-${suffix}-existing@test.test`;
    await User.qm.createOne({
      email,
      role: User.Roles.PROJECT_OWNER,
      name: 'Existing',
      termsSignature: (await sails.hooks.terms.getPayload()).signature,
    });

    respondWithClaims({ email: email.toUpperCase() });

    const response = await exchange();

    expect(tokenRequestBody.get('code')).to.equal('test-code');
    expect(tokenRequestBody.get('redirect_uri')).to.match(/\/google-callback$/);
    expect(response.status).to.equal(200);
    expect(response.body.item).to.be.a('string');

    // Existing accounts keep their role.
    const user = await User.qm.getOneByEmail(email);
    expect(user.role).to.equal(User.Roles.PROJECT_OWNER);
  });

  it('refuses a new email when sign-up is disabled', async () => {
    const email = `google-${suffix}-new-disabled@test.test`;
    respondWithClaims({ email });

    const response = await exchange();

    expect(response.status).to.equal(403);
    expect(response.body.message).to.equal('Sign up disabled');
    expect(await User.qm.getOneByEmail(email)).to.equal(undefined);
  });

  it('creates a board user without a password when sign-up is enabled', async () => {
    sails.config.custom.signUpEnabled = true;

    const email = `google-${suffix}-new@test.test`;
    respondWithClaims({ email });

    const response = await exchange();

    if (response.status === 403) {
      expect(response.body.step).to.equal(AccessTokenSteps.ACCEPT_TERMS);
    } else {
      expect(response.status).to.equal(200);
    }

    const user = await User.qm.getOneByEmail(email);
    expect(user.role).to.equal(User.Roles.BOARD_USER);
    expect(user.name).to.equal('Google User');
    expect(user.password).to.equal(null);

    // No password means no password login, whatever is typed.
    const loginResponse = await request(sails.hooks.http.app)
      .post('/api/access-tokens')
      .send({ emailOrUsername: email, password: 'anything' });
    expect(loginResponse.status).to.equal(401);
  });

  it('copies the Google profile picture into the avatar of a user without one', async () => {
    sails.config.custom.signUpEnabled = true;

    const email = `google-${suffix}-picture@test.test`;
    respondWithClaims({ email, picture: PICTURE_URL });

    await exchange();

    expect(pictureRequestUrl).to.equal('https://lh3.googleusercontent.com/a/test-picture=s360-c');

    const user = await User.qm.getOneByEmail(email);
    expect(user.avatar).to.be.an('object');
    expect(user.avatar.uploadedFileId).to.be.a('string');

    // An avatar the user already has is kept.
    pictureRequestUrl = null;
    await exchange();
    expect(pictureRequestUrl).to.equal(null);
  });

  it('ignores a picture that is not on googleusercontent.com', async () => {
    sails.config.custom.signUpEnabled = true;

    const email = `google-${suffix}-foreign-picture@test.test`;
    respondWithClaims({ email, picture: 'https://evil.example/picture.png' });
    pictureRequestUrl = null;

    await exchange();

    expect(pictureRequestUrl).to.equal(null);
    expect((await User.qm.getOneByEmail(email)).avatar).to.equal(null);
  });

  it('refuses a deactivated user', async () => {
    const email = `google-${suffix}-deactivated@test.test`;
    await User.qm.createOne({
      email,
      role: User.Roles.BOARD_USER,
      name: 'Deactivated',
      isDeactivated: true,
    });

    respondWithClaims({ email });

    const response = await exchange();

    expect(response.status).to.equal(401);
    expect(response.body.message).to.equal('User is deactivated');
  });

  [
    ['an unverified email', { email_verified: false }],
    ['a wrong nonce', { nonce: 'other' }],
    ['a wrong audience', { aud: 'other-client' }],
    ['a wrong issuer', { iss: 'https://evil.example' }],
    ['an expired token', { exp: Math.floor(Date.now() / 1000) - 10 }],
  ].forEach(([title, claims]) => {
    it(`refuses ${title}`, async () => {
      respondWithClaims({ email: `google-${suffix}-claims@test.test`, ...claims });

      sails.config.custom.signUpEnabled = true;
      const response = await exchange();

      expect(response.status).to.equal(401);
      expect(response.body.message).to.equal('Invalid code or nonce');
    });
  });

  it('refuses a code Google rejects', async () => {
    tokenResponse = { status: 400, body: { error: 'invalid_grant' } };

    const response = await exchange();

    expect(response.status).to.equal(401);
    expect(response.body.message).to.equal('Invalid code or nonce');
  });
});
