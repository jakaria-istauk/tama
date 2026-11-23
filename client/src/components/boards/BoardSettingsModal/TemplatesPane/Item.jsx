/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Form, Icon, Input } from 'semantic-ui-react';
import { push } from '../../../../lib/redux-router';
import { useDidUpdate } from '../../../../lib/hooks';
import { Tooltip } from '../../../../lib/custom-ui';

import selectors from '../../../../selectors';
import entryActions from '../../../../entry-actions';
import { useEscapeInterceptor, useNestedRef, usePopupInClosableContext } from '../../../../hooks';
import Paths from '../../../../constants/Paths';
import ConfirmationStep from '../../../common/ConfirmationStep';

import styles from './Item.module.scss';

const Item = React.memo(({ id, canEdit }) => {
  const selectCardById = useMemo(() => selectors.makeSelectCardById(), []);

  const template = useSelector((state) => selectCardById(state, id));

  const dispatch = useDispatch();
  const [t] = useTranslation();
  const [name, setName] = useState(template.name);

  const [nameFieldRef, handleNameFieldRef] = useNestedRef('inputRef');
  const isNameFocusedRef = useRef(false);

  const handleNameEscape = useCallback(() => {
    setName(template.name);
    nameFieldRef.current.blur();
  }, [template.name, nameFieldRef]);

  const [activateEscapeInterceptor, deactivateEscapeInterceptor] =
    useEscapeInterceptor(handleNameEscape);

  const handleNameFocus = useCallback(() => {
    activateEscapeInterceptor();
    isNameFocusedRef.current = true;
  }, [activateEscapeInterceptor]);

  const handleNameChange = useCallback((_, { value }) => {
    setName(value);
  }, []);

  const handleNameBlur = useCallback(() => {
    deactivateEscapeInterceptor();
    isNameFocusedRef.current = false;

    const cleanName = name.trim();

    if (!cleanName) {
      setName(template.name);
      return;
    }

    if (cleanName !== template.name) {
      dispatch(
        entryActions.updateCard(id, {
          name: cleanName,
        }),
      );
    }
  }, [id, name, template.name, dispatch, deactivateEscapeInterceptor]);

  const handleSubmit = useCallback(() => {
    nameFieldRef.current.blur();
  }, [nameFieldRef]);

  // Templates are edited in the card modal like any card
  const handleOpenClick = useCallback(() => {
    dispatch(entryActions.closeModal());
    dispatch(push(Paths.CARDS.replace(':id', id)));
  }, [id, dispatch]);

  const handleDeleteConfirm = useCallback(() => {
    dispatch(entryActions.deleteCard(id));
  }, [id, dispatch]);

  useDidUpdate(() => {
    if (!isNameFocusedRef.current) {
      setName(template.name);
    }
  }, [template.name]);

  const ConfirmationPopup = usePopupInClosableContext(ConfirmationStep);

  return (
    <Form className={styles.wrapper} onSubmit={handleSubmit}>
      <Input
        ref={handleNameFieldRef}
        value={name}
        maxLength={1024}
        readOnly={!canEdit || !template.isPersisted}
        aria-label={t('common.templateName')}
        className={styles.field}
        onFocus={handleNameFocus}
        onChange={handleNameChange}
        onBlur={handleNameBlur}
      />
      <Tooltip content={t('action.openTemplate')}>
        <Button
          type="button"
          disabled={!template.isPersisted}
          aria-label={t('action.openTemplate')}
          className={styles.button}
          onClick={handleOpenClick}
        >
          <Icon fitted name="external alternate" />
        </Button>
      </Tooltip>
      {canEdit && (
        <ConfirmationPopup
          title="common.deleteTemplate"
          content="common.areYouSureYouWantToDeleteThisTemplate"
          buttonContent="action.deleteTemplate"
          onConfirm={handleDeleteConfirm}
        >
          <Tooltip content={t('action.deleteTemplate')}>
            <Button
              type="button"
              disabled={!template.isPersisted}
              aria-label={t('action.deleteTemplate')}
              className={styles.button}
            >
              <Icon fitted name="trash alternate outline" />
            </Button>
          </Tooltip>
        </ConfirmationPopup>
      )}
    </Form>
  );
});

Item.propTypes = {
  id: PropTypes.string.isRequired,
  canEdit: PropTypes.bool.isRequired,
};

export default Item;
