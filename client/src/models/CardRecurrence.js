/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { attr, fk } from 'redux-orm';

import BaseModel from './BaseModel';
import ActionTypes from '../constants/ActionTypes';

// The schedule that makes cards from a card template. The server works out nextRunAt.
export default class extends BaseModel {
  static modelName = 'CardRecurrence';

  static fields = {
    id: attr(),
    rule: attr(),
    timeZone: attr(),
    nextRunAt: attr(),
    boardId: fk({
      to: 'Board',
      as: 'board',
      relatedName: 'cardRecurrences',
    }),
    templateCardId: fk({
      to: 'Card',
      as: 'templateCard',
      relatedName: 'cardRecurrences',
    }),
    listId: fk({
      to: 'List',
      as: 'list',
      relatedName: 'cardRecurrences',
    }),
    creatorUserId: fk({
      to: 'User',
      as: 'creatorUser',
      relatedName: 'createdCardRecurrences',
    }),
  };

  static reducer({ type, payload }, CardRecurrence) {
    switch (type) {
      case ActionTypes.LOCATION_CHANGE_HANDLE:
      case ActionTypes.CORE_INITIALIZE:
      case ActionTypes.BOARD_FETCH__SUCCESS:
        if (payload.cardRecurrences) {
          payload.cardRecurrences.forEach((cardRecurrence) => {
            CardRecurrence.upsert(cardRecurrence);
          });
        }

        break;
      case ActionTypes.SOCKET_RECONNECT_HANDLE:
        CardRecurrence.all().delete();

        if (payload.cardRecurrences) {
          payload.cardRecurrences.forEach((cardRecurrence) => {
            CardRecurrence.upsert(cardRecurrence);
          });
        }

        break;
      case ActionTypes.CARD_RECURRENCE_CREATE__SUCCESS:
      case ActionTypes.CARD_RECURRENCE_CREATE_HANDLE:
      case ActionTypes.CARD_RECURRENCE_UPDATE__SUCCESS:
      case ActionTypes.CARD_RECURRENCE_UPDATE_HANDLE:
        CardRecurrence.upsert(payload.cardRecurrence);

        break;
      case ActionTypes.CARD_RECURRENCE_DELETE:
        CardRecurrence.withId(payload.id).delete();

        break;
      case ActionTypes.CARD_RECURRENCE_DELETE__SUCCESS:
      case ActionTypes.CARD_RECURRENCE_DELETE_HANDLE: {
        const cardRecurrenceModel = CardRecurrence.withId(payload.cardRecurrence.id);

        if (cardRecurrenceModel) {
          cardRecurrenceModel.delete();
        }

        break;
      }
      case ActionTypes.CARD_DELETE:
      case ActionTypes.CARD_DELETE__SUCCESS:
      case ActionTypes.CARD_DELETE_HANDLE: {
        // A recurrence goes with its template
        const cardId = payload.id || (payload.card && payload.card.id);

        CardRecurrence.filter({
          templateCardId: cardId,
        }).delete();

        break;
      }
      default:
    }
  }
}
