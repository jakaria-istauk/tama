/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useMemo, useState } from 'react';
import classNames from 'classnames';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Icon } from 'semantic-ui-react';
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { push } from '../../../lib/redux-router';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import Paths from '../../../constants/Paths';
import { BoardMembershipRoles } from '../../../constants/Enums';

import styles from './CalendarView.module.scss';

const DRAG_TYPE = 'application/x-tama-card-id';

// Cards dropped on a day with no due date yet land at noon, so the date reads
// the same in every time zone a teammate may be in.
const DEFAULT_HOUR = 12;

const toDayKey = (date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

const moveToDay = (day, dueDate) => {
  const date = new Date(day);

  if (dueDate) {
    date.setHours(
      dueDate.getHours(),
      dueDate.getMinutes(),
      dueDate.getSeconds(),
      dueDate.getMilliseconds(),
    );
  } else {
    date.setHours(DEFAULT_HOUR, 0, 0, 0);
  }

  return date;
};

const CalendarView = React.memo(() => {
  const cards = useSelector(selectors.selectFilteredCardsForCurrentBoard);

  const canEdit = useSelector((state) => {
    const boardMembership = selectors.selectCurrentUserMembershipForCurrentBoard(state);
    return !!boardMembership && boardMembership.role === BoardMembershipRoles.EDITOR;
  });

  const dispatch = useDispatch();
  const [t, i18n] = useTranslation();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [dropDayKey, setDropDayKey] = useState(null);
  const [isUndatedDropTarget, setIsUndatedDropTarget] = useState(false);

  const locale = i18n.dateFns.getLocale();
  const today = new Date();

  const days = useMemo(() => {
    const first = startOfWeek(startOfMonth(month), { locale });
    const last = endOfWeek(endOfMonth(month), { locale });

    const result = [];
    for (let day = first; day <= last; day = addDays(day, 1)) {
      result.push(day);
    }

    return result;
  }, [month, locale]);

  const { cardsByDayKey, undatedCards } = useMemo(() => {
    const byDayKey = {};
    const undated = [];

    cards.forEach((card) => {
      if (card.dueDate) {
        const key = toDayKey(card.dueDate);
        (byDayKey[key] = byDayKey[key] || []).push(card);
      } else {
        undated.push(card);
      }
    });

    Object.values(byDayKey).forEach((dayCards) => {
      dayCards.sort((a, b) => a.dueDate - b.dueDate);
    });

    return {
      cardsByDayKey: byDayKey,
      undatedCards: undated,
    };
  }, [cards]);

  const cardsById = useMemo(
    () => Object.fromEntries(cards.map((card) => [card.id, card])),
    [cards],
  );

  const handlePreviousClick = useCallback(() => {
    setMonth((prevMonth) => addMonths(prevMonth, -1));
  }, []);

  const handleNextClick = useCallback(() => {
    setMonth((prevMonth) => addMonths(prevMonth, 1));
  }, []);

  const handleTodayClick = useCallback(() => {
    setMonth(startOfMonth(new Date()));
  }, []);

  const handleCardClick = useCallback(
    (event) => {
      dispatch(push(Paths.CARDS.replace(':id', event.currentTarget.dataset.id)));
    },
    [dispatch],
  );

  const handleCardDragStart = useCallback((event) => {
    event.dataTransfer.setData(DRAG_TYPE, event.currentTarget.dataset.id);
    event.dataTransfer.effectAllowed = 'move'; // eslint-disable-line no-param-reassign
  }, []);

  const handleCardDragEnd = useCallback(() => {
    setDropDayKey(null);
    setIsUndatedDropTarget(false);
  }, []);

  const handleDayDragOver = useCallback((event) => {
    if (!event.dataTransfer.types.includes(DRAG_TYPE)) {
      return;
    }

    event.preventDefault();
    setDropDayKey(event.currentTarget.dataset.key);
  }, []);

  const handleDayDrop = useCallback(
    (event) => {
      event.preventDefault();
      setDropDayKey(null);

      const card = cardsById[event.dataTransfer.getData(DRAG_TYPE)];

      if (!card) {
        return;
      }

      const day = days.find((item) => toDayKey(item) === event.currentTarget.dataset.key);

      if (!day || (card.dueDate && isSameDay(card.dueDate, day))) {
        return;
      }

      const dueDate = moveToDay(day, card.dueDate);

      // A start date never comes after the due date, so it moves along by the same
      // number of days, and no further than the due date
      let startDate;
      if (card.startDate && card.startDate > dueDate) {
        startDate = addDays(
          card.startDate,
          differenceInCalendarDays(dueDate, card.dueDate || card.startDate),
        );

        if (startDate > dueDate) {
          startDate = dueDate;
        }
      }

      dispatch(
        entryActions.updateCard(card.id, {
          dueDate,
          ...(startDate && { startDate }),
        }),
      );
    },
    [cardsById, days, dispatch],
  );

  const handleUndatedDragOver = useCallback((event) => {
    if (!event.dataTransfer.types.includes(DRAG_TYPE)) {
      return;
    }

    event.preventDefault();
    setIsUndatedDropTarget(true);
  }, []);

  const handleUndatedDragLeave = useCallback(() => {
    setIsUndatedDropTarget(false);
  }, []);

  const handleUndatedDrop = useCallback(
    (event) => {
      event.preventDefault();
      setIsUndatedDropTarget(false);

      const card = cardsById[event.dataTransfer.getData(DRAG_TYPE)];

      if (!card || !card.dueDate) {
        return;
      }

      dispatch(
        entryActions.updateCard(card.id, {
          dueDate: null,
        }),
      );
    },
    [cardsById, dispatch],
  );

  const renderCard = (card) => {
    const isOverdue = !!card.dueDate && !card.isDueCompleted && card.dueDate < today;

    return (
      <button
        key={card.id}
        type="button"
        data-id={card.id}
        draggable={canEdit}
        title={card.name}
        className={classNames(
          styles.card,
          card.isDueCompleted && styles.cardCompleted,
          isOverdue && styles.cardOverdue,
        )}
        onClick={handleCardClick}
        onDragStart={handleCardDragStart}
        onDragEnd={handleCardDragEnd}
      >
        {card.name}
      </button>
    );
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div className={styles.navigation}>
          <Button
            icon
            basic
            size="small"
            aria-label={t('action.previousMonth')}
            title={t('action.previousMonth')}
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
            aria-label={t('action.nextMonth')}
            title={t('action.nextMonth')}
            onClick={handleNextClick}
          >
            <Icon name="chevron right" />
          </Button>
        </div>
        <h2 className={styles.title}>{i18n.dateFns.format(month, 'LLLL yyyy')}</h2>
      </div>
      <div className={styles.grid}>
        {days.slice(0, 7).map((day) => (
          <div key={day.getDay()} className={styles.weekday}>
            {i18n.dateFns.format(day, 'EEE')}
          </div>
        ))}
        {days.map((day) => {
          const key = toDayKey(day);
          const dayCards = cardsByDayKey[key] || [];

          return (
            <div
              key={key}
              data-key={key}
              className={classNames(
                styles.day,
                !isSameMonth(day, month) && styles.dayOutside,
                isSameDay(day, today) && styles.dayToday,
                dropDayKey === key && styles.dayDropTarget,
              )}
              onDragOver={canEdit ? handleDayDragOver : undefined}
              onDrop={canEdit ? handleDayDrop : undefined}
            >
              <div className={styles.dayNumber}>{day.getDate()}</div>
              <div className={styles.dayCards}>{dayCards.map(renderCard)}</div>
            </div>
          );
        })}
      </div>
      {(undatedCards.length > 0 || canEdit) && (
        <div
          className={classNames(styles.undated, isUndatedDropTarget && styles.undatedDropTarget)}
          onDragOver={canEdit ? handleUndatedDragOver : undefined}
          onDragLeave={canEdit ? handleUndatedDragLeave : undefined}
          onDrop={canEdit ? handleUndatedDrop : undefined}
        >
          <div className={styles.undatedTitle}>
            {t('common.noDueDate')}
            <span className={styles.undatedCount}>{undatedCards.length}</span>
          </div>
          {canEdit && (
            <p className={styles.undatedHint}>{t('common.dragCardToADayToSetItsDueDate')}</p>
          )}
          <div className={styles.undatedCards}>{undatedCards.map(renderCard)}</div>
        </div>
      )}
    </div>
  );
});

export default CalendarView;
