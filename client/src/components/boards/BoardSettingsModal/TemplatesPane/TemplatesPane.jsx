/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Tab } from 'semantic-ui-react';

import selectors from '../../../../selectors';
import { BoardMembershipRoles } from '../../../../constants/Enums';
import Item from './Item';

import styles from './TemplatesPane.module.scss';

const TemplatesPane = React.memo(() => {
  const templates = useSelector(selectors.selectTemplateCardsForCurrentBoard);

  const canEdit = useSelector((state) => {
    const boardMembership = selectors.selectCurrentUserMembershipForCurrentBoard(state);
    return !!boardMembership && boardMembership.role === BoardMembershipRoles.EDITOR;
  });

  const [t] = useTranslation();

  return (
    <Tab.Pane attached={false} className={styles.wrapper}>
      {templates.length > 0 ? (
        <div className={styles.items}>
          {templates.map((template) => (
            <Item key={template.id} id={template.id} canEdit={canEdit} />
          ))}
        </div>
      ) : (
        <p className={styles.empty}>{t('common.noCardTemplates')}</p>
      )}
    </Tab.Pane>
  );
});

export default TemplatesPane;
