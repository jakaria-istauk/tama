/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useInView } from 'react-intersection-observer';
import { Comment, Loader } from 'semantic-ui-react';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import { isListArchiveOrTrash } from '../../../utils/record-helpers';
import { BoardMembershipRoles } from '../../../constants/Enums';
import AddComment from '../../comments/Comments/Add';
import CommentItem from '../../comments/Comments/Item';
import ActivityItem from '../../activities/CardActivities/Item';

import styles from './Timeline.module.scss';

// Comments and actions of the current card in one list, newest first, with the comment box
const Timeline = React.memo(() => {
  const selectListById = useMemo(() => selectors.makeSelectListById(), []);

  const items = useSelector(selectors.selectTimelineItemsForCurrentCard);

  const { isCommentsFetching, isAllCommentsFetched, isActivitiesFetching, isAllActivitiesFetched } =
    useSelector(selectors.selectCurrentCard);

  const canAddComment = useSelector((state) => {
    const { listId } = selectors.selectCurrentCard(state);
    const list = selectListById(state, listId);

    if (isListArchiveOrTrash(list)) {
      return false;
    }

    const boardMembership = selectors.selectCurrentUserMembershipForCurrentBoard(state);

    if (!boardMembership) {
      return false;
    }

    return boardMembership.role === BoardMembershipRoles.EDITOR || boardMembership.canComment;
  });

  const dispatch = useDispatch();
  const [replyText, setReplyText] = useState();

  const handleReply = useCallback((username) => {
    setReplyText(`@${username} `);
  }, []);

  const handleReplyTextConsumed = useCallback(() => {
    setReplyText(undefined);
  }, []);

  const isFetching = !!isCommentsFetching || !!isActivitiesFetching;
  const isAllFetched = !!isAllCommentsFetched && !!isAllActivitiesFetched;

  const [inViewRef] = useInView({
    threshold: 1,
    onChange: (inView) => {
      if (!inView) {
        return;
      }

      if (!isAllCommentsFetched && !isCommentsFetching) {
        dispatch(entryActions.fetchCommentsInCurrentCard());
      }

      if (!isAllActivitiesFetched && !isActivitiesFetching) {
        dispatch(entryActions.fetchActivitiesInCurrentCard());
      }
    },
  });

  return (
    <>
      {canAddComment && (
        <AddComment initialText={replyText} onInitialTextConsumed={handleReplyTextConsumed} />
      )}
      <div className={styles.itemsWrapper}>
        <Comment.Group className={styles.items}>
          {items.map((item) =>
            item.type === 'comment' ? (
              <CommentItem
                key={`comment-${item.id}`}
                id={item.id}
                canReply={canAddComment}
                onReply={handleReply}
              />
            ) : (
              <ActivityItem key={`activity-${item.id}`} id={item.id} />
            ),
          )}
        </Comment.Group>
      </div>
      <div className={styles.loaderWrapper}>
        {isFetching ? (
          <Loader active inverted inline="centered" size="small" />
        ) : (
          !isAllFetched && <div ref={inViewRef} />
        )}
      </div>
    </>
  );
});

export default Timeline;
