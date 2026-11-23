/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Icon, Message } from 'semantic-ui-react';

const CardSavedAsTemplateToast = React.memo(() => {
  const [t] = useTranslation();

  return (
    <Message visible positive size="tiny">
      <Icon name="clone outline" />
      {t('common.cardSavedAsTemplate')}
    </Message>
  );
});

export default CardSavedAsTemplateToast;
