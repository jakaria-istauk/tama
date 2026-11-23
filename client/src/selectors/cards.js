/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { createSelector } from 'redux-orm';

import orm from '../orm';
import { selectRecentCardId } from './core';
import { selectPath } from './router';
import { selectCurrentUserId } from './users';
import { buildCustomFieldValueId } from '../models/CustomFieldValue';
import { isLocalId } from '../utils/local-id';

export const makeSelectCardById = () =>
  createSelector(
    orm,
    (_, id) => id,
    ({ Card }, id) => {
      const cardModel = Card.withId(id);

      if (!cardModel) {
        return cardModel;
      }

      return {
        ...cardModel.ref,
        isPersisted: !isLocalId(id),
      };
    },
  );

export const selectCardById = makeSelectCardById();

export const makeSelectCardIndexById = () =>
  createSelector(
    orm,
    (_, id) => id,
    ({ Card }, id) => {
      const cardModel = Card.withId(id);

      if (!cardModel) {
        return cardModel;
      }

      return cardModel.list
        .getCardsModelArray()
        .findIndex((cardModelItem) => cardModelItem.id === cardModel.id);
    },
  );

export const selectCardIndexById = makeSelectCardIndexById();

export const makeSelectUserIdsByCardId = () =>
  createSelector(
    orm,
    (_, id) => id,
    ({ Card }, id) => {
      const cardModel = Card.withId(id);

      if (!cardModel) {
        return cardModel;
      }

      return cardModel.users.toRefArray().map((user) => user.id);
    },
  );

export const selectUserIdsByCardId = makeSelectUserIdsByCardId();

export const makeSelectLabelIdsByCardId = () =>
  createSelector(
    orm,
    (_, id) => id,
    ({ Card }, id) => {
      const cardModel = Card.withId(id);

      if (!cardModel) {
        return cardModel;
      }

      return cardModel.labels.toRefArray().map((label) => label.id);
    },
  );

export const selectLabelIdsByCardId = makeSelectLabelIdsByCardId();

export const makeSelectShownOnFrontOfCardTaskListIdsByCardId = () =>
  createSelector(
    orm,
    (_, id) => id,
    ({ Card }, id) => {
      const cardModel = Card.withId(id);

      if (!cardModel) {
        return cardModel;
      }

      return cardModel.getShownOnFrontOfCardTaskListsModelArray().map((taskList) => taskList.id);
    },
  );

export const selectShownOnFrontOfCardTaskListIdsByCardId =
  makeSelectShownOnFrontOfCardTaskListIdsByCardId();

export const makeSelectAttachmentsTotalByCardId = () =>
  createSelector(
    orm,
    (_, id) => id,
    ({ Card }, id) => {
      const cardModel = Card.withId(id);

      if (!cardModel) {
        return cardModel;
      }

      return cardModel.attachments.count();
    },
  );

export const selectAttachmentsTotalByCardId = makeSelectAttachmentsTotalByCardId();

export const makeSelectShownOnFrontOfCardCustomFieldValueIdsByCardId = () =>
  createSelector(
    orm,
    (_, id) => id,
    ({ Card, CustomFieldValue }, id) => {
      if (!id) {
        return id;
      }

      const cardModel = Card.withId(id);

      if (!cardModel) {
        return cardModel;
      }

      return [
        ...cardModel.board
          .getCustomFieldGroupsQuerySet()
          .toModelArray()
          .flatMap((customFieldGroupModel) =>
            customFieldGroupModel
              .getShownOnFrontOfCardCustomFieldsModelArray()
              .flatMap((customFieldModel) => {
                const customFieldValue = CustomFieldValue.withId(
                  buildCustomFieldValueId({
                    cardId: id,
                    customFieldGroupId: customFieldGroupModel.id,
                    customFieldId: customFieldModel.id,
                  }),
                );

                return customFieldValue ? customFieldValue.id : [];
              }),
          ),
        ...cardModel
          .getCustomFieldGroupsQuerySet()
          .toModelArray()
          .flatMap((customFieldGroupModel) =>
            customFieldGroupModel
              .getShownOnFrontOfCardCustomFieldsModelArray()
              .flatMap((customFieldModel) => {
                const customFieldValue = CustomFieldValue.withId(
                  buildCustomFieldValueId({
                    cardId: id,
                    customFieldGroupId: customFieldGroupModel.id,
                    customFieldId: customFieldModel.id,
                  }),
                );

                return customFieldValue ? customFieldValue.id : [];
              }),
          ),
      ];
    },
  );

export const selectShownOnFrontOfCardCustomFieldValueIdsByCardId =
  makeSelectShownOnFrontOfCardCustomFieldValueIdsByCardId();

