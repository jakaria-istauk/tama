/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { attr, fk } from 'redux-orm';

import BaseModel from './BaseModel';
import ActionTypes from '../constants/ActionTypes';

// A named board filter that belongs to one user. Only the current user's
// saved filters ever reach the client.
export default class extends BaseModel {
  static modelName = 'SavedFilter';

  static fields = {
    id: attr(),
    name: attr(),
    filter: attr(),
    createdAt: attr({
      getDefault: () => new Date(),
    }),
    boardId: fk({
      to: 'Board',
      as: 'board',
      relatedName: 'savedFilters',
    }),
    userId: fk({
      to: 'User',
      as: 'user',
      relatedName: 'savedFilters',
    }),
  };

  static reducer({ type, payload }, SavedFilter) {
    switch (type) {
      case ActionTypes.SOCKET_RECONNECT_HANDLE:
        SavedFilter.all().delete();

        payload.savedFilters.forEach((savedFilter) => {
          SavedFilter.upsert(savedFilter);
        });

        break;
      case ActionTypes.CORE_INITIALIZE:
        payload.savedFilters.forEach((savedFilter) => {
          SavedFilter.upsert(savedFilter);
        });

        break;
      case ActionTypes.SAVED_FILTER_CREATE:
      case ActionTypes.SAVED_FILTER_CREATE_HANDLE:
      case ActionTypes.SAVED_FILTER_UPDATE__SUCCESS:
      case ActionTypes.SAVED_FILTER_UPDATE_HANDLE:
        SavedFilter.upsert(payload.savedFilter);

        break;
      case ActionTypes.SAVED_FILTER_CREATE__SUCCESS:
        SavedFilter.withId(payload.localId).delete();
        SavedFilter.upsert(payload.savedFilter);

        break;
      case ActionTypes.SAVED_FILTER_CREATE__FAILURE:
        SavedFilter.withId(payload.localId).delete();

        break;
      case ActionTypes.SAVED_FILTER_UPDATE:
        SavedFilter.withId(payload.id).update(payload.data);

        break;
      case ActionTypes.SAVED_FILTER_DELETE:
        SavedFilter.withId(payload.id).delete();

        break;
      case ActionTypes.SAVED_FILTER_DELETE__SUCCESS:
      case ActionTypes.SAVED_FILTER_DELETE_HANDLE: {
        const savedFilterModel = SavedFilter.withId(payload.savedFilter.id);

        if (savedFilterModel) {
          savedFilterModel.delete();
        }

        break;
      }
      default:
    }
  }
}
