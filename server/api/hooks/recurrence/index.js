/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * recurrence hook
 *
 * @description :: Makes the cards of recurring card templates. Once a minute it claims the
 *                 recurrences that are due, moves each to its next run and duplicates its
 *                 template. A run missed while the server was down makes one card, not one
 *                 per missed occurrence.
 * @docs        :: https://sailsjs.com/docs/concepts/extending-sails/hooks
 */

const { getNextRunAt } = require('../../../utils/recurrence');

const INTERVAL = 60 * 1000;
const BATCH_SIZE = 50;

module.exports = function defineRecurrenceHook(sails) {
  let isRunning = false;

  const runDue = async (date = new Date()) => {
    const cardRecurrences = await CardRecurrence.qm.claimDue(date, BATCH_SIZE, (record) => {
      try {
        return getNextRunAt({
          rule: record.rule,
          timeZone: record.timeZone,
          startAt: record.createdAt,
          after: date,
        });
      } catch (error) {
        sails.log.warn(`Card recurrence ${record.id} has an invalid rule: ${error}`);
        return null;
      }
    });

    const cards = [];

    // eslint-disable-next-line no-restricted-syntax
    for (const cardRecurrence of cardRecurrences) {
      sails.sockets.broadcast(`board:${cardRecurrence.boardId}`, 'cardRecurrenceUpdate', {
        item: cardRecurrence,
      });

      try {
        // eslint-disable-next-line no-await-in-loop
        const card = await sails.helpers.cardRecurrences.makeCard(cardRecurrence);

        if (card) {
          cards.push(card);
        } else {
          sails.log.info(
            `Card recurrence ${cardRecurrence.id} skipped: its template, list or creator is gone`,
          );
        }
      } catch (error) {
        sails.log.error(`Card recurrence ${cardRecurrence.id} failed: ${error}`);
      }
    }

    return {
      cardRecurrences,
      cards,
    };
  };

  const tick = async () => {
    if (isRunning) {
      return;
    }

    isRunning = true;

    try {
      let cardRecurrences;
      do {
        ({ cardRecurrences } = await runDue()); // eslint-disable-line no-await-in-loop
      } while (cardRecurrences.length === BATCH_SIZE);
    } catch (error) {
      sails.log.error(`Card recurrences could not run: ${error}`);
    } finally {
      isRunning = false;
    }
  };

  return {
    /**
     * Runs when this Sails app loads/lifts.
     */

    async initialize() {
      sails.log.info('Initializing custom hook (`recurrence`)');

      sails.on('lifted', () => {
        const interval = setInterval(tick, INTERVAL);

        sails.on('lower', () => {
          clearInterval(interval);
        });
      });
    },

    runDue,
  };
};