export const makeSelectNotificationsByCardId = () =>
  createSelector(
    orm,
    (_, id) => id,
    ({ Card }, id) => {
      const cardModel = Card.withId(id);

      if (!cardModel) {
        return cardModel;
      }

      return cardModel.getUnreadNotificationsQuerySet().toRefArray();
    },
  );

export const selectNotificationsByCardId = makeSelectNotificationsByCardId();

export const makeSelectNotificationsTotalByCardId = () =>
  createSelector(
    orm,
    (_, id) => id,
    ({ Card }, id) => {
      const cardModel = Card.withId(id);

      if (!cardModel) {
        return cardModel;
      }

      return cardModel.getUnreadNotificationsQuerySet().count();
    },
  );

export const selectNotificationsTotalByCardId = makeSelectNotificationsTotalByCardId();

export const makeSelectIsCardWithIdRecent = () =>
  createSelector(
    orm,
    (_, id) => id,
    (state) => selectRecentCardId(state),
    ({ Card }, id, recentCardId) => {
      const cardModel = Card.withId(id);

      if (!cardModel) {
        return false;
      }

      return cardModel.id === recentCardId;
    },
  );

export const selectIsCardWithIdRecent = makeSelectIsCardWithIdRecent();

export const selectIsCardWithIdAvailableForCurrentUser = createSelector(
  orm,
  (_, id) => id,
  (state) => selectCurrentUserId(state),
  ({ Card, User }, id, currentUserId) => {
    const cardModel = Card.withId(id);

    if (!cardModel) {
      return false;
    }

    const currentUserModel = User.withId(currentUserId);
    return cardModel.isAvailableForUser(currentUserModel);
  },
);

export const selectCurrentCard = createSelector(
  orm,
  (state) => selectPath(state).cardId,
  ({ Card }, id) => {
    if (!id) {
      return id;
    }

    const cardModel = Card.withId(id);

    if (!cardModel) {
      return cardModel;
    }

    return cardModel.ref;
  },
);

export const selectUserIdsForCurrentCard = createSelector(
  orm,
  (state) => selectPath(state).cardId,
  ({ Card }, id) => {
    if (!id) {
      return id;
    }

    const cardModel = Card.withId(id);

    if (!cardModel) {
      return cardModel;
    }

    return cardModel.users.toRefArray().map((user) => user.id);
  },
);

export const selectLabelIdsForCurrentCard = createSelector(
  orm,
  (state) => selectPath(state).cardId,
  ({ Card }, id) => {
    if (!id) {
      return id;
    }

    const cardModel = Card.withId(id);

    if (!cardModel) {
      return cardModel;
    }

    return cardModel.labels.toRefArray().map((label) => label.id);
  },
);

export const selectTaskListIdsForCurrentCard = createSelector(
  orm,
  (state) => selectPath(state).cardId,
  ({ Card }, id) => {
    if (!id) {
      return id;
    }

    const cardModel = Card.withId(id);

    if (!cardModel) {
      return cardModel;
    }

    return cardModel
      .getTaskListsQuerySet()
      .toRefArray()
      .map((taskList) => taskList.id);
  },
);

export const selectAttachmentIdsForCurrentCard = createSelector(
  orm,
  (state) => selectPath(state).cardId,
  ({ Card }, id) => {
    if (!id) {
      return id;
    }

    const cardModel = Card.withId(id);

    if (!cardModel) {
      return cardModel;
    }

    return cardModel
      .getAttachmentsQuerySet()
      .toRefArray()
      .map((attachment) => attachment.id);
  },
);

export const selectImageAttachmentIdsExceptCoverForCurrentCard = createSelector(
  orm,
  (state) => selectPath(state).cardId,
  ({ Card }, id) => {
    if (!id) {
      return id;
    }

    const cardModel = Card.withId(id);

    if (!cardModel) {
      return cardModel;
    }

    return cardModel
      .getAttachmentsQuerySet()
      .toModelArray()
      .filter(
        (attachmentModel) =>
          attachmentModel.data && attachmentModel.data.image && !attachmentModel.coveredCard,
      )
      .map((attachmentModel) => attachmentModel.id);
  },
);

export const selectAttachmentsForCurrentCard = createSelector(
  orm,
  (state) => selectPath(state).cardId,
  ({ Card }, id) => {
    if (!id) {
      return id;
    }

    const cardModel = Card.withId(id);

    if (!cardModel) {
      return cardModel;
    }

    return cardModel.getAttachmentsQuerySet().toRefArray();
  },
);

