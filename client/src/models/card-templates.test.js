/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import orm from '../orm';
import { ListTypes } from '../constants/Enums';

// The models import browser-only modules that these tests do not use
jest.mock('../assets/images/deleted-user.png', () => 'deleted-user.png');
jest.mock('../constants/Config', () => ({
  __esModule: true,
  default: {},
}));

const createSession = () => {
  const session = orm.session(orm.getEmptyState());

  session.Board.create({ id: 'board' });

  session.List.create({
    id: 'list',
    boardId: 'board',
    type: ListTypes.ACTIVE,
    position: 65536,
  });

  session.Card.create({
    id: 'card',
    boardId: 'board',
    listId: 'list',
    position: 65536,
    name: 'Card',
  });

  session.Card.create({
    id: 'template',
    boardId: 'board',
    listId: 'list',
    position: 131072,
    name: 'Template',
    isTemplate: true,
  });

  return session;
};

describe('card templates', () => {
  test('are left out of the cards of their list', () => {
    const session = createSession();

    const cardIds = session.List.withId('list')
      .getCardsModelArray()
      .map((cardModel) => cardModel.id);

    expect(cardIds).toEqual(['card']);
  });

  test('are left out of the cards of their board', () => {
    const session = createSession();

    const cardIds = session.Board.withId('board')
      .getCardsModelArray()
      .map((cardModel) => cardModel.id);

    expect(cardIds).toEqual(['card']);
  });

  test('default to normal cards', () => {
    const session = createSession();

    expect(session.Card.withId('card').isTemplate).toBe(false);
  });
});
