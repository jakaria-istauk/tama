/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import debounce from 'lodash/debounce';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Icon } from 'semantic-ui-react';
import { useDidUpdate } from '../../../lib/hooks';
import { usePopup } from '../../../lib/popup';
import { Input, Tooltip } from '../../../lib/custom-ui';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import { useNestedRef } from '../../../hooks';
import { BoardViews, DueFilterRanges, LabelFilterModes } from '../../../constants/Enums';
import { isSameDueFilter, parseDueFilterDate } from '../../../utils/due-filter';
import UserAvatar from '../../users/UserAvatar';
import BoardMembershipsStep from '../../board-memberships/BoardMembershipsStep';
import LabelChip from '../../labels/LabelChip';
import LabelsStep from '../../labels/LabelsStep';
import ListsFilterStep from '../../lists/ListsFilterStep';
import DueFilterStep from './DueFilterStep';
import SaveFilterStep from './SaveFilterStep';
import SavedFiltersStep from './SavedFiltersStep';
import {
  clearLastFilter,
  readLastFilter,
  takeLegacySavedFilters,
  writeLastFilter,
} from './useFilterStorage';

import styles from './Filters.module.scss';

// Membership comparison — order carries no meaning for a filter selection.
const sameIds = (a, b) => a.length === b.length && a.every((id) => b.includes(id));

const FilterListChip = React.memo(({ id, onClick }) => {
  const selectListById = useMemo(() => selectors.makeSelectListById(), []);
  const list = useSelector((state) => selectListById(state, id));
  const [t] = useTranslation();

  const handleClick = useCallback(() => {
    onClick(id);
  }, [id, onClick]);

  if (!list) {
    return null;
  }

  return (
    <button type="button" className={styles.filterButton} onClick={handleClick}>
      <span className={styles.filterLabel}>{list.name || t(`common.${list.type}`)}</span>
    </button>
  );
});

FilterListChip.propTypes = {
  id: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
};

const formatDueFilterLabel = (due, t) => {
  if (due.range !== DueFilterRanges.CUSTOM) {
    return t(`common.dueFilterRanges.${due.range}`);
  }

  const from = parseDueFilterDate(due.from).toLocaleDateString();
  const to = parseDueFilterDate(due.to).toLocaleDateString();

  return from === to ? from : `${from} – ${to}`;
};