export const selectCustomFieldGroupIdsForCurrentCard = createSelector(
  orm,
  (state) => selectPath(state).cardId,
  ({ Card }, id) => {
    if (!id) {
      return id;
    }

    const cardModel = Card.withId(id);

    if (!cardModel) {
      return cardModel;
    }

    return cardModel
      .getCustomFieldGroupsQuerySet()
      .toRefArray()
      .map((customFieldGroup) => customFieldGroup.id);
  },
);

export const selectCommentIdsForCurrentCard = createSelector(
  orm,
  (state) => selectPath(state).cardId,
  ({ Card }, id) => {
    if (!id) {
      return id;
    }

    const cardModel = Card.withId(id);

    if (!cardModel) {
      return cardModel;
    }

    return cardModel.getCommentsModelArray().map((commentModel) => commentModel.id);
  },
);

export const selectActivityIdsForCurrentCard = createSelector(
  orm,
  (state) => selectPath(state).cardId,
  ({ Card }, id) => {
    if (!id) {
      return id;
    }

    const cardModel = Card.withId(id);

    if (!cardModel) {
      return cardModel;
    }

    return cardModel.getActivitiesModelArray().map((activity) => activity.id);
  },
);

// Ids compare by length first, as in the card's comment and activity query sets
const compareIds = (a, b) => {
  if (a.length !== b.length) {
    return a.length - b.length;
  }

  return a < b ? -1 : a > b ? 1 : 0; // eslint-disable-line no-nested-ternary
};

// Comments and activities of the current card in one list, newest first. Ids grow with time
// across both, so they order the list. While a list still has older pages to fetch, items
// older than its oldest loaded one are held back, so nothing shows out of order.
export const selectTimelineItemsForCurrentCard = createSelector(
  orm,
  (state) => selectPath(state).cardId,
  ({ Card }, id) => {
    if (!id) {
      return [];
    }

    const cardModel = Card.withId(id);

    if (!cardModel) {
      return [];
    }

    const commentIds = cardModel.getCommentsModelArray().map((commentModel) => commentModel.id);
    const activityIds = cardModel
      .getActivitiesModelArray()
      .map((activityModel) => activityModel.id);

    const cutoffs = [];

    if (cardModel.isAllCommentsFetched === false && commentIds.length > 0) {
      cutoffs.push(commentIds[commentIds.length - 1]);
    }

    if (cardModel.isAllActivitiesFetched === false && activityIds.length > 0) {
      cutoffs.push(activityIds[activityIds.length - 1]);
    }

    const cutoff = cutoffs.sort(compareIds).pop();

    return [
      ...commentIds.map((itemId) => ({ type: 'comment', id: itemId })),
      ...activityIds.map((itemId) => ({ type: 'activity', id: itemId })),
    ]
      .filter((item) => !cutoff || compareIds(item.id, cutoff) >= 0)
      .sort((a, b) => compareIds(b.id, a.id));
  },
);

export const selectIsCurrentUserInCurrentCard = createSelector(
  orm,
  (state) => selectPath(state).cardId,
  (state) => selectCurrentUserId(state),
  ({ Card }, id, currentUserId) => {
    if (!id) {
      return false;
    }

    const cardModel = Card.withId(id);

    if (!cardModel) {
      return false;
    }

    return cardModel.hasUserWithId(currentUserId);
  },
);

export default {
  makeSelectCardById,
  selectCardById,
  makeSelectCardIndexById,
  selectCardIndexById,
  makeSelectUserIdsByCardId,
  selectUserIdsByCardId,
  makeSelectLabelIdsByCardId,
  selectLabelIdsByCardId,
  makeSelectShownOnFrontOfCardTaskListIdsByCardId,
  selectShownOnFrontOfCardTaskListIdsByCardId,
  makeSelectAttachmentsTotalByCardId,
  makeSelectShownOnFrontOfCardCustomFieldValueIdsByCardId,
  selectShownOnFrontOfCardCustomFieldValueIdsByCardId,
  selectAttachmentsTotalByCardId,
  makeSelectNotificationsByCardId,
  selectNotificationsByCardId,
  makeSelectNotificationsTotalByCardId,
  selectNotificationsTotalByCardId,
  makeSelectIsCardWithIdRecent,
  selectIsCardWithIdRecent,
  selectIsCardWithIdAvailableForCurrentUser,
  selectCurrentCard,
  selectUserIdsForCurrentCard,
  selectLabelIdsForCurrentCard,
  selectTaskListIdsForCurrentCard,
  selectAttachmentIdsForCurrentCard,
  selectImageAttachmentIdsExceptCoverForCurrentCard,
  selectAttachmentsForCurrentCard,
  selectCustomFieldGroupIdsForCurrentCard,
  selectCommentIdsForCurrentCard,
  selectActivityIdsForCurrentCard,
  selectTimelineItemsForCurrentCard,
  selectIsCurrentUserInCurrentCard,
};
