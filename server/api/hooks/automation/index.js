/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * automation hook
 *
 * @description :: Runs board automation rules. Card events from the event bus run the rules
 *                 of their board whose trigger they match; once a minute, rules triggered by
 *                 passed due dates claim the stretch of time since they last looked and run
 *                 on the cards whose due date passed in it.
 *
 *                 Changes made by a rule are events too, and may trigger other rules, but
 *                 never the same rule again, and only up to MAX_CHAIN_LENGTH rules deep, so
 *                 rules cannot loop. At most MAX_RULES_PER_EVENT rules run for one event.
 * @docs        :: https://sailsjs.com/docs/concepts/extending-sails/hooks
 */

const { AsyncLocalStorage } = require('async_hooks');

const { TriggerTypes, parseEvent, matchesTrigger } = require('../../../utils/automation');

const ORIGIN = 'automation';
const MAX_CHAIN_LENGTH = 3;
const MAX_RULES_PER_EVENT = 10;
const INTERVAL = 60 * 1000;
const DUE_BATCH_SIZE = 50;
const DUE_CARDS_LIMIT = 100;

module.exports = function defineAutomationHook(sails) {
  // The rules whose actions are running, outermost first. Events emitted by those actions
  // are handled with this context, as the event bus calls subscribers from inside it.
  const chainStorage = new AsyncLocalStorage();
  let isTicking = false;
  let unsubscribe = null;

  const getChain = () => {
    const store = chainStorage.getStore();
    return store ? store.chain : [];
  };

  const runRule = (boardAutomation, cardId, chain = getChain()) =>
    chainStorage.run(
      {
        chain: [...chain, boardAutomation],
      },
      () =>
        // Helpers only start when awaited, so they are awaited inside both contexts
        sails.hooks['event-bus'].runWithOrigin(ORIGIN, async () => {
          const card = await sails.helpers.boardAutomations.runOne(boardAutomation, cardId);
          return card;
        }),
    );

  const hasOnlyCompletedTasks = async (cardId) => {
    const taskLists = await TaskList.qm.getByCardId(cardId);

    if (taskLists.length === 0) {
      return false;
    }

    const tasks = await Task.qm.getByTaskListIds(sails.helpers.utils.mapRecords(taskLists));
    return tasks.length > 0 && tasks.every((task) => task.isCompleted);
  };

  const handleEvent = async (event) => {
    const parsedEvent = parseEvent(event);

    if (!parsedEvent) {
      return;
    }

    const chain = event.origin === ORIGIN ? getChain() : [];

    if (chain.length >= MAX_CHAIN_LENGTH) {
      return;
    }

    const chainIds = chain.map(({ id }) => id);

    const boardAutomations = (
      await BoardAutomation.qm.getByBoardId(parsedEvent.boardId, {
        isEnabled: true,
      })
    )
      .filter(
        (boardAutomation) =>
          !chainIds.includes(boardAutomation.id) &&
          matchesTrigger(boardAutomation.trigger, parsedEvent),
      )
      .slice(0, MAX_RULES_PER_EVENT);

    if (boardAutomations.length === 0) {
      return;
    }

    if (
      parsedEvent.type === TriggerTypes.ALL_TASKS_COMPLETED &&
      !(await hasOnlyCompletedTasks(parsedEvent.cardId))
    ) {
      return;
    }

    // eslint-disable-next-line no-restricted-syntax
    for (const boardAutomation of boardAutomations) {
      try {
        await runRule(boardAutomation, parsedEvent.cardId, chain); // eslint-disable-line no-await-in-loop
      } catch (error) {
        sails.log.error(`Board automation ${boardAutomation.id} failed: ${error}`);
      }
    }
  };

  // Starts or stops handling card events
  const start = () => {
    if (!unsubscribe) {
      unsubscribe = sails.hooks['event-bus'].subscribe(handleEvent);
    }
  };

  const stop = () => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  };

  const runDueDates = async (date = new Date()) => {
    const boardAutomations = await BoardAutomation.qm.claimDueChecks(date, DUE_BATCH_SIZE);

    // eslint-disable-next-line no-restricted-syntax
    for (const boardAutomation of boardAutomations) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const cards = await Card.qm.getByBoardIdAndDuePassedBetween(
          boardAutomation.boardId,
          boardAutomation.checkedFrom || date.toISOString(),
          date.toISOString(),
          {
            limit: DUE_CARDS_LIMIT,
          },
        );

        // eslint-disable-next-line no-restricted-syntax
        for (const card of cards) {
          await runRule(boardAutomation, card.id, []); // eslint-disable-line no-await-in-loop
        }
      } catch (error) {
        sails.log.error(`Board automation ${boardAutomation.id} failed on due dates: ${error}`);
      }
    }

    return boardAutomations;
  };

  const tick = async () => {
    if (isTicking) {
      return;
    }

    isTicking = true;

    try {
      let boardAutomations;
      do {
        boardAutomations = await runDueDates(); // eslint-disable-line no-await-in-loop
      } while (boardAutomations.length === DUE_BATCH_SIZE);
    } catch (error) {
      sails.log.error(`Board automations could not check due dates: ${error}`);
    } finally {
      isTicking = false;
    }
  };

  return {
    /**
     * Runs when this Sails app loads/lifts.
     */

    async initialize() {
      sails.log.info('Initializing custom hook (`automation`)');

      sails.on('lifted', () => {
        start();
        const interval = setInterval(tick, INTERVAL);

        sails.on('lower', () => {
          stop();
          clearInterval(interval);
        });
      });
    },

    start,
    stop,

    /**
     * The rule whose actions are running, or null. Used to mark the actions it logs.
     */
    getCurrent() {
      const chain = getChain();
      return chain.length > 0 ? chain[chain.length - 1] : null;
    },

    handleEvent,
    runDueDates,
  };
};
