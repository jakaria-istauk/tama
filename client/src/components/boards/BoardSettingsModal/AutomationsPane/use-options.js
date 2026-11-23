/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import selectors from '../../../../selectors';

// Lists, labels and members of the current board that rules can name, as dropdown options,
// and their names by id
export default () => {
  const lists = useSelector(selectors.selectAvailableListsForCurrentBoard);
  const archiveListId = useSelector(selectors.selectArchiveListIdForCurrentBoard);
  const labels = useSelector(selectors.selectLabelsForCurrentBoard);
  const memberships = useSelector(selectors.selectMembershipsForCurrentBoard);

  const [t] = useTranslation();

  return useMemo(() => {
    const listOptions = (lists || []).map((list) => ({
      value: list.id,
      text: list.name || t(`common.${list.type}`),
    }));

    if (archiveListId) {
      listOptions.push({
        value: archiveListId,
        text: t('common.archive'),
      });
    }

    const labelOptions = (labels || []).map((label) => ({
      value: label.id,
      text: label.name || label.color,
    }));

    const userOptions = (memberships || []).map(({ user }) => ({
      value: user.id,
      text: user.name,
    }));

    const toNames = (options) =>
      options.reduce(
        (result, { value, text }) => ({
          ...result,
          [value]: text,
        }),
        {},
      );

    return {
      listOptions,
      labelOptions,
      userOptions,
      listNames: toNames(listOptions),
      labelNames: toNames(labelOptions),
      userNames: toNames(userOptions),
    };
  }, [lists, archiveListId, labels, memberships, t]);
};
