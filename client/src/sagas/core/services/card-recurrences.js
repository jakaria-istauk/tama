/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { call, put, select } from 'redux-saga/effects';

import request from '../request';
import selectors from '../../../selectors';
import actions from '../../../actions';
import api from '../../../api';

// Waits for the server, which works out the next run
export function* saveCardRecurrence(cardId, data) {
  const cardRecurrenceModel = yield select(selectors.selectCardRecurrenceByCardId, cardId);

  if (cardRecurrenceModel) {
    const { id } = cardRecurrenceModel;

    yield put(actions.updateCardRecurrence(id, data));

    let cardRecurrence;
    try {
      ({ item: cardRecurrence } = yield call(request, api.updateCardRecurrence, id, data));
    } catch (error) {
      yield put(actions.updateCardRecurrence.failure(id, error));
      return;
    }

    yield put(actions.updateCardRecurrence.success(cardRecurrence));
    return;
  }

  yield put(actions.createCardRecurrence(cardId, data));

  let cardRecurrence;
  try {
    ({ item: cardRecurrence } = yield call(request, api.createCardRecurrence, cardId, data));
  } catch (error) {
    yield put(actions.createCardRecurrence.failure(cardId, error));
    return;
  }

  yield put(actions.createCardRecurrence.success(cardRecurrence));
}

export function* handleCardRecurrenceCreate(cardRecurrence) {
  yield put(actions.handleCardRecurrenceCreate(cardRecurrence));
}

export function* handleCardRecurrenceUpdate(cardRecurrence) {
  yield put(actions.handleCardRecurrenceUpdate(cardRecurrence));
}

export function* deleteCardRecurrence(id) {
  yield put(actions.deleteCardRecurrence(id));

  let cardRecurrence;
  try {
    ({ item: cardRecurrence } = yield call(request, api.deleteCardRecurrence, id));
  } catch (error) {
    yield put(actions.deleteCardRecurrence.failure(id, error));
    return;
  }

  yield put(actions.deleteCardRecurrence.success(cardRecurrence));
}

export function* handleCardRecurrenceDelete(cardRecurrence) {
  yield put(actions.handleCardRecurrenceDelete(cardRecurrence));
}

export default {
  saveCardRecurrence,
  handleCardRecurrenceCreate,
  handleCardRecurrenceUpdate,
  deleteCardRecurrence,
  handleCardRecurrenceDelete,
};
