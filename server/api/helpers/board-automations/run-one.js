/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

// Runs the actions of a rule, in order, on a card, on behalf of the user who set the rule up,
// through the same helpers controllers use, so real-time updates, webhooks and the action log
// work as usual. Returns null, running nothing, when the card is gone, is a template, is in the
// trash or has left the rule's board, or that user is deactivated or can no longer edit the
// board. An action whose list, label or user is gone, or that changes nothing, is skipped.

const { POSITION_GAP } = require('../../../constants');
const { ActionTypes } = require('../../../utils/automation');

const DAY = 24 * 60 * 60 * 1000;

module.exports = {
  inputs: {
    record: {
      type: 'ref',
      required: true,
    },
    cardId: {
      type: 'string',
      required: true,
    },
  },

  async fn(inputs) {
    const { record } = inputs;

    const path = await sails.helpers.cards
      .getPathToProjectById(inputs.cardId)
      .intercept('pathNotFound', () => null);

    if (
      !path ||
      path.card.isTemplate ||
      path.board.id !== record.boardId ||
      path.list.type === List.Types.TRASH
    ) {
      return null;
    }

    const { project, board } = path;
    let { card, list } = path;

    const actorUser = await User.qm.getOneById(record.creatorUserId, {
      withDeactivated: false,
    });

    if (!actorUser) {
      return null;
    }

    const boardMembership = await BoardMembership.qm.getOneByBoardIdAndUserId(
      board.id,
      actorUser.id,
    );

    if (!boardMembership || boardMembership.role !== BoardMembership.Roles.EDITOR) {
      return null;
    }

    const updateCard = async (values) => {
      const nextCard = await sails.helpers.cards.updateOne.with({
        project,
        board,
        list,
        values,
        actorUser,
        record: card,
      });

      if (nextCard) {
        card = nextCard;
      }
    };

    const runAction = async (action) => {
      switch (action.type) {
        case ActionTypes.MOVE_CARD: {
          if (action.listId === card.listId) {
            return;
          }

          const nextList = await List.qm.getOneById(action.listId, {
            boardId: board.id,
          });

          if (!nextList || nextList.type === List.Types.TRASH) {
            return;
          }

          const values = {
            list: nextList,
          };

          if (sails.helpers.lists.isFinite(nextList)) {
            const cards = await Card.qm.getByListId(nextList.id);

            values.position =
              cards.length > 0 ? _.maxBy(cards, 'position').position + POSITION_GAP : POSITION_GAP;
          }

          await updateCard(values);
          list = nextList;

          return;
        }
        case ActionTypes.ADD_LABEL: {
          const label = await Label.qm.getOneById(action.labelId, {
            boardId: board.id,
          });

          if (!label) {
            return;
          }

          await sails.helpers.cardLabels.createOne
            .with({
              project,
              board,
              list,
              actorUser,
              values: {
                card,
                label,
              },
            })
            .tolerate('labelAlreadyInCard');

          return;
        }
        case ActionTypes.REMOVE_LABEL: {
          const cardLabel = await CardLabel.qm.getOneByCardIdAndLabelId(card.id, action.labelId);

          if (!cardLabel) {
            return;
          }

          await sails.helpers.cardLabels.deleteOne.with({
            project,
            board,
            list,
            card,
            actorUser,
            record: cardLabel,
          });

          return;
        }
        case ActionTypes.ADD_MEMBER: {
          const memberBoardMembership = await BoardMembership.qm.getOneByBoardIdAndUserId(
            board.id,
            action.userId,
          );

          if (!memberBoardMembership) {
            return;
          }

          const user = await User.qm.getOneById(action.userId);

          if (!user) {
            return;
          }

          await sails.helpers.cardMemberships.createOne
            .with({
              project,
              board,
              list,
              actorUser,
              values: {
                card,
                user,
              },
            })
            .tolerate('userAlreadyCardMember');

          return;
        }
        case ActionTypes.REMOVE_MEMBER: {
          const cardMembership = await CardMembership.qm.getOneByCardIdAndUserId(
            card.id,
            action.userId,
          );

          if (!cardMembership) {
            return;
          }

          const user = await User.qm.getOneById(action.userId);

          await sails.helpers.cardMemberships.deleteOne.with({
            user,
            project,
            board,
            list,
            card,
            actorUser,
            record: cardMembership,
          });

          return;
        }
        case ActionTypes.SET_DUE_DATE: {
          const dueDate = new Date(Date.now() + action.days * DAY);

          await updateCard({
            dueDate: dueDate.toISOString(),
            // A start date after the new due date would be rejected, so it is cleared
            ...(card.startDate && new Date(card.startDate) > dueDate && { startDate: null }),
          });

          return;
        }
        case ActionTypes.CLEAR_DUE_DATE:
          if (card.dueDate) {
            await updateCard({
              dueDate: null,
            });
          }

          return;
        case ActionTypes.COMPLETE_DUE_DATE:
          if (card.dueDate && !card.isDueCompleted) {
            await updateCard({
              isDueCompleted: true,
            });
          }

          return;
        case ActionTypes.POST_COMMENT:
          await sails.helpers.comments.createOne.with({
            project,
            board,
            list,
            values: {
              card,
              text: action.text,
              user: actorUser,
            },
          });

          break;
        default:
      }
    };

    // eslint-disable-next-line no-restricted-syntax
    for (const action of record.actions) {
      try {
        await runAction(action); // eslint-disable-line no-await-in-loop
      } catch (error) {
        sails.log.error(
          `Board automation ${record.id} failed on ${action.type} for card ${card.id}: ${error}`,
        );
      }
    }

    return card;
  },
};
