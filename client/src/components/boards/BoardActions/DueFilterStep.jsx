/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import DatePicker from 'react-datepicker';
import { Button, Icon } from 'semantic-ui-react';
import { Popup } from '../../../lib/custom-ui';

import { DueFilterRanges } from '../../../constants/Enums';
import { formatDueFilterDate, parseDueFilterDate } from '../../../utils/due-filter';

import styles from './DueFilterStep.module.scss';

const PRESET_RANGES = [
  DueFilterRanges.TODAY,
  DueFilterRanges.THIS_WEEK,
  DueFilterRanges.NEXT_7_DAYS,
  DueFilterRanges.THIS_MONTH,
  DueFilterRanges.NEXT_30_DAYS,
];

// Picks the due-date part of the board filter. A preset applies at once; a
// custom range applies once both ends are picked and confirmed. Picking the
// active preset again turns the due filter off.
const DueFilterStep = React.memo(({ value, onChange, onBack, onClose }) => {
  const [t] = useTranslation();

  const [isCustomOpened, setIsCustomOpened] = useState(
    !!value && value.range === DueFilterRanges.CUSTOM,
  );

  const [customRange, setCustomRange] = useState(() =>
    value && value.range === DueFilterRanges.CUSTOM
      ? [parseDueFilterDate(value.from), parseDueFilterDate(value.to)]
      : [null, null],
  );

  const handlePresetClick = useCallback(
    ({
      currentTarget: {
        dataset: { range },
      },
    }) => {
      onChange(value && value.range === range ? null : { range });
      onClose();
    },
    [value, onChange, onClose],
  );

  const handleCustomClick = useCallback(() => {
    setIsCustomOpened((prevIsCustomOpened) => !prevIsCustomOpened);
  }, []);

  const handleCustomRangeChange = useCallback((nextRange) => {
    setCustomRange(nextRange);
  }, []);

  const handleCustomApplyClick = useCallback(() => {
    const [from, to] = customRange;

    onChange({
      range: DueFilterRanges.CUSTOM,
      from: formatDueFilterDate(from),
      to: formatDueFilterDate(to || from),
    });

    onClose();
  }, [customRange, onChange, onClose]);

  const handleClearClick = useCallback(() => {
    onChange(null);
    onClose();
  }, [onChange, onClose]);

  const [customFrom, customTo] = customRange;
  const isCustomActive = !!value && value.range === DueFilterRanges.CUSTOM;

  return (
    <>
      <Popup.Header onBack={onBack}>
        {t('common.filterByDueDate', {
          context: 'title',
        })}
      </Popup.Header>
      <Popup.Content>
        {PRESET_RANGES.map((range) => {
          const isActive = !!value && value.range === range;

          return (
            <button
              key={range}
              type="button"
              data-range={range}
              className={classNames(styles.item, isActive && styles.itemActive)}
              onClick={handlePresetClick}
            >
              <Icon
                fitted
                name={isActive ? 'check' : 'calendar outline'}
                className={styles.itemIcon}
              />
              {t(`common.dueFilterRanges.${range}`)}
            </button>
          );
        })}
        <button
          type="button"
          className={classNames(styles.item, isCustomActive && styles.itemActive)}
          onClick={handleCustomClick}
        >
          <Icon
            fitted
            name={isCustomActive ? 'check' : 'calendar alternate outline'}
            className={styles.itemIcon}
          />
          {t('common.dueFilterRanges.custom')}
        </button>
        {isCustomOpened && (
          <div className={styles.custom}>
            <DatePicker
              inline
              selectsRange
              disabledKeyboardNavigation
              startDate={customFrom}
              endDate={customTo}
              onChange={handleCustomRangeChange}
            />
            <Button
              positive
              disabled={!customFrom}
              content={t('common.applyFilter')}
              className={styles.customApplyButton}
              onClick={handleCustomApplyClick}
            />
          </div>
        )}
        {value && (
          <Button
            basic
            fluid
            content={t('action.clearDueDateFilter')}
            className={styles.clearButton}
            onClick={handleClearClick}
          />
        )}
      </Popup.Content>
    </>
  );
});

DueFilterStep.propTypes = {
  value: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  onChange: PropTypes.func.isRequired,
  onBack: PropTypes.func,
  onClose: PropTypes.func.isRequired,
};

DueFilterStep.defaultProps = {
  value: null,
  onBack: undefined,
};

export default DueFilterStep;
