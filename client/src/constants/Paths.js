/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import Config from './Config';

const ROOT = `${Config.BASE_PATH}/`;
const LOGIN = `${Config.BASE_PATH}/login`;
const GOOGLE_CALLBACK = `${Config.BASE_PATH}/google-callback`;
const PROJECTS = `${Config.BASE_PATH}/projects/:id`;
const BOARDS = `${Config.BASE_PATH}/boards/:id`;
const CARDS = `${Config.BASE_PATH}/cards/:id`;
const OAUTH_CONSENT = `${Config.BASE_PATH}/oauth/consent`;

export default {
  ROOT,
  LOGIN,
  GOOGLE_CALLBACK,
  PROJECTS,
  BOARDS,
  CARDS,
  OAUTH_CONSENT,
};
