/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { call, put, select } from 'redux-saga/effects';
import { nanoid } from 'nanoid';
import { replace } from '../../../lib/redux-router';

import selectors from '../../../selectors';
import actions from '../../../actions';
import api from '../../../api';
import i18n from '../../../i18n';
import { setAccessToken } from '../../../utils/access-token-storage';
import AccessTokenSteps from '../../../constants/AccessTokenSteps';
import Paths from '../../../constants/Paths';

const GOOGLE_STATE_KEY = 'google-state';
const GOOGLE_NONCE_KEY = 'google-nonce';

export function* initializeLogin() {
  const { item: bootstrap } = yield call(api.getBootstrap); // TODO: handle error

  yield put(actions.initializeLogin(bootstrap));
}

// Every way in ends in the same access token response, terms and TOTP steps
// included, so they share one success and failure path.
function* requestAccessToken(request, data) {
  let accessToken;
  try {
    ({ item: accessToken } = yield call(request, data));
  } catch (error) {
    let terms;
    if (error.step === AccessTokenSteps.ACCEPT_TERMS) {
      ({ item: terms } = yield call(api.getTerms, i18n.resolvedLanguage));
    }

    yield put(actions.authenticate.failure(error, terms));
    return;
  }

  yield call(setAccessToken, accessToken);
  yield put(actions.authenticate.success(accessToken));
}

export function* authenticate(data) {
  yield put(actions.authenticate(data));
  yield call(requestAccessToken, api.createAccessToken, data);
}

export function* signUp(data) {
  yield put(actions.authenticate());
  yield call(requestAccessToken, api.signUp, data);
}

export function* authenticateWithGoogle() {
  const { google } = yield select(selectors.selectBootstrap);

  yield put(actions.authenticate());

  const state = nanoid();
  window.sessionStorage.setItem(GOOGLE_STATE_KEY, state);

  const nonce = nanoid();
  window.sessionStorage.setItem(GOOGLE_NONCE_KEY, nonce);

  const url = new URL(google.authorizationUrl);
  url.searchParams.set('state', state);
  url.searchParams.set('nonce', nonce);

  window.location.href = url.href;
}

export function* authenticateWithGoogleCallback() {
  const params = new URLSearchParams(window.location.search);

  const state = window.sessionStorage.getItem(GOOGLE_STATE_KEY);
  window.sessionStorage.removeItem(GOOGLE_STATE_KEY);

  const nonce = window.sessionStorage.getItem(GOOGLE_NONCE_KEY);
  window.sessionStorage.removeItem(GOOGLE_NONCE_KEY);

  yield put(replace(Paths.LOGIN));

  // Closing Google's account chooser is not an error worth showing.
  if (params.get('error') === 'access_denied') {
    return;
  }

  const code = params.get('code');

  if (params.get('error') || !code || !state || !nonce || params.get('state') !== state) {
    yield put(actions.authenticate.failure(new Error('Google sign-in failed')));
    return;
  }

  yield put(actions.authenticate());
  yield call(requestAccessToken, api.exchangeForAccessTokenWithGoogle, {
    code,
    nonce,
  });
}

export function* clearAuthenticateError() {
  yield put(actions.clearAuthenticateError());
}

export function* acceptTerms(signature) {
  yield put(actions.acceptTerms(signature));

  const { pendingToken } = yield select(selectors.selectAuthenticateForm);

  let accessToken;
  try {
    ({ item: accessToken } = yield call(api.acceptTerms, {
      pendingToken,
      signature,
      initialLanguage: i18n.resolvedLanguage,
    }));
  } catch (error) {
    yield put(actions.acceptTerms.failure(error));
    return;
  }

  yield call(setAccessToken, accessToken);
  yield put(actions.acceptTerms.success(accessToken));
}

export function* cancelTerms() {
  const { pendingToken } = yield select(selectors.selectAuthenticateForm);

  yield put(actions.cancelTerms());

  try {
    yield call(api.revokePendingToken, {
      pendingToken,
    });
  } catch (error) {
    yield put(actions.cancelTerms.failure(error));
    return;
  }

  yield put(actions.cancelTerms.success(pendingToken));
}

export function* updateTermsLanguage(value) {
  yield put(actions.updateTermsLanguage(value));

  let terms;
  try {
    ({ item: terms } = yield call(api.getTerms, value));
  } catch (error) {
    yield put(actions.updateTermsLanguage.failure(error));
    return;
  }

  yield put(actions.updateTermsLanguage.success(terms));
}

export function* verifyTotp(data) {
  yield put(actions.verifyTotp(data));

  const { pendingToken } = yield select(selectors.selectAuthenticateForm);

  let accessToken;
  try {
    ({ item: accessToken } = yield call(api.verifyTotp, {
      ...data,
      pendingToken,
    }));
  } catch (error) {
    yield put(actions.verifyTotp.failure(error));
    return;
  }

  yield call(setAccessToken, accessToken);
  yield put(actions.verifyTotp.success(accessToken));
}

export function* cancelTotpChallenge() {
  const { pendingToken } = yield select(selectors.selectAuthenticateForm);

  yield put(actions.cancelTotpChallenge());

  try {
    yield call(api.revokePendingToken, {
      pendingToken,
    });
  } catch (error) {
    yield put(actions.cancelTotpChallenge.failure(error));
    return;
  }

  yield put(actions.cancelTotpChallenge.success());
}

export default {
  initializeLogin,
  authenticate,
  signUp,
  authenticateWithGoogle,
  authenticateWithGoogleCallback,
  clearAuthenticateError,
  acceptTerms,
  cancelTerms,
  updateTermsLanguage,
  verifyTotp,
  cancelTotpChallenge,
};
