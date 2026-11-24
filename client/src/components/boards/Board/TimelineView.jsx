/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import classNames from 'classnames';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Icon } from 'semantic-ui-react';
import { addDays, isSameDay, isWeekend, startOfDay, startOfWeek } from 'date-fns';
import { push } from '../../../lib/redux-router';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import Paths from '../../../constants/Paths';
import { BoardMembershipRoles } from '../../../constants/Enums';
import { DragModes, getDraggedValues, layoutBars } from '../../../utils/timeline';

import styles from './TimelineView.module.scss';

const DAYS_TOTAL = 42;
const STEP_DAYS = 7;
const LANE_HEIGHT = 30;
const TRACK_PADDING = 6;

// A pointer that moves less than this is a click that opens the card
const CLICK_TOLERANCE = 4;

const DRAG_TYPE = 'application/x-tama-card-id';

// Cards dropped on a day land at noon, so the date reads the same in every time
// zone a teammate may be in.
const DEFAULT_HOUR = 12;

const getInitialRangeStart = (locale) => addDays(startOfWeek(new Date(), { locale }), -STEP_DAYS);

const getDayIndex = (element, clientX) => {
  const rect = element.getBoundingClientRect();
  const index = Math.floor(((clientX - rect.left) / rect.width) * DAYS_TOTAL);

  return Math.min(Math.max(index, 0), DAYS_TOTAL - 1);
};

