/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useContext } from 'react';
import classNames from 'classnames';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Icon } from 'semantic-ui-react';
import { usePopup } from '../../../lib/popup';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import Paths from '../../../constants/Paths';
import { SidebarContext } from '../../../contexts';
import { isUserAdminOrProjectOwner } from '../../../utils/record-helpers';
import ProjectItem from './ProjectItem';
import UserAvatar from '../../users/UserAvatar';
import UserActionsStep from '../../users/UserActionsStep';

import styles from './Sidebar.module.scss';

const POPUP_PROPS = {
  position: 'top left',
};

const Sidebar = React.memo(() => {
  const user = useSelector(selectors.selectCurrentUser);
  const { projectId: currentProjectId } = useSelector(selectors.selectPath);
  const favoriteProjectIds = useSelector(selectors.selectFavoriteProjectIdsForCurrentUser);
  const projectIds = useSelector(selectors.selectProjectIdsForCurrentUser);

  const [isOpen, setIsOpen] = useContext(SidebarContext);

  const dispatch = useDispatch();
  const [t] = useTranslation();

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, [setIsOpen]);

  const handleAddProjectClick = useCallback(() => {
    setIsOpen(false);
    dispatch(entryActions.openAddProjectModal());
  }, [setIsOpen, dispatch]);

  const UserActionsPopup = usePopup(UserActionsStep, POPUP_PROPS);

  return (
    <>
      <aside className={classNames(styles.wrapper, isOpen && styles.wrapperOpen)}>
        <Link to={Paths.ROOT} className={styles.logo} onClick={handleClose}>
          <svg
            viewBox="-372 -372 744 744"
            fill="none"
            stroke="currentColor"
            strokeWidth="67"
            aria-hidden="true"
            className={styles.logoMark}
          >
            <path d="M0 -333.5 A333.5 333.5 0 1 1 0 333.5 A333.5 333.5 0 1 1 0 -333.5" />
            <path d="M0 -98 L0 117 A66.5 66.5 0 0 0 66.5 183.5 C82 183.5 91.3 178.2 100 173.2 A200 200 0 1 0 -41.6 195.6" />
            <path strokeWidth="43" d="M-98 -0.5 L100 -0.5" />
            <path
              fill="currentColor"
              stroke="none"
              d="M-98 -21 C-52 -21 -33.5 -42 -33.5 -98 L-28 -98 L-28 -21 Z M-33.5 -98 Q0 -106 33.5 -98 Z"
            />
          </svg>
          Tama
        </Link>
        <nav className={styles.nav}>
          <Link
            to={Paths.ROOT}
            className={classNames(styles.item, !currentProjectId && styles.itemActive)}
            onClick={handleClose}
          >
            <Icon fitted name="home" className={styles.itemIcon} />
            <span className={styles.itemName}>{t('common.home')}</span>
          </Link>
          {favoriteProjectIds.length > 0 && (
            <>
              <div className={styles.label}>{t('common.favorites')}</div>
              {favoriteProjectIds.map((projectId) => (
                <ProjectItem
                  key={projectId}
                  id={projectId}
                  isActive={projectId === currentProjectId}
                  isFavorite
                  onClick={handleClose}
                />
              ))}
            </>
          )}
          <div className={styles.label}>
            {t('common.projects')}
            {isUserAdminOrProjectOwner(user) && (
              <button
                type="button"
                aria-label={t('action.createProject')}
                title={t('action.createProject')}
                className={styles.labelButton}
                onClick={handleAddProjectClick}
              >
                <Icon fitted name="plus" />
              </button>
            )}
          </div>
          {projectIds.map((projectId) => (
            <ProjectItem
              key={projectId}
              id={projectId}
              isActive={projectId === currentProjectId}
              onClick={handleClose}
            />
          ))}
        </nav>
        <UserActionsPopup>
          <button type="button" className={styles.user}>
            <UserAvatar id={user.id} size="small" />
            <span className={styles.userInformation}>
              <span className={styles.userName}>{user.name}</span>
              <span className={styles.userRole}>{t(`common.${user.role}`)}</span>
            </span>
            <Icon fitted name="ellipsis vertical" className={styles.userIcon} />
          </button>
        </UserActionsPopup>
      </aside>
      {isOpen && (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
        <div className={styles.scrim} onClick={handleClose} />
      )}
    </>
  );
});

export default Sidebar;
