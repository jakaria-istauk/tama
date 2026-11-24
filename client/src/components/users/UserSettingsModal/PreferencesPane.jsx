/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useMemo } from 'react';
import classNames from 'classnames';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Dropdown, Radio, Tab } from 'semantic-ui-react';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import { AutoLogoutModes, ColorSchemes } from '../../../constants/Enums';

import styles from './PreferencesPane.module.scss';

const AUTO_LOGOUT_OPTION_ORDER = [
  AutoLogoutModes.MINUTES_2,
  AutoLogoutModes.MINUTES_5,
  AutoLogoutModes.MINUTES_10,
  AutoLogoutModes.MINUTES_30,
  AutoLogoutModes.HOURS_12,
  AutoLogoutModes.NEVER,
];

const AUTO_LOGOUT_TRANSLATION_KEYS = {
  [AutoLogoutModes.NEVER]: 'common.autoLogout_never',
  [AutoLogoutModes.MINUTES_2]: 'common.autoLogout_2m',
  [AutoLogoutModes.MINUTES_5]: 'common.autoLogout_5m',
  [AutoLogoutModes.MINUTES_10]: 'common.autoLogout_10m',
  [AutoLogoutModes.MINUTES_30]: 'common.autoLogout_30m',
  [AutoLogoutModes.HOURS_12]: 'common.autoLogout_12h',
};

// Swatch colours match --pk-accent of each scheme in styles.module.scss (light, dark)
const COLOR_SCHEME_SWATCHES = {
  [ColorSchemes.TANGERINE]: ['#ea580c', '#fb8a3c'],
  [ColorSchemes.TEAL]: ['#0f766e', '#14a396'],
  [ColorSchemes.INDIGO]: ['#4f46e5', '#7c74ff'],
  [ColorSchemes.FOREST]: ['#2f5d50', '#4e8e7a'],
  [ColorSchemes.NAVY]: ['#1e3a5f', '#3a6596'],
  [ColorSchemes.PLUM]: ['#6d28d9', '#8b5cf6'],
  [ColorSchemes.OCEAN]: ['#1d6fe0', '#4b93f2'],
  [ColorSchemes.GRAPHITE]: ['#27272a', '#52525b'],
};

const PreferencesPane = React.memo(() => {
  const user = useSelector(selectors.selectCurrentUser);

  const dispatch = useDispatch();
  const [t] = useTranslation();

  const handleChange = useCallback(
    (_, { name: fieldName, checked }) => {
      dispatch(
        entryActions.updateCurrentUser({
          [fieldName]: checked,
        }),
      );
    },
    [dispatch],
  );

  const handleAutoLogoutChange = useCallback(
    (_, { value }) => {
      dispatch(
        entryActions.updateCurrentUser({
          autoLogoutMode: value,
        }),
      );
    },
    [dispatch],
  );

  const handleColorSchemeClick = useCallback(
    (event) => {
      dispatch(
        entryActions.updateCurrentUser({
          colorScheme: event.currentTarget.value,
        }),
      );
    },
    [dispatch],
  );

  const autoLogoutOptions = useMemo(
    () =>
      AUTO_LOGOUT_OPTION_ORDER.map((mode) => ({
        key: mode,
        value: mode,
        text: t(AUTO_LOGOUT_TRANSLATION_KEYS[mode]),
      })),
    [t],
  );

  const autoLogoutValue = user.autoLogoutMode || AutoLogoutModes.MINUTES_30;
  const colorSchemeValue = user.colorScheme || ColorSchemes.TANGERINE;

  return (
    <Tab.Pane attached={false} className={styles.wrapper}>
      <div className={styles.colorSchemes}>
        <span className={styles.label}>{t('common.colorScheme')}</span>
        <div role="radiogroup" aria-label={t('common.colorScheme')} className={styles.swatches}>
          {Object.values(ColorSchemes).map((scheme) => (
            <button
              key={scheme}
              type="button"
              role="radio"
              aria-checked={scheme === colorSchemeValue}
              value={scheme}
              title={t(`common.colorScheme_${scheme}`)}
              className={classNames(
                styles.swatch,
                scheme === colorSchemeValue && styles.swatchActive,
              )}
              onClick={handleColorSchemeClick}
            >
              <span
                className={styles.swatchColor}
                style={{
                  background: `linear-gradient(135deg, ${COLOR_SCHEME_SWATCHES[scheme][0]} 0%, ${COLOR_SCHEME_SWATCHES[scheme][0]} 55%, ${COLOR_SCHEME_SWATCHES[scheme][1]} 100%)`,
                }}
              />
              <span className={styles.swatchName}>{t(`common.colorScheme_${scheme}`)}</span>
              <span className={styles.swatchNote}>
                {scheme === ColorSchemes.TANGERINE ? t('common.colorScheme_default') : '\u00a0'}
              </span>
            </button>
          ))}
        </div>
      </div>
      <Radio
        toggle
        name="subscribeToOwnCards"
        checked={user.subscribeToOwnCards}
        label={t('common.subscribeToMyOwnCardsByDefault')}
        className={styles.radio}
        onChange={handleChange}
      />
      <Radio
        toggle
        name="subscribeToCardWhenCommenting"
        checked={user.subscribeToCardWhenCommenting}
        label={t('common.subscribeToCardWhenCommenting')}
        className={styles.radio}
        onChange={handleChange}
      />
      <Radio
        toggle
        name="turnOffRecentCardHighlighting"
        checked={user.turnOffRecentCardHighlighting}
        label={t('common.turnOffRecentCardHighlighting')}
        className={styles.radio}
        onChange={handleChange}
      />
      <div className={styles.field}>
        <span className={styles.label}>{t('common.autoLogout')}</span>
        <Dropdown
          fluid
          selection
          className={styles.dropdown}
          options={autoLogoutOptions}
          value={autoLogoutValue}
          onChange={handleAutoLogoutChange}
        />
      </div>
    </Tab.Pane>
  );
});

export default PreferencesPane;
