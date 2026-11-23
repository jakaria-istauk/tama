/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import styles from './TamaLoader.module.scss';

// The Tama mark drawing itself in a loop: the t and the inner circle first,
// then the crossbar, then the outer ring. It sits in the middle of its
// positioned parent, like Semantic UI's active Loader.
const TamaLoader = React.memo(({ size }) => {
  const [t] = useTranslation();

  return (
    <div role="status" aria-label={t('common.loading')} className={styles.wrapper}>
      <svg
        viewBox="-372 -372 744 744"
        fill="none"
        stroke="currentColor"
        strokeWidth="67"
        width={size}
        height={size}
        aria-hidden="true"
        className={styles.mark}
      >
        <path
          pathLength="1"
          className={styles.ring}
          d="M0 -333.5 A333.5 333.5 0 1 1 0 333.5 A333.5 333.5 0 1 1 0 -333.5"
        />
        <path
          pathLength="1"
          className={styles.main}
          d="M0 -98 L0 117 A66.5 66.5 0 0 0 66.5 183.5 C82 183.5 91.3 178.2 100 173.2 A200 200 0 1 0 -41.6 195.6"
        />
        <path pathLength="1" strokeWidth="43" className={styles.bar} d="M-98 -0.5 L100 -0.5" />
        <path
          fill="currentColor"
          stroke="none"
          className={styles.fill}
          d="M-98 -21 C-52 -21 -33.5 -42 -33.5 -98 L-28 -98 L-28 -21 Z M-33.5 -98 Q0 -106 33.5 -98 Z"
        />
      </svg>
    </div>
  );
});

TamaLoader.propTypes = {
  size: PropTypes.number,
};

TamaLoader.defaultProps = {
  size: 72,
};

export default TamaLoader;
