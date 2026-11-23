/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Checkbox, Icon } from 'semantic-ui-react';
import { Tooltip } from '../../../../lib/custom-ui';

import entryActions from '../../../../entry-actions';
import { usePopupInClosableContext } from '../../../../hooks';
import { getActionField, getTriggerField } from '../../../../utils/board-automation';
import ConfirmationStep from '../../../common/ConfirmationStep';
import useOptions from './use-options';

import styles from './Item.module.scss';

const Item = React.memo(({ boardAutomation, canEdit, onEdit }) => {
  const dispatch = useDispatch();
  const [t] = useTranslation();
  const { listNames, labelNames, userNames } = useOptions();

  const namesByField = {
    listId: listNames,
    labelId: labelNames,
    userId: userNames,
  };

  // A list, label or user deleted since the rule was saved is shown as such
  const describe = (item, field, prefix) => {
    if (!field) {
      return t(`common.${prefix}_${item.type}`);
    }

    let value = item[field];

    if (namesByField[field]) {
      value =
        value === null ? t('common.anyList') : namesByField[field][value] || t('common.deleted');
    } else if (field === 'days') {
      value = `${value} ${t('common.daysFromNow')}`;
    }

    return `${t(`common.${prefix}_${item.type}`)}: ${value}`;
  };

  const { trigger, actions } = boardAutomation;

  const triggerText = describe(trigger, getTriggerField(trigger.type), 'automationTrigger');
  const actionsText = actions
    .map((action) => describe(action, getActionField(action.type), 'automationAction'))
    .join(' · ');

  const handleToggleChange = useCallback(
    (_, { checked }) => {
      dispatch(
        entryActions.updateBoardAutomation(boardAutomation.id, {
          isEnabled: checked,
        }),
      );
    },
    [boardAutomation.id, dispatch],
  );

  const handleEditClick = useCallback(() => {
    onEdit(boardAutomation.id);
  }, [boardAutomation.id, onEdit]);

  const handleDeleteConfirm = useCallback(() => {
    dispatch(entryActions.deleteBoardAutomation(boardAutomation.id));
  }, [boardAutomation.id, dispatch]);

  const ConfirmationPopup = usePopupInClosableContext(ConfirmationStep);

  return (
    <div className={styles.wrapper}>
      <Checkbox
        toggle
        checked={boardAutomation.isEnabled}
        disabled={!canEdit}
        aria-label={t('common.enabled')}
        className={styles.toggle}
        onChange={handleToggleChange}
      />
      <div className={styles.content}>
        <div className={styles.name}>{boardAutomation.name}</div>
        <div className={styles.summary}>
          <span className={styles.keyword}>{t('common.when')}</span> {triggerText}
        </div>
        <div className={styles.summary}>
          <span className={styles.keyword}>{t('common.then')}</span> {actionsText}
        </div>
      </div>
      {canEdit && (
        <>
          <Tooltip content={t('action.editRule')}>
            <Button
              type="button"
              aria-label={t('action.editRule')}
              className={styles.button}
              onClick={handleEditClick}
            >
              <Icon fitted name="pencil" />
            </Button>
          </Tooltip>
          <ConfirmationPopup
            title="common.deleteRule"
            content="common.areYouSureYouWantToDeleteThisRule"
            buttonContent="action.deleteRule"
            onConfirm={handleDeleteConfirm}
          >
            <Tooltip content={t('action.deleteRule')}>
              <Button type="button" aria-label={t('action.deleteRule')} className={styles.button}>
                <Icon fitted name="trash alternate outline" />
              </Button>
            </Tooltip>
          </ConfirmationPopup>
        </>
      )}
    </div>
  );
});

Item.propTypes = {
  boardAutomation: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  canEdit: PropTypes.bool.isRequired,
  onEdit: PropTypes.func.isRequired,
};

export default Item;
