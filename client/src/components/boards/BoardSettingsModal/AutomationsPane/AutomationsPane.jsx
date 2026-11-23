/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useContext, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Icon, Tab } from 'semantic-ui-react';
import { useDidUpdate } from '../../../../lib/hooks';

import selectors from '../../../../selectors';
import entryActions from '../../../../entry-actions';
import { BoardMembershipRoles } from '../../../../constants/Enums';
import { ClosableContext } from '../../../../contexts';
import Item from './Item';
import RuleForm from './RuleForm';

import styles from './AutomationsPane.module.scss';

const NEW_RULE = 'new';

const AutomationsPane = React.memo(() => {
  const boardAutomations = useSelector(selectors.selectBoardAutomationsForCurrentBoard);

  const canEdit = useSelector((state) => {
    const boardMembership = selectors.selectCurrentUserMembershipForCurrentBoard(state);
    return !!boardMembership && boardMembership.role === BoardMembershipRoles.EDITOR;
  });

  const dispatch = useDispatch();
  const [t] = useTranslation();
  const [editingId, setEditingId] = useState(null);
  const [, , setIsClosableActive] = useContext(ClosableContext);

  // A click outside the form, such as on a dropdown option that re-renders away, must not
  // close the settings and lose the rule being edited
  useDidUpdate(() => {
    setIsClosableActive(!!editingId);
  }, [editingId]);

  const editingBoardAutomation =
    editingId && editingId !== NEW_RULE
      ? boardAutomations.find(({ id }) => id === editingId)
      : null;

  const handleAddClick = useCallback(() => {
    setEditingId(NEW_RULE);
  }, []);

  const handleCancel = useCallback(() => {
    setEditingId(null);
  }, []);

  const handleSubmit = useCallback(
    (data) => {
      if (editingId === NEW_RULE) {
        dispatch(entryActions.createBoardAutomationInCurrentBoard(data));
      } else {
        dispatch(entryActions.updateBoardAutomation(editingId, data));
      }

      setEditingId(null);
    },
    [editingId, dispatch],
  );

  if (editingId && (editingId === NEW_RULE || editingBoardAutomation)) {
    return (
      <Tab.Pane attached={false} className={styles.wrapper}>
        <RuleForm
          key={editingId}
          defaultData={
            editingBoardAutomation && {
              name: editingBoardAutomation.name,
              trigger: editingBoardAutomation.trigger,
              actions: editingBoardAutomation.actions,
            }
          }
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </Tab.Pane>
    );
  }

  return (
    <Tab.Pane attached={false} className={styles.wrapper}>
      <p className={styles.hint}>
        {canEdit ? t('common.automationsHint') : t('common.onlyEditorsCanChangeAutomations')}
      </p>
      {boardAutomations.length > 0 ? (
        <div className={styles.items}>
          {boardAutomations.map((boardAutomation) => (
            <Item
              key={boardAutomation.id}
              boardAutomation={boardAutomation}
              canEdit={canEdit}
              onEdit={setEditingId}
            />
          ))}
        </div>
      ) : (
        <p className={styles.empty}>{t('common.noAutomations')}</p>
      )}
      {canEdit && (
        <Button type="button" className={styles.addButton} onClick={handleAddClick}>
          <Icon name="plus" />
          {t('action.addRule')}
        </Button>
      )}
    </Tab.Pane>
  );
});

export default AutomationsPane;
