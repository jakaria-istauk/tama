/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { URL } = require('url');

const AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';

module.exports = {
  sync: true,

  // Without state and nonce: the client adds both, since it is the one that has
  // to remember them across the redirect.
  fn() {
    const url = new URL(AUTHORIZATION_ENDPOINT);

    url.searchParams.set('client_id', sails.config.custom.googleClientId);
    url.searchParams.set('redirect_uri', sails.helpers.utils.getGoogleRedirectUri());
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('prompt', 'select_account');

    return url.href;
  },
};