const Filters = React.memo(() => {
  const board = useSelector(selectors.selectCurrentBoard);
  const userIds = useSelector(selectors.selectFilterUserIdsForCurrentBoard);
  const labelIds = useSelector(selectors.selectFilterLabelIdsForCurrentBoard);
  const excludedLabelIds = useSelector(selectors.selectFilterExcludedLabelIdsForCurrentBoard);
  const listIds = useSelector(selectors.selectFilterListIdsForCurrentBoard);
  const currentUserId = useSelector(selectors.selectCurrentUserId);
  const savedFilters = useSelector(selectors.selectSavedFiltersForCurrentBoard);
  const creatorUserIds = board.filterCreatorUserIds;
  const due = board.filterDue;

  const withCurrentUserSelector = useSelector(
    (state) => !!selectors.selectCurrentUserMembershipForCurrentBoard(state),
  );

  const dispatch = useDispatch();
  const [t] = useTranslation();
  const [search, setSearch] = useState(board.search);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isDrawerOpened, setIsDrawerOpened] = useState(false);
  // Cache-buster for the "last filter" localStorage bucket below. Bumping it
  // after a write re-runs the memo that reads it, which is all the syncing it
  // needs — nothing here watches storage, so another window's snapshot never
  // arrives uninvited.
  const [storageRev, setStorageRev] = useState(0);

  const debouncedSearch = useMemo(
    () =>
      debounce((nextSearch) => {
        dispatch(entryActions.searchInCurrentBoard(nextSearch));
      }, 400),
    [dispatch],
  );

  const [searchFieldRef, handleSearchFieldRef] = useNestedRef('inputRef');

  // The `f` shortcut asks for the caret through the store, since it fires from
  // outside this tree. Watching the counter rather than a flag means a second
  // press brings the focus back even though nothing else changed. The ref
  // starts at the current value so arriving on a board does not steal focus.
  const filterFocusNonce = useSelector(selectors.selectFilterFocusNonce);
  const handledFocusNonceRef = useRef(filterFocusNonce);

  useEffect(() => {
    if (handledFocusNonceRef.current === filterFocusNonce) {
      return;
    }

    handledFocusNonceRef.current = filterFocusNonce;

    if (searchFieldRef.current) {
      searchFieldRef.current.focus();
    }
  }, [filterFocusNonce, searchFieldRef]);

  const labelModes = useMemo(
    () => ({
      ...labelIds.reduce(
        (result, labelId) => ({
          ...result,
          [labelId]: LabelFilterModes.INCLUDE,
        }),
        {},
      ),
      ...excludedLabelIds.reduce(
        (result, labelId) => ({
          ...result,
          [labelId]: LabelFilterModes.EXCLUDE,
        }),
        {},
      ),
    }),
    [labelIds, excludedLabelIds],
  );

  // Everything the board is currently filtered by, in the shape the storage
  // helpers read and write.
  const currentFilter = useMemo(
    () => ({
      userIds,
      labelIds,
      search: board.search || '',
      excludedLabelIds,
      listIds,
      noMember: !!board.filterNoMember,
      creatorUserIds,
      due,
    }),
    [
      board.filterNoMember,
      board.search,
      creatorUserIds,
      due,
      excludedLabelIds,
      labelIds,
      listIds,
      userIds,
    ],
  );

  const hasFilter =
    userIds.length > 0 ||
    labelIds.length > 0 ||
    excludedLabelIds.length > 0 ||
    listIds.length > 0 ||
    !!board.filterNoMember ||
    currentFilter.search.length > 0 ||
    creatorUserIds.length > 0 ||
    !!due;

  // Saved filters used to live in this browser only. The first time a board
  // opens after they moved to the server, whatever this browser still holds
  // for it is saved there and dropped here.
  useEffect(() => {
    takeLegacySavedFilters(currentUserId, board.id).forEach(({ name, filter }) => {
      dispatch(
        entryActions.createSavedFilterInCurrentBoard({
          name,
          filter,
        }),
      );
    });
  }, [board.id, currentUserId, dispatch]);

  // Only looked up while the board is unfiltered, and only to decide whether
  // the restore button is worth showing. Reading it never applies it.
  const lastFilter = useMemo(
    () => (hasFilter ? null : readLastFilter(currentUserId, board.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [board.id, currentUserId, hasFilter, storageRev],
  );

  // Which saved filter, if any, matches the board exactly. Drives both the
  // highlight in the list and the second-click-to-deactivate behaviour.
  const activeSavedFilterId = useMemo(() => {
    const match = savedFilters.find(
      ({ filter }) =>
        sameIds(filter.userIds || [], currentFilter.userIds) &&
        sameIds(filter.labelIds || [], currentFilter.labelIds) &&
        sameIds(filter.excludedLabelIds || [], currentFilter.excludedLabelIds) &&
        sameIds(filter.listIds || [], currentFilter.listIds) &&
        !!filter.noMember === currentFilter.noMember &&
        (filter.search || '') === currentFilter.search &&
        sameIds(filter.creatorUserIds || [], currentFilter.creatorUserIds) &&
        isSameDueFilter(filter.due || null, currentFilter.due),
    );

    return match && match.id;
  }, [currentFilter, savedFilters]);

  // Taking a filter apart chip by chip says "these values are not what I
  // want", so every such deselect drops the recall snapshot. Only the clear
  // button, which sets the snapshot on its way out, preserves it.
  const invalidateLastFilter = useCallback(() => {
    clearLastFilter(currentUserId, board.id);
    setStorageRev((prevStorageRev) => prevStorageRev + 1);
  }, [board.id, currentUserId]);

  const cancelSearch = useCallback(() => {
    debouncedSearch.cancel();
    setSearch('');
    dispatch(entryActions.searchInCurrentBoard(''));
    invalidateLastFilter();
    searchFieldRef.current.blur();
  }, [dispatch, debouncedSearch, invalidateLastFilter, searchFieldRef]);

  const handleUserSelect = useCallback(
    (userId) => {
      dispatch(entryActions.addUserToFilterInCurrentBoard(userId));
    },
    [dispatch],
  );

  const handleCurrentUserSelect = useCallback(() => {
    dispatch(entryActions.addUserToFilterInCurrentBoard(currentUserId));
  }, [currentUserId, dispatch]);

  const handleUserDeselect = useCallback(
    (userId) => {
      dispatch(entryActions.removeUserFromFilterInCurrentBoard(userId));
      invalidateLastFilter();
    },
    [dispatch, invalidateLastFilter],
  );

  const handleUserClick = useCallback(
    ({
      currentTarget: {
        dataset: { id: userId },
      },
    }) => {
      dispatch(entryActions.removeUserFromFilterInCurrentBoard(userId));
      invalidateLastFilter();
    },
    [dispatch, invalidateLastFilter],
  );

  const handleCreatorSelect = useCallback(
    (userId) => {
      dispatch(entryActions.addCreatorToFilterInCurrentBoard(userId));
    },
    [dispatch],
  );

  const handleCreatorDeselect = useCallback(
    (userId) => {
      dispatch(entryActions.removeCreatorFromFilterInCurrentBoard(userId));
      invalidateLastFilter();
    },
    [dispatch, invalidateLastFilter],
  );

  const handleCreatorClick = useCallback(
    ({
      currentTarget: {
        dataset: { id: userId },
      },
    }) => {
      handleCreatorDeselect(userId);
    },
    [handleCreatorDeselect],
  );

  const handleDueChange = useCallback(
    (nextDue) => {
      dispatch(entryActions.updateDueFilterInCurrentBoard(nextDue));

      if (!nextDue) {
        invalidateLastFilter();
      }
    },
    [dispatch, invalidateLastFilter],
  );

  const handleDueClearClick = useCallback(() => {
    handleDueChange(null);
  }, [handleDueChange]);

  const handleListSelect = useCallback(
    (listId) => {
      dispatch(entryActions.addListToFilterInCurrentBoard(listId));
    },
    [dispatch],
  );

  const handleListDeselect = useCallback(
    (listId) => {
      dispatch(entryActions.removeListFromFilterInCurrentBoard(listId));
      invalidateLastFilter();
    },
    [dispatch, invalidateLastFilter],
  );

  const handleLabelClick = useCallback(
    ({
      currentTarget: {
        dataset: { id: labelId },
      },
    }) => {
      dispatch(entryActions.updateLabelFilterInCurrentBoard(labelId, LabelFilterModes.NONE));
      invalidateLastFilter();
    },
    [dispatch, invalidateLastFilter],
  );

  const handleLabelModeChange = useCallback(
    (labelId, mode) => {
      dispatch(entryActions.updateLabelFilterInCurrentBoard(labelId, mode));

      // Switching a label between include and exclude is still filtering;
      // only dropping it altogether counts as a deselect.
      if (mode === LabelFilterModes.NONE) {
        invalidateLastFilter();
      }
    },
    [dispatch, invalidateLastFilter],
  );

  const handleSearchChange = useCallback(
    (_, { value }) => {
      setSearch(value);
      debouncedSearch(value);
    },
    [debouncedSearch],
  );

  const handleSearchFocus = useCallback(() => {
    setIsSearchFocused(true);
  }, []);

  const handleSearchKeyDown = useCallback(
    (event) => {
      if (event.key === 'Escape') {
        cancelSearch();
      }
    },
    [cancelSearch],
  );

  const handleSearchBlur = useCallback(() => {
    setIsSearchFocused(false);
  }, []);

  const handleCancelSearchClick = useCallback(() => {
    cancelSearch();
  }, [cancelSearch]);

  const handleNoMemberClick = useCallback(() => {
    if (board.filterNoMember) {
      dispatch(entryActions.removeNoMemberFromFilterInCurrentBoard());
      invalidateLastFilter();
    } else {
      dispatch(entryActions.setNoMemberToFilterInCurrentBoard());
    }
  }, [board.filterNoMember, dispatch, invalidateLastFilter]);

  // Take the board back to unfiltered, one existing entry action per
  // dimension — the same path the controls above use, so other sessions see
  // it exactly as they always have.
  const clearCurrentFilter = useCallback(() => {
    userIds.forEach((userId) => {
      dispatch(entryActions.removeUserFromFilterInCurrentBoard(userId));
    });

    [...labelIds, ...excludedLabelIds].forEach((labelId) => {
      dispatch(entryActions.updateLabelFilterInCurrentBoard(labelId, LabelFilterModes.NONE));
    });

    listIds.forEach((listId) => {
      dispatch(entryActions.removeListFromFilterInCurrentBoard(listId));
    });

    if (board.filterNoMember) {
      dispatch(entryActions.removeNoMemberFromFilterInCurrentBoard());
    }

    creatorUserIds.forEach((userId) => {
      dispatch(entryActions.removeCreatorFromFilterInCurrentBoard(userId));
    });

    if (due) {
      dispatch(entryActions.updateDueFilterInCurrentBoard(null));
    }

    debouncedSearch.cancel();
    setSearch('');

    if (board.search) {
      dispatch(entryActions.searchInCurrentBoard(''));
    }
  }, [
    board.filterNoMember,
    board.search,
    creatorUserIds,
    debouncedSearch,
    dispatch,
    due,
    excludedLabelIds,
    labelIds,
    listIds,
    userIds,
  ]);

  // The mirror image, used by both the restore button and the saved-filter
  // list. "No member" goes first because setting it clears the member
  // selection, which would otherwise undo the users we just added.
  const applyFilter = useCallback(
    (filter) => {
      if (filter.noMember) {
        dispatch(entryActions.setNoMemberToFilterInCurrentBoard());
      }

      (filter.userIds || []).forEach((userId) => {
        dispatch(entryActions.addUserToFilterInCurrentBoard(userId));
      });

      (filter.labelIds || []).forEach((labelId) => {
        dispatch(entryActions.updateLabelFilterInCurrentBoard(labelId, LabelFilterModes.INCLUDE));
      });

      (filter.excludedLabelIds || []).forEach((labelId) => {
        dispatch(entryActions.updateLabelFilterInCurrentBoard(labelId, LabelFilterModes.EXCLUDE));
      });

      (filter.listIds || []).forEach((listId) => {
        dispatch(entryActions.addListToFilterInCurrentBoard(listId));
      });

      (filter.creatorUserIds || []).forEach((userId) => {
        dispatch(entryActions.addCreatorToFilterInCurrentBoard(userId));
      });

      if (filter.due) {
        dispatch(entryActions.updateDueFilterInCurrentBoard(filter.due));
      }

      if (filter.search) {
        debouncedSearch.cancel();
        setSearch(filter.search);
        dispatch(entryActions.searchInCurrentBoard(filter.search));
      }
    },
    [debouncedSearch, dispatch],
  );

  // Clearing everything at once leaves the snapshot behind, so the very next
  // click of the restore button can put it back.
  const handleClearClick = useCallback(() => {
    writeLastFilter(currentUserId, board.id, currentFilter);
    clearCurrentFilter();
    setStorageRev((prevStorageRev) => prevStorageRev + 1);
  }, [board.id, clearCurrentFilter, currentFilter, currentUserId]);

  const handleRestoreClick = useCallback(() => {
    if (lastFilter) {
      applyFilter(lastFilter);
    }
  }, [applyFilter, lastFilter]);

  // Saved filters replace rather than merge. Picking the one already on the
  // board turns it off instead, so the same row toggles both ways.
  const handleSavedFilterApply = useCallback(
    (item) => {
      clearCurrentFilter();

      if (item.id !== activeSavedFilterId) {
        applyFilter(item.filter);
      }
    },
    [activeSavedFilterId, applyFilter, clearCurrentFilter],
  );

  const handleSavedFilterRemove = useCallback(
    (id) => {
      dispatch(entryActions.deleteSavedFilter(id));
    },
    [dispatch],
  );

  // Saving under a name already in use replaces that filter rather than
  // adding a second one with the same name.
  const handleSaveFilter = useCallback(
    (name) => {
      const existing = savedFilters.find((item) => item.name === name);

      if (existing && existing.isPersisted) {
        dispatch(
          entryActions.updateSavedFilter(existing.id, {
            filter: currentFilter,
          }),
        );
      } else {
        dispatch(
          entryActions.createSavedFilterInCurrentBoard({
            name,
            filter: currentFilter,
          }),
        );
      }
    },
    [currentFilter, dispatch, savedFilters],
  );

  const handleDrawerToggleClick = useCallback(() => {
    setIsDrawerOpened((prevIsDrawerOpened) => !prevIsDrawerOpened);
  }, []);

  const handleDrawerCloseClick = useCallback(() => {
    setIsDrawerOpened(false);
  }, []);

  // Escape closes the drawer, unless it was meant for something else: an open
  // popup closes first, and a text field keeps Escape for itself. The check
  // runs in the capture phase, before the popup removes itself.
  useEffect(() => {
    if (!isDrawerOpened) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') {
        return;
      }

      const isInTextField = ['INPUT', 'TEXTAREA'].includes(event.target.tagName);

      if (!isInTextField && !document.querySelector('.ui.popup')) {
        setIsDrawerOpened(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isDrawerOpened]);

  useDidUpdate(() => {
    setSearch(board.search);
  }, [board.search]);

  const BoardMembershipsPopup = usePopup(BoardMembershipsStep);
  const LabelsPopup = usePopup(LabelsStep);
  const ListsFilterPopup = usePopup(ListsFilterStep);
  const CreatorsPopup = usePopup(BoardMembershipsStep);
  const DueFilterPopup = usePopup(DueFilterStep);
  const SaveFilterPopup = usePopup(SaveFilterStep);
  const SavedFiltersPopup = usePopup(SavedFiltersStep);

  const isListView = board.view === BoardViews.LIST;

  // How many kinds of filter are on, not counting the search, which shows in
  // the bar already. Drives the badge on the drawer toggle.
  const activeFilterCount = [
    userIds.length > 0 || !!board.filterNoMember,
    labelIds.length > 0 || excludedLabelIds.length > 0,
    creatorUserIds.length > 0,
    !!due,
    isListView && listIds.length > 0,
  ].filter(Boolean).length;

  const isSearchActive = search || isSearchFocused;

  const searchNode = (
    <Input
      ref={handleSearchFieldRef}
      value={search}
      placeholder={t('common.searchCards')}
      maxLength={128}
      icon={
        isSearchActive ? <Icon link name="cancel" onClick={handleCancelSearchClick} /> : 'search'
      }
      className={classNames(styles.search, !isSearchActive && styles.searchInactive)}
      onFocus={handleSearchFocus}
      onKeyDown={handleSearchKeyDown}
      onChange={handleSearchChange}
      onBlur={handleSearchBlur}
    />
  );

  return (
    <>
      <span className={styles.filter}>{searchNode}</span>
      <span className={styles.filter}>
        <button
          type="button"
          aria-expanded={isDrawerOpened}
          aria-controls="board-filters-drawer"
          className={classNames(
            styles.drawerToggle,
            (isDrawerOpened || activeFilterCount > 0) && styles.drawerToggleActive,
          )}
          onClick={handleDrawerToggleClick}
        >
          <Icon fitted name="filter" />
          <span className={styles.drawerToggleText}>{t('common.filters')}</span>
          {activeFilterCount > 0 && (
            <span className={styles.drawerToggleCount}>{activeFilterCount}</span>
          )}
        </button>
        {hasFilter && (
          <Tooltip content={t('common.clearFilter')}>
            <button type="button" className={styles.filterButton} onClick={handleClearClick}>
              <span className={styles.filterLabel}>
                <Icon fitted name="close" className={styles.filterLabelIcon} />
              </span>
            </button>
          </Tooltip>
        )}
      </span>
      {isDrawerOpened && (
        <aside id="board-filters-drawer" aria-label={t('common.filters')} className={styles.drawer}>
          <div className={styles.drawerHeader}>
            <span className={styles.drawerTitle}>{t('common.filters')}</span>
            <button
              type="button"
              aria-label={t('action.close')}
              className={styles.drawerClose}
              onClick={handleDrawerCloseClick}
            >
              <Icon fitted name="close" />
            </button>
          </div>
          <div className={styles.drawerBody}>
            <span className={styles.filter}>
              <BoardMembershipsPopup
                currentUserIds={userIds}
                title="common.filterByMembers"
                onUserSelect={handleUserSelect}
                onUserDeselect={handleUserDeselect}
              >
                <button type="button" className={styles.filterButton}>
                  <span className={styles.filterTitle}>{`${t('common.members')}:`}</span>
                  {userIds.length === 0 && (
                    <span className={styles.filterLabel}>{t('common.all')}</span>
                  )}
                </button>
              </BoardMembershipsPopup>
              <button
                type="button"
                className={classNames(styles.filterButton, styles.filterLabel)}
                onClick={handleNoMemberClick}
              >
                {t('common.noMember')}
              </button>
              {userIds.length === 0 && withCurrentUserSelector && (
                <Tooltip content={t('action.filterByCurrentUser')}>
                  <button
                    type="button"
                    className={styles.filterButton}
                    onClick={handleCurrentUserSelect}
                  >
                    <span className={styles.filterLabel}>
                      <Icon fitted name="target" className={styles.filterLabelIcon} />
                    </span>
                  </button>
                </Tooltip>
              )}
              {userIds.map((userId) => (
                <span key={userId} className={styles.filterItem}>
                  <UserAvatar id={userId} size="tiny" onClick={handleUserClick} />
                </span>
              ))}
            </span>
            <span className={styles.filter}>
              <LabelsPopup
                currentIds={[]}
                currentModes={labelModes}
                isFilterModeEnabled
                title="common.filterByLabels"
                onModeChange={handleLabelModeChange}
              >
                <button type="button" className={styles.filterButton}>
                  <span className={styles.filterTitle}>{`${t('common.labels')}:`}</span>
                  {labelIds.length === 0 && excludedLabelIds.length === 0 && (
                    <span className={styles.filterLabel}>{t('common.all')}</span>
                  )}
                </button>
              </LabelsPopup>
              {labelIds.map((labelId) => (
                <span key={labelId} className={styles.filterItem}>
                  <LabelChip id={labelId} size="small" onClick={handleLabelClick} />
                </span>
              ))}
              {excludedLabelIds.map((labelId) => (
                <span key={labelId} className={styles.filterItem}>
                  <LabelChip id={labelId} size="small" isExcluded onClick={handleLabelClick} />
                </span>
              ))}
            </span>
            <span className={styles.filter}>
              <CreatorsPopup
                currentUserIds={creatorUserIds}
                title="common.filterByCreator"
                onUserSelect={handleCreatorSelect}
                onUserDeselect={handleCreatorDeselect}
              >
                <button type="button" className={styles.filterButton}>
                  <span className={styles.filterTitle}>{`${t('common.createdBy')}:`}</span>
                  {creatorUserIds.length === 0 && (
                    <span className={styles.filterLabel}>{t('common.all')}</span>
                  )}
                </button>
              </CreatorsPopup>
              {creatorUserIds.map((userId) => (
                <span key={userId} className={styles.filterItem}>
                  <UserAvatar id={userId} size="tiny" onClick={handleCreatorClick} />
                </span>
              ))}
            </span>
            <span className={styles.filter}>
              <DueFilterPopup value={due} onChange={handleDueChange}>
                <button type="button" className={styles.filterButton}>
                  <span className={styles.filterTitle}>{`${t('common.due')}:`}</span>
                  {!due && <span className={styles.filterLabel}>{t('common.anyTime')}</span>}
                </button>
              </DueFilterPopup>
              {due && (
                <button type="button" className={styles.filterButton} onClick={handleDueClearClick}>
                  <span className={styles.filterLabel}>{formatDueFilterLabel(due, t)}</span>
                </button>
              )}
            </span>
            {isListView && (
              <span className={styles.filter}>
                <ListsFilterPopup
                  currentIds={listIds}
                  title="common.filterByLists"
                  onSelect={handleListSelect}
                  onDeselect={handleListDeselect}
                >
                  <button type="button" className={styles.filterButton}>
                    <span className={styles.filterTitle}>{`${t('common.lists')}:`}</span>
                    {listIds.length === 0 && (
                      <span className={styles.filterLabel}>{t('common.all')}</span>
                    )}
                  </button>
                </ListsFilterPopup>
                {listIds.map((listId) => (
                  <FilterListChip key={listId} id={listId} onClick={handleListDeselect} />
                ))}
              </span>
            )}
            <span className={classNames(styles.filter, styles.drawerActions)}>
              {hasFilter && (
                <button type="button" className={styles.drawerAction} onClick={handleClearClick}>
                  <Icon name="close" />
                  {t('common.clearFilter')}
                </button>
              )}
              {/* Takes the place of the clear button once the filter is gone, and
                  only while there is something to put back. */}
              {!hasFilter && !!lastFilter && (
                <button type="button" className={styles.drawerAction} onClick={handleRestoreClick}>
                  <Icon name="undo" />
                  {t('common.restoreFilter')}
                </button>
              )}
              {/* No Tooltip around either popup trigger: usePopup clones its
                  immediate child to attach the click handler, so anything
                  wrapped around the button swallows the open. */}
              {hasFilter && (
                <SaveFilterPopup onSave={handleSaveFilter}>
                  <button
                    type="button"
                    className={classNames(styles.drawerAction, styles.drawerActionPrimary)}
                  >
                    <Icon name="bookmark outline" />
                    {t('common.saveFilter', {
                      context: 'title',
                    })}
                  </button>
                </SaveFilterPopup>
              )}
              <SavedFiltersPopup
                items={savedFilters}
                activeId={activeSavedFilterId}
                onApply={handleSavedFilterApply}
                onRemove={handleSavedFilterRemove}
              >
                <button type="button" className={styles.drawerAction}>
                  <Icon name="bookmark" />
                  {t('common.savedFilters', {
                    context: 'title',
                  })}
                </button>
              </SavedFiltersPopup>
            </span>
          </div>
        </aside>
      )}
    </>
  );
});

export default Filters;
