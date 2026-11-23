/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { attr, fk } from 'redux-orm';

import BaseModel from './BaseModel';
import ActionTypes from '../constants/ActionTypes';

// A "when this happens, do that" rule of a board. The server runs it.
export default class extends BaseModel {
  static modelName = 'BoardAutomation';

  static fields = {
    id: attr(),
    name: attr(),
    trigger: attr(),
    actions: attr(),
    isEnabled: attr(),
    boardId: fk({
      to: 'Board',
      as: 'board',
      relatedName: 'automations',
    }),
    creatorUserId: fk({
      to: 'User',
      as: 'creatorUser',
      relatedName: 'createdBoardAutomations',
    }),
  };

  static reducer({ type, payload }, BoardAutomation) {
    switch (type) {
      case ActionTypes.LOCATION_CHANGE_HANDLE:
      case ActionTypes.CORE_INITIALIZE:
      case ActionTypes.BOARD_FETCH__SUCCESS:
        if (payload.boardAutomations) {
          payload.boardAutomations.forEach((boardAutomation) => {
            BoardAutomation.upsert(boardAutomation);
          });
        }

        break;
      case ActionTypes.SOCKET_RECONNECT_HANDLE:
        BoardAutomation.all().delete();

        if (payload.boardAutomations) {
          payload.boardAutomations.forEach((boardAutomation) => {
            BoardAutomation.upsert(boardAutomation);
          });
        }

        break;
      case ActionTypes.BOARD_AUTOMATION_CREATE__SUCCESS:
      case ActionTypes.BOARD_AUTOMATION_CREATE_HANDLE:
      case ActionTypes.BOARD_AUTOMATION_UPDATE__SUCCESS:
      case ActionTypes.BOARD_AUTOMATION_UPDATE_HANDLE:
        BoardAutomation.upsert(payload.boardAutomation);

        break;
      case ActionTypes.BOARD_AUTOMATION_UPDATE: {
        const boardAutomationModel = BoardAutomation.withId(payload.id);

        if (boardAutomationModel) {
          boardAutomationModel.update(payload.data);
        }

        break;
      }
      case ActionTypes.BOARD_AUTOMATION_DELETE:
        BoardAutomation.withId(payload.id).delete();

        break;
      case ActionTypes.BOARD_AUTOMATION_DELETE__SUCCESS:
      case ActionTypes.BOARD_AUTOMATION_DELETE_HANDLE: {
        const boardAutomationModel = BoardAutomation.withId(payload.boardAutomation.id);

        if (boardAutomationModel) {
          boardAutomationModel.delete();
        }

        break;
      }
      default:
    }
  }
}
