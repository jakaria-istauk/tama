/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { v4: uuid } = require('uuid');
const { ProxyAgent } = require('undici');

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
const FETCH_TIMEOUT = 10000;
const MAX_PICTURE_SIZE = 5 * 1024 * 1024;

const getDispatcher = () =>
  sails.config.custom.outgoingProxy ? new ProxyAgent(sails.config.custom.outgoingProxy) : undefined;

// Google's profile photos live on googleusercontent.com; anything else in the
// claim is not fetched.
const isGooglePictureUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname.endsWith('.googleusercontent.com');
  } catch (error) {
    return false;
  }
};

// Best effort: a sign-in never fails because the photo could not be copied.
const importGooglePicture = async (user, pictureUrl, request) => {
  if (user.avatar || !isGooglePictureUrl(pictureUrl)) {
    return user;
  }

  // The default photo is 96px; ask for one large enough for the 180px cover.
  const url = pictureUrl.replace(/=s\d+(-c)?$/, '=s360-c');
  const fd = path.join(os.tmpdir(), `google-avatar-${uuid()}`);

  try {
    const response = await fetch(url, {
      dispatcher: getDispatcher(),
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });

    const buffer = Buffer.from(await response.arrayBuffer());

    if (!response.ok || buffer.length === 0 || buffer.length > MAX_PICTURE_SIZE) {
      return user;
    }

    await fs.promises.writeFile(fd, buffer);

    const avatar = await sails.helpers.users.processUploadedAvatarFile({
      fd,
      size: buffer.length,
      type: response.headers.get('content-type'),
    });

    return (
      (await sails.helpers.users.updateOne.with({
        record: user,
        values: {
          avatar,
        },
        actorUser: User.INTERNAL,
        request,
      })) || user
    );
  } catch (error) {
    sails.log.warn(`Unable to import Google profile picture: ${error}`);
    await fs.promises.rm(fd, { force: true });

    return user;
  }
};

const decodeIdTokenClaims = (idToken) => {
  const parts = typeof idToken === 'string' ? idToken.split('.') : [];

  if (parts.length !== 3) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch (error) {
    return null;
  }
};

module.exports = {
  inputs: {
    code: {
      type: 'string',
      required: true,
    },
    nonce: {
      type: 'string',
      required: true,
    },
    request: {
      type: 'ref',
    },
  },

  exits: {
    invalidGoogleConfiguration: {},
    invalidCodeOrNonce: {},
    userDeactivated: {},
    signUpDisabled: {},
    activeLimitReached: {},
  },

  async fn(inputs) {
    const { googleClientId, googleClientSecret } = sails.config.custom;

    if (!googleClientId || !googleClientSecret) {
      throw 'invalidGoogleConfiguration';
    }

    let response;
    try {
      response = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code: inputs.code,
          client_id: googleClientId,
          client_secret: googleClientSecret,
          redirect_uri: sails.helpers.utils.getGoogleRedirectUri(),
          grant_type: 'authorization_code',
        }),
        dispatcher: getDispatcher(),
        signal: AbortSignal.timeout(FETCH_TIMEOUT),
      });
    } catch (error) {
      sails.log.error(`Error while exchanging Google code: ${error}`);
      throw 'invalidGoogleConfiguration';
    }

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      sails.log.warn(`Google rejected the code: ${body.error || response.status}`);

      // A bad client secret or redirect URI is the operator's to fix, anything
      // else is a code that was used, expired or forged.
      throw body.error === 'invalid_client' || body.error === 'redirect_uri_mismatch'
        ? 'invalidGoogleConfiguration'
        : 'invalidCodeOrNonce';
    }

    // The ID token came straight from Google's token endpoint over TLS, in
    // exchange for our client secret, so its signature does not need checking
    // (OpenID Connect Core 1.0, 3.1.3.7). Its claims still do.
    const claims = decodeIdTokenClaims(body.id_token);

    if (
      !claims ||
      !ISSUERS.includes(claims.iss) ||
      claims.aud !== googleClientId ||
      !(claims.exp * 1000 > Date.now()) ||
      claims.nonce !== inputs.nonce
    ) {
      throw 'invalidCodeOrNonce';
    }

    // Matching accounts by email is only safe when Google vouches for it.
    if (!claims.email || claims.email_verified !== true) {
      throw 'invalidCodeOrNonce';
    }

    const user = await User.qm.getOneByEmail(claims.email);

    if (user) {
      if (user.isDeactivated) {
        throw 'userDeactivated';
      }

      return importGooglePicture(user, claims.picture, inputs.request);
    }

    if (!sails.config.custom.signUpEnabled) {
      throw 'signUpDisabled';
    }

    const createdUser = await sails.helpers.users.createOne
      .with({
        values: {
          email: claims.email,
          role: User.Roles.BOARD_USER,
          name: (claims.name && claims.name.trim().slice(0, 128)) || claims.email.split('@')[0],
        },
        actorUser: User.INTERNAL,
        request: inputs.request,
      })
      .intercept('activeLimitReached', 'activeLimitReached');

    return importGooglePicture(createdUser, claims.picture, inputs.request);
  },
};
