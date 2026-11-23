/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Icon, Menu } from 'semantic-ui-react';
import { Popup } from '../../../lib/custom-ui';

import selectors from '../../../selectors';

import styles from './SelectCardTemplateStep.module.scss';

const SelectCardTemplateStep = React.memo(({ onSelect, onBack, onClose }) => {
  const templates = useSelector(selectors.selectTemplateCardsForCurrentBoard);

  const [t] = useTranslation();

  const handleSelect = useCallback(
    (_, { value }) => {
      onSelect(value);
      onClose();
    },
    [onSelect, onClose],
  );

  return (
    <>
      <Popup.Header onBack={onBack}>
        {t('common.createFromTemplate', {
          context: 'title',
        })}
      </Popup.Header>
      <Popup.Content>
        <Menu secondary vertical className={styles.menu}>
          {templates.map((template) => (
            <Menu.Item
              key={template.id}
              value={template.id}
              disabled={!template.isPersisted}
              title={template.name}
              className={styles.menuItem}
              onClick={handleSelect}
            >
              <Icon name="clone outline" className={styles.menuItemIcon} />
              <span className={styles.menuItemText}>{template.name}</span>
            </Menu.Item>
          ))}
        </Menu>
        <p className={styles.hint}>{t('common.cardFromTemplateHint')}</p>
      </Popup.Content>
    </>
  );
});

SelectCardTemplateStep.propTypes = {
  onSelect: PropTypes.func.isRequired,
  onBack: PropTypes.func,
  onClose: PropTypes.func.isRequired,
};

SelectCardTemplateStep.defaultProps = {
  onBack: undefined,
};

export default SelectCardTemplateStep;