const TimelineView = React.memo(() => {
  const cards = useSelector(selectors.selectFilteredCardsForCurrentBoard);
  const lists = useSelector(selectors.selectKanbanListsForCurrentBoard);

  const canEdit = useSelector((state) => {
    const boardMembership = selectors.selectCurrentUserMembershipForCurrentBoard(state);
    return !!boardMembership && boardMembership.role === BoardMembershipRoles.EDITOR;
  });

  const dispatch = useDispatch();
  const [t, i18n] = useTranslation();
  const locale = i18n.dateFns.getLocale();

  const [rangeStart, setRangeStart] = useState(() => getInitialRangeStart(locale));
  const [drag, setDrag] = useState(null);
  const [dropListId, setDropListId] = useState(null);
  const dragRef = useRef(null);

  const today = new Date();

  const days = useMemo(
    () => Array.from({ length: DAYS_TOTAL }, (_, index) => addDays(rangeStart, index)),
    [rangeStart],
  );

  const cardsById = useMemo(
    () => Object.fromEntries(cards.map((card) => [card.id, card])),
    [cards],
  );

  const { rows, undatedCards } = useMemo(() => {
    const cardsByListId = {};
    const undated = [];

    cards.forEach((card) => {
      if (card.startDate || card.dueDate) {
        (cardsByListId[card.listId] = cardsByListId[card.listId] || []).push(card);
      } else {
        undated.push(card);
      }
    });

    return {
      rows: lists.map((list) => ({
        list,
        ...layoutBars(cardsByListId[list.id] || [], rangeStart, DAYS_TOTAL),
      })),
      undatedCards: undated,
    };
  }, [cards, lists, rangeStart]);

  const handlePreviousClick = useCallback(() => {
    setRangeStart((prevRangeStart) => addDays(prevRangeStart, -STEP_DAYS));
  }, []);

  const handleNextClick = useCallback(() => {
    setRangeStart((prevRangeStart) => addDays(prevRangeStart, STEP_DAYS));
  }, []);

  const handleTodayClick = useCallback(() => {
    setRangeStart(getInitialRangeStart(locale));
  }, [locale]);

  const openCard = useCallback(
    (id) => {
      dispatch(push(Paths.CARDS.replace(':id', id)));
    },
    [dispatch],
  );

  const handleBarPointerDown = useCallback(
    (event) => {
      if (event.button !== 0) {
        return;
      }

      const { id, mode } = event.currentTarget.dataset;

      if (!canEdit) {
        if (mode === DragModes.MOVE) {
          openCard(id);
        }

        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);

      const track = event.currentTarget.closest(`.${styles.track}`);

      dragRef.current = {
        id,
        mode,
        originX: event.clientX,
        dayWidth: track.getBoundingClientRect().width / DAYS_TOTAL,
        isMoved: false,
      };

      setDrag({
        id,
        mode,
        days: 0,
      });
    },
    [canEdit, openCard],
  );

  const handleBarPointerMove = useCallback((event) => {
    const { current } = dragRef;

    if (!current) {
      return;
    }

    const offset = event.clientX - current.originX;

    if (Math.abs(offset) > CLICK_TOLERANCE) {
      current.isMoved = true;
    }

    const nextDays = Math.round(offset / current.dayWidth);

    setDrag((prevDrag) =>
      prevDrag && prevDrag.days !== nextDays
        ? {
            ...prevDrag,
            days: nextDays,
          }
        : prevDrag,
    );
  }, []);

  const handleBarPointerUp = useCallback(
    (event) => {
      const { current } = dragRef;

      if (!current) {
        return;
      }

      dragRef.current = null;
      setDrag(null);

      if (!current.isMoved) {
        if (current.mode === DragModes.MOVE) {
          openCard(current.id);
        }

        return;
      }

      const card = cardsById[current.id];
      const values =
        card &&
        getDraggedValues(
          card,
          current.mode,
          Math.round((event.clientX - current.originX) / current.dayWidth),
        );

      if (values) {
        dispatch(entryActions.updateCard(card.id, values));
      }
    },
    [cardsById, dispatch, openCard],
  );

  const handleBarPointerCancel = useCallback(() => {
    dragRef.current = null;
    setDrag(null);
  }, []);

  // Pointer clicks open the card on pointer up; this covers Enter and Space
  const handleBarKeyboardClick = useCallback(
    (event) => {
      if (event.detail === 0) {
        openCard(event.currentTarget.dataset.id);
      }
    },
    [openCard],
  );

  const handleUndatedDragStart = useCallback((event) => {
    event.dataTransfer.setData(DRAG_TYPE, event.currentTarget.dataset.id);
    event.dataTransfer.effectAllowed = 'move'; // eslint-disable-line no-param-reassign
  }, []);

  const handleUndatedDragEnd = useCallback(() => {
    setDropListId(null);
  }, []);

  const handleUndatedClick = useCallback(
    (event) => {
      openCard(event.currentTarget.dataset.id);
    },
    [openCard],
  );

  const handleTrackDragOver = useCallback((event) => {
    if (!event.dataTransfer.types.includes(DRAG_TYPE)) {
      return;
    }

    event.preventDefault();
    setDropListId(event.currentTarget.dataset.listId);
  }, []);

  const handleTrackDragLeave = useCallback(() => {
    setDropListId(null);
  }, []);

  const handleTrackDrop = useCallback(
    (event) => {
      event.preventDefault();
      setDropListId(null);

      const card = cardsById[event.dataTransfer.getData(DRAG_TYPE)];

      if (!card) {
        return;
      }

      const dueDate = startOfDay(days[getDayIndex(event.currentTarget, event.clientX)]);
      dueDate.setHours(DEFAULT_HOUR);

      dispatch(
        entryActions.updateCard(card.id, {
          dueDate,
        }),
      );
    },
    [cardsById, days, dispatch],
  );

  // Where a bar is drawn while it is being dragged
  const getBarIndexes = (bar) => {
    let { startIndex, endIndex } = bar;

    if (drag && drag.id === bar.card.id) {
      if (drag.mode !== DragModes.END) {
        startIndex += drag.days;
      }

      if (drag.mode !== DragModes.START) {
        endIndex += drag.days;
      }

      if (startIndex > endIndex) {
        if (drag.mode === DragModes.START) {
          startIndex = endIndex;
        } else {
          endIndex = startIndex;
        }
      }
    }

    return { startIndex, endIndex };
  };

  const renderBar = (bar) => {
    const { card } = bar;
    const { startIndex, endIndex } = getBarIndexes(bar);
    const isOverdue = !!card.dueDate && !card.isDueCompleted && card.dueDate < today;
    const isDragging = !!drag && drag.id === card.id;

    return (
      <div
        key={card.id}
        title={card.name}
        className={classNames(
          styles.bar,
          card.isDueCompleted && styles.barCompleted,
          isOverdue && styles.barOverdue,
          bar.isClippedStart && styles.barClippedStart,
          bar.isClippedEnd && styles.barClippedEnd,
          isDragging && styles.barDragging,
        )}
        style={{
          left: `${(startIndex / DAYS_TOTAL) * 100}%`,
          width: `${((endIndex - startIndex + 1) / DAYS_TOTAL) * 100}%`,
          top: TRACK_PADDING + bar.lane * LANE_HEIGHT,
        }}
      >
        {canEdit && !bar.isClippedStart && (
          <span
            data-id={card.id}
            data-mode={DragModes.START}
            className={classNames(styles.handle, styles.handleStart)}
            onPointerDown={handleBarPointerDown}
            onPointerMove={handleBarPointerMove}
            onPointerUp={handleBarPointerUp}
            onPointerCancel={handleBarPointerCancel}
          />
        )}
        <button
          type="button"
          data-id={card.id}
          data-mode={DragModes.MOVE}
          className={classNames(styles.barBody, canEdit && styles.barBodyDraggable)}
          onClick={handleBarKeyboardClick}
          onPointerDown={handleBarPointerDown}
          onPointerMove={handleBarPointerMove}
          onPointerUp={handleBarPointerUp}
          onPointerCancel={handleBarPointerCancel}
        >
          {card.name}
        </button>
        {canEdit && !bar.isClippedEnd && (
          <span
            data-id={card.id}
            data-mode={DragModes.END}
            className={classNames(styles.handle, styles.handleEnd)}
            onPointerDown={handleBarPointerDown}
            onPointerMove={handleBarPointerMove}
            onPointerUp={handleBarPointerUp}
            onPointerCancel={handleBarPointerCancel}
          />
        )}
      </div>
    );
  };

  const renderDayCells = () =>
    days.map((day) => (
      <div
        key={day.getTime()}
        className={classNames(
          styles.dayCell,
          isWeekend(day) && styles.dayCellWeekend,
          isSameDay(day, today) && styles.dayCellToday,
        )}
      />
    ));

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div className={styles.navigation}>
          <Button
            icon
            basic
            size="small"
            aria-label={t('action.previousWeek')}
            title={t('action.previousWeek')}
            onClick={handlePreviousClick}
          >
            <Icon name="chevron left" />
          </Button>
          <Button basic size="small" onClick={handleTodayClick}>
            {t('common.today')}
          </Button>
          <Button
            icon
            basic
            size="small"
            aria-label={t('action.nextWeek')}
            title={t('action.nextWeek')}
            onClick={handleNextClick}
          >
            <Icon name="chevron right" />
          </Button>
        </div>
        <h2 className={styles.title}>
          {i18n.dateFns.format(days[0], 'd MMM')} &ndash;{' '}
          {i18n.dateFns.format(days[DAYS_TOTAL - 1], 'd MMM yyyy')}
        </h2>
      </div>
      <div className={styles.timeline} style={{ '--days-total': DAYS_TOTAL }}>
        <div className={styles.corner} />
        <div className={styles.days}>
          {days.map((day, index) => (
            <div
              key={day.getTime()}
              className={classNames(
                styles.day,
                isWeekend(day) && styles.dayWeekend,
                isSameDay(day, today) && styles.dayToday,
              )}
            >
              <span className={styles.dayMonth}>
                {(index === 0 || day.getDate() === 1) && i18n.dateFns.format(day, 'MMM')}
              </span>
              <span className={styles.dayWeekday}>{i18n.dateFns.format(day, 'EEEEE')}</span>
              <span className={styles.dayNumber}>{day.getDate()}</span>
            </div>
          ))}
        </div>
        {rows.map(({ list, bars, lanesTotal }) => (
          <React.Fragment key={list.id}>
            <div className={styles.rowLabel} title={list.name || t(`common.${list.type}`)}>
              {list.name || t(`common.${list.type}`)}
            </div>
            <div
              data-list-id={list.id}
              className={classNames(styles.track, dropListId === list.id && styles.trackDropTarget)}
              style={{ height: TRACK_PADDING * 2 + Math.max(lanesTotal, 1) * LANE_HEIGHT }}
              onDragOver={canEdit ? handleTrackDragOver : undefined}
              onDragLeave={canEdit ? handleTrackDragLeave : undefined}
              onDrop={canEdit ? handleTrackDrop : undefined}
            >
              <div className={styles.dayCells}>{renderDayCells()}</div>
              {bars.map(renderBar)}
            </div>
          </React.Fragment>
        ))}
      </div>
      {(undatedCards.length > 0 || canEdit) && (
        <div className={styles.undated}>
          <div className={styles.undatedTitle}>
            {t('common.noDates')}
            <span className={styles.undatedCount}>{undatedCards.length}</span>
          </div>
          {canEdit && (
            <p className={styles.undatedHint}>
              {t('common.dragCardOntoTheTimelineToSetItsDueDate')}
            </p>
          )}
          <div className={styles.undatedCards}>
            {undatedCards.map((card) => (
              <button
                key={card.id}
                type="button"
                data-id={card.id}
                draggable={canEdit}
                title={card.name}
                className={styles.undatedCard}
                onClick={handleUndatedClick}
                onDragStart={handleUndatedDragStart}
                onDragEnd={handleUndatedDragEnd}
              >
                {card.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export default TimelineView;
