/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Button, Dropdown, Form, Icon, Input, TextArea } from 'semantic-ui-react';

import {
  ActionTypes,
  MAX_ACTIONS,
  MAX_COMMENT_LENGTH,
  MAX_DUE_DAYS,
  TriggerTypes,
  getActionField,
  getTriggerField,
  isRuleValid,
  makeAction,
  makeTrigger,
} from '../../../../utils/board-automation';
import useOptions from './use-options';

import styles from './RuleForm.module.scss';

const DEFAULT_DATA = {
  name: '',
  trigger: makeTrigger(TriggerTypes.CARD_MOVED),
  actions: [makeAction(ActionTypes.ADD_LABEL)],
};

const RuleForm = React.memo(({ defaultData, onSubmit, onCancel }) => {
  const [t] = useTranslation();
  const [data, setData] = useState(() => defaultData || DEFAULT_DATA);
  const { listOptions, labelOptions, userOptions } = useOptions();

  const triggerOptions = useMemo(
    () =>
      Object.values(TriggerTypes).map((type) => ({
        value: type,
        text: t(`common.automationTrigger_${type}`),
      })),
    [t],
  );

  const actionOptions = useMemo(
    () =>
      Object.values(ActionTypes).map((type) => ({
        value: type,
        text: t(`common.automationAction_${type}`),
      })),
    [t],
  );

  const optionsByField = useMemo(
    () => ({
      listId: listOptions,
      labelId: labelOptions,
      userId: userOptions,
    }),
    [listOptions, labelOptions, userOptions],
  );

  const handleNameChange = useCallback((_, { value }) => {
    setData((prevData) => ({
      ...prevData,
      name: value,
    }));
  }, []);

  const handleTriggerTypeChange = useCallback((_, { value }) => {
    setData((prevData) => ({
      ...prevData,
      trigger: makeTrigger(value),
    }));
  }, []);

  const handleTriggerFieldChange = useCallback((_, { name, value }) => {
    setData((prevData) => ({
      ...prevData,
      trigger: {
        ...prevData.trigger,
        [name]: value === '' ? null : value,
      },
    }));
  }, []);

  const changeAction = useCallback((index, changeOne) => {
    setData((prevData) => ({
      ...prevData,
      actions: prevData.actions.map((action, actionIndex) =>
        actionIndex === index ? changeOne(action) : action,
      ),
    }));
  }, []);

  const handleActionTypeChange = useCallback(
    (_, { 'data-index': index, value }) => {
      changeAction(index, () => makeAction(value));
    },
    [changeAction],
  );

  const handleActionFieldChange = useCallback(
    (_, { 'data-index': index, name, value }) => {
      changeAction(index, (action) => ({
        ...action,
        [name]: name === 'days' ? parseInt(value, 10) : value,
      }));
    },
    [changeAction],
  );

  const handleActionRemoveClick = useCallback((event) => {
    const index = Number(event.currentTarget.dataset.index);

    setData((prevData) => ({
      ...prevData,
      actions: prevData.actions.filter((_, actionIndex) => actionIndex !== index),
    }));
  }, []);

  const handleActionAddClick = useCallback(() => {
    setData((prevData) => ({
      ...prevData,
      actions: [...prevData.actions, makeAction(ActionTypes.ADD_LABEL)],
    }));
  }, []);

  const handleSubmit = useCallback(() => {
    if (!isRuleValid(data)) {
      return;
    }

    onSubmit({
      ...data,
      name: data.name.trim(),
    });
  }, [data, onSubmit]);

  const triggerField = getTriggerField(data.trigger.type);

  const renderActionField = (action, index) => {
    const field = getActionField(action.type);

    switch (field) {
      case 'listId':
      case 'labelId':
      case 'userId':
        return (
          <Dropdown
            fluid
            selection
            search
            name={field}
            data-index={index}
            options={optionsByField[field]}
            value={action[field] || ''}
            placeholder={t(`common.automationPick_${field}`)}
            className={styles.field}
            onChange={handleActionFieldChange}
          />
        );
      case 'days':
        return (
          <Input
            fluid
            type="number"
            name="days"
            data-index={index}
            min={0}
            max={MAX_DUE_DAYS}
            value={Number.isNaN(action.days) ? '' : action.days}
            label={{ basic: true, content: t('common.daysFromNow') }}
            labelPosition="right"
            className={styles.field}
            onChange={handleActionFieldChange}
          />
        );
      case 'text':
        return (
          <TextArea
            name="text"
            data-index={index}
            value={action.text}
            maxLength={MAX_COMMENT_LENGTH}
            rows={2}
            placeholder={t('common.commentText')}
            className={styles.field}
            onChange={handleActionFieldChange}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Form className={styles.wrapper} onSubmit={handleSubmit}>
      <div className={styles.text}>{t('common.title')}</div>
      <Input
        fluid
        value={data.name}
        maxLength={128}
        placeholder={t('common.automationNamePlaceholder')}
        className={styles.field}
        onChange={handleNameChange}
      />
      <div className={styles.text}>{t('common.when')}</div>
      <Dropdown
        fluid
        selection
        options={triggerOptions}
        value={data.trigger.type}
        className={styles.field}
        onChange={handleTriggerTypeChange}
      />
      {triggerField && (
        <Dropdown
          fluid
          selection
          search
          clearable={data.trigger.type === TriggerTypes.CARD_CREATED}
          name={triggerField}
          options={optionsByField[triggerField]}
          value={data.trigger[triggerField] || ''}
          placeholder={
            data.trigger.type === TriggerTypes.CARD_CREATED
              ? t('common.anyList')
              : t(`common.automationPick_${triggerField}`)
          }
          className={styles.field}
          onChange={handleTriggerFieldChange}
        />
      )}
      <div className={styles.text}>{t('common.then')}</div>
      {data.actions.map((action, index) => (
        // eslint-disable-next-line react/no-array-index-key
        <div key={index} className={styles.action}>
          <div className={styles.actionFields}>
            <Dropdown
              fluid
              selection
              data-index={index}
              options={actionOptions}
              value={action.type}
              className={styles.field}
              onChange={handleActionTypeChange}
            />
            {renderActionField(action, index)}
          </div>
          <Button
            type="button"
            icon
            basic
            data-index={index}
            disabled={data.actions.length === 1}
            aria-label={t('action.removeAction')}
            title={t('action.removeAction')}
            className={styles.removeButton}
            onClick={handleActionRemoveClick}
          >
            <Icon fitted name="close" />
          </Button>
        </div>
      ))}
      {data.actions.length < MAX_ACTIONS && (
        <Button type="button" basic size="small" onClick={handleActionAddClick}>
          <Icon name="plus" />
          {t('action.addAction')}
        </Button>
      )}
      <div className={styles.controls}>
        <Button positive disabled={!isRuleValid(data)} content={t('action.save')} />
        <Button type="button" content={t('action.cancel')} onClick={onCancel} />
      </div>
    </Form>
  );
});

RuleForm.propTypes = {
  defaultData: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

RuleForm.defaultProps = {
  defaultData: undefined,
};

export default RuleForm;
