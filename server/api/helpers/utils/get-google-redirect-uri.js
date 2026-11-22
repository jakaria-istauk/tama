/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  sync: true,

  // Google compares this byte for byte against the authorized redirect URIs of
  // the OAuth client, and again when the code is exchanged, so both sides build
  // it here.
  fn() {
    return `${sails.config.custom.baseUrl.replace(/\/$/, '')}/google-callback`;
  },
};
