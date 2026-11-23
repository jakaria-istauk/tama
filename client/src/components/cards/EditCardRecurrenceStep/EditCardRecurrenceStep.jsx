/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Dropdown, Form, Input } from 'semantic-ui-react';
import { Popup } from '../../../lib/custom-ui';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import { useForm } from '../../../hooks';
import {
  Frequencies,
  LAST_MONTH_DAY,
  WEEKDAYS,
  buildRule,
  parseRule,
} from '../../../utils/card-recurrence-rule';

import styles from './EditCardRecurrenceStep.module.scss';

const DEFAULT_HOUR = 9;

const pad = (value) => String(value).padStart(2, '0');

const getTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

const EditCardRecurrenceStep = React.memo(({ cardId, onBack, onClose }) => {
  const selectCardById = useMemo(() => selectors.makeSelectCardById(), []);

  const card = useSelector((state) => selectCardById(state, cardId));

  const cardRecurrence = useSelector((state) =>
    selectors.selectCardRecurrenceByCardId(state, cardId),
  );

  const lists = useSelector(selectors.selectAvailableListsForCurrentBoard);

  const dispatch = useDispatch();
  const [t, i18n] = useTranslation();

  const parsedRule = useMemo(
    () => (cardRecurrence ? parseRule(cardRecurrence.rule) : null),
    [cardRecurrence],
  );

  // A rule set through the API that the step cannot show is replaced when saved
  const isCustomRule = !!cardRecurrence && !parsedRule;

  const [data, handleFieldChange, setData] = useForm(() => {
    const choices = parsedRule || {
      frequency: Frequencies.WEEKLY,
      weekdays: [WEEKDAYS[(new Date().getDay() + 6) % 7]],
      monthDay: new Date().getDate(),
      hour: DEFAULT_HOUR,
      minute: 0,
    };

    return {
      frequency: choices.frequency,
      weekdays: choices.weekdays.length > 0 ? choices.weekdays : [WEEKDAYS[0]],
      monthDay: choices.monthDay,
      time: `${pad(choices.hour)}:${pad(choices.minute)}`,
      listId: cardRecurrence ? cardRecurrence.listId : card.listId,
    };
  });

  const weekdayNames = useMemo(() => {
    const format = new Intl.DateTimeFormat(i18n.resolvedLanguage, {
      weekday: 'short',
      timeZone: 'UTC',
    });

    // 2024-01-01 is a Monday
    return WEEKDAYS.map((_, index) => format.format(new Date(Date.UTC(2024, 0, 1 + index))));
  }, [i18n.resolvedLanguage]);

  const frequencyOptions = useMemo(
    () => [
      { value: Frequencies.DAILY, text: t('common.everyDay') },
      { value: Frequencies.WEEKLY, text: t('common.everyWeek') },
      { value: Frequencies.MONTHLY, text: t('common.everyMonth') },
    ],
    [t],
  );

  const monthDayOptions = useMemo(
    () => [
      ...Array.from({ length: 31 }, (_, index) => ({
        value: index + 1,
        text: String(index + 1),
      })),
      { value: LAST_MONTH_DAY, text: t('common.lastDayOfMonth') },
    ],
    [t],
  );

  const listOptions = useMemo(
    () =>
      (lists || []).map((list) => ({
        value: list.id,
        text: list.name || t(`common.${list.type}`),
      })),
    [lists, t],
  );

  const handleWeekdayClick = useCallback(
    (weekday) => {
      setData((prevData) => {
        const weekdays = prevData.weekdays.includes(weekday)
          ? prevData.weekdays.filter((item) => item !== weekday)
          : [...prevData.weekdays, weekday];

        return {
          ...prevData,
          weekdays,
        };
      });
    },
    [setData],
  );

  const [hour, minute] = data.time.split(':').map((value) => parseInt(value, 10));

  const isValid =
    Number.isInteger(hour) &&
    Number.isInteger(minute) &&
    !!data.listId &&
    (data.frequency !== Frequencies.WEEKLY || data.weekdays.length > 0);

  const handleSubmit = useCallback(() => {
    if (!isValid) {
      return;
    }

    dispatch(
      entryActions.saveCardRecurrence(cardId, {
        rule: buildRule({
          hour,
          minute,
          frequency: data.frequency,
          weekdays: data.weekdays,
          monthDay: data.monthDay,
        }),
        timeZone: getTimeZone(),
        listId: data.listId,
      }),
    );

    onClose();
  }, [cardId, onClose, dispatch, data, hour, minute, isValid]);

  const handleStopClick = useCallback(() => {
    dispatch(entryActions.deleteCardRecurrence(cardRecurrence.id));
    onClose();
  }, [cardRecurrence, onClose, dispatch]);

  return (
    <>
      <Popup.Header onBack={onBack}>
        {t('common.repeat', {
          context: 'title',
        })}
      </Popup.Header>
      <Popup.Content>
        <Form onSubmit={handleSubmit}>
          <div className={styles.hint}>{t('common.repeatTemplateHint')}</div>
          {isCustomRule && (
            <div className={styles.hint}>
              {t('common.customRepeatRule', {
                rule: cardRecurrence.rule,
              })}
            </div>
          )}
          <div className={styles.text}>{t('common.repeats')}</div>
          <Dropdown
            fluid
            selection
            name="frequency"
            options={frequencyOptions}
            value={data.frequency}
            className={styles.field}
            onChange={handleFieldChange}
          />
          {data.frequency === Frequencies.WEEKLY && (
            <div className={styles.weekdays} role="group" aria-label={t('common.onDays')}>
              {WEEKDAYS.map((weekday, index) => (
                <Button
                  key={weekday}
                  type="button"
                  size="mini"
                  toggle
                  active={data.weekdays.includes(weekday)}
                  primary={data.weekdays.includes(weekday)}
                  content={weekdayNames[index]}
                  className={styles.weekday}
                  onClick={() => handleWeekdayClick(weekday)}
                />
              ))}
            </div>
          )}
          {data.frequency === Frequencies.MONTHLY && (
            <>
              <div className={styles.text}>{t('common.onDay')}</div>
              <Dropdown
                fluid
                selection
                name="monthDay"
                options={monthDayOptions}
                value={data.monthDay}
                className={styles.field}
                onChange={handleFieldChange}
              />
              {data.monthDay > 28 && (
                <div className={styles.hint}>{t('common.shorterMonthsUseLastDay')}</div>
              )}
            </>
          )}
          <div className={styles.text}>{t('common.time')}</div>
          <Input
            fluid
            type="time"
            name="time"
            value={data.time}
            className={styles.field}
            onChange={handleFieldChange}
          />
          <div className={styles.text}>{t('common.createCardsIn')}</div>
          <Dropdown
            fluid
            selection
            name="listId"
            options={listOptions}
            value={data.listId}
            placeholder={t('common.selectList')}
            className={styles.field}
            onChange={handleFieldChange}
          />
          {cardRecurrence && (
            <div className={styles.hint}>
              {cardRecurrence.nextRunAt
                ? t('common.nextCardOn', {
                    date: t('format:fullDateTime', {
                      postProcess: 'formatDate',
                      value: new Date(cardRecurrence.nextRunAt),
                    }),
                  })
                : t('common.noMoreCards')}
            </div>
          )}
          <div className={styles.actions}>
            <Button positive content={t('action.save')} disabled={!isValid} />
            {cardRecurrence && (
              <Button type="button" content={t('action.stopRepeating')} onClick={handleStopClick} />
            )}
          </div>
        </Form>
      </Popup.Content>
    </>
  );
});

EditCardRecurrenceStep.propTypes = {
  cardId: PropTypes.string.isRequired,
  onBack: PropTypes.func,
  onClose: PropTypes.func.isRequired,
};

EditCardRecurrenceStep.defaultProps = {
  onBack: undefined,
};

export default EditCardRecurrenceStep;
