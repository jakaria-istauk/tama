/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import DatePicker from 'react-datepicker';
import { Button, Form, Message } from 'semantic-ui-react';
import { useDidUpdate, useToggle } from '../../../lib/hooks';
import { Input, Popup } from '../../../lib/custom-ui';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import { useForm, useNestedRef } from '../../../hooks';
import parseTime from '../../../utils/parse-time';

import styles from './EditDueDateStep.module.scss';

const FieldNames = {
  START_DATE: 'startDate',
  DUE_DATE: 'dueDate',
};

const TITLE_KEY_BY_FIELD_NAME = {
  [FieldNames.START_DATE]: 'common.editStartDate',
  [FieldNames.DUE_DATE]: 'common.editDueDate',
};

const ERROR_KEY_BY_FIELD_NAME = {
  [FieldNames.START_DATE]: 'common.startDateMustNotBeAfterDueDate',
  [FieldNames.DUE_DATE]: 'common.dueDateMustNotBeBeforeStartDate',
};

// Edits either date of a card. A start date is never after the due date, so each
// is checked against the other before it is saved.
const EditDueDateStep = React.memo(({ cardId, fieldName, onBack, onClose }) => {
  const selectCardById = useMemo(() => selectors.makeSelectCardById(), []);

  const card = useSelector((state) => selectCardById(state, cardId));
  const defaultValue = card[fieldName];
  const otherValue =
    card[fieldName === FieldNames.START_DATE ? FieldNames.DUE_DATE : FieldNames.START_DATE];

  const dispatch = useDispatch();
  const [t] = useTranslation();
  const [isOutOfOrder, setIsOutOfOrder] = useState(false);

  const [data, handleFieldChange, setData] = useForm(() => {
    let date = defaultValue || new Date().setHours(12, 0, 0, 0);

    if (!defaultValue && otherValue) {
      if (fieldName === FieldNames.START_DATE ? date > otherValue : date < otherValue) {
        date = otherValue;
      }
    }

    return {
      date: t('format:date', {
        postProcess: 'formatDate',
        value: date,
      }),
      time: t('format:time', {
        postProcess: 'formatDate',
        value: date,
      }),
    };
  });

  const [selectTimeFieldState, selectTimeField] = useToggle();

  const [dateFieldRef, handleDateFieldRef] = useNestedRef('inputRef');
  const [timeFieldRef, handleTimeFieldRef] = useNestedRef('inputRef');

  const nullableDate = useMemo(() => {
    const date = t('format:date', {
      postProcess: 'parseDate',
      value: data.date,
    });

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date;
  }, [data.date, t]);

  const handleSubmit = useCallback(() => {
    if (!nullableDate) {
      dateFieldRef.current.select();
      return;
    }

    let value = t('format:dateTime', {
      postProcess: 'parseDate',
      value: `${data.date} ${data.time}`,
    });

    if (Number.isNaN(value.getTime())) {
      value = parseTime(data.time, nullableDate);

      if (Number.isNaN(value.getTime())) {
        timeFieldRef.current.select();
        return;
      }
    }

    if (
      otherValue &&
      (fieldName === FieldNames.START_DATE ? value > otherValue : value < otherValue)
    ) {
      setIsOutOfOrder(true);
      dateFieldRef.current.select();
      return;
    }

    if (!defaultValue || value.getTime() !== defaultValue.getTime()) {
      dispatch(
        entryActions.updateCard(cardId, {
          [fieldName]: value,
        }),
      );
    }

    onClose();
  }, [
    cardId,
    fieldName,
    onClose,
    defaultValue,
    otherValue,
    dispatch,
    t,
    data,
    dateFieldRef,
    timeFieldRef,
    nullableDate,
  ]);

  const handleClearClick = useCallback(() => {
    if (defaultValue) {
      dispatch(
        entryActions.updateCard(cardId, {
          [fieldName]: null,
        }),
      );
    }

    onClose();
  }, [cardId, fieldName, onClose, defaultValue, dispatch]);

  const handleDatePickerChange = useCallback(
    (date) => {
      setData((prevData) => ({
        ...prevData,
        date: t('format:date', {
          postProcess: 'formatDate',
          value: date,
        }),
      }));
      selectTimeField();
    },
    [t, setData, selectTimeField],
  );

  useEffect(() => {
    dateFieldRef.current.select();
  }, [dateFieldRef]);

  useDidUpdate(() => {
    timeFieldRef.current.select();
  }, [selectTimeFieldState]);

  return (
    <>
      <Popup.Header onBack={onBack}>
        {t(TITLE_KEY_BY_FIELD_NAME[fieldName], {
          context: 'title',
        })}
      </Popup.Header>
      <Popup.Content>
        <Form onSubmit={handleSubmit}>
          <div className={styles.fieldWrapper}>
            <div className={styles.fieldBox}>
              <div className={styles.text}>{t('common.date')}</div>
              <Input
                ref={handleDateFieldRef}
                name="date"
                value={data.date}
                maxLength={16}
                onChange={handleFieldChange}
              />
            </div>
            <div className={styles.fieldBox}>
              <div className={styles.text}>{t('common.time')}</div>
              <Input
                ref={handleTimeFieldRef}
                name="time"
                value={data.time}
                maxLength={16}
                onChange={handleFieldChange}
              />
            </div>
          </div>
          <DatePicker
            inline
            disabledKeyboardNavigation
            selected={nullableDate}
            onChange={handleDatePickerChange}
          />
          {isOutOfOrder && (
            <Message visible error size="tiny" content={t(ERROR_KEY_BY_FIELD_NAME[fieldName])} />
          )}
          <Button positive content={t('action.save')} />
        </Form>
        <Button
          negative
          content={t('action.remove')}
          className={styles.deleteButton}
          onClick={handleClearClick}
        />
      </Popup.Content>
    </>
  );
});

EditDueDateStep.propTypes = {
  cardId: PropTypes.string.isRequired,
  fieldName: PropTypes.oneOf(Object.values(FieldNames)),
  onBack: PropTypes.func,
  onClose: PropTypes.func.isRequired,
};

EditDueDateStep.defaultProps = {
  fieldName: FieldNames.DUE_DATE,
  onBack: undefined,
};

export default EditDueDateStep;
