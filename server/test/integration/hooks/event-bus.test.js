const { expect } = require('chai');

describe('event-bus (hook)', () => {
  const user = { id: '1', name: 'Event Bus' };
  const project = { id: '10' };
  const board = { id: '20', projectId: '10' };
  const card = { id: '30', boardId: '20', name: 'Card' };
  const prevCard = { ...card, name: 'Previous card' };

  let eventBus;
  let unsubscribes;

  // Subscribers run on a later microtask than the emitting helper
  const flush = () =>
    new Promise((resolve) => {
      setImmediate(resolve);
    });

  const subscribe = (handler) => {
    unsubscribes.push(eventBus.subscribe(handler));
  };

  const sendCardUpdate = (values = {}) => {
    sails.helpers.utils.sendWebhooks.with({
      webhooks: [],
      event: Webhook.Events.CARD_UPDATE,
      buildData: () => ({
        item: card,
        included: {
          projects: [project],
          boards: [board],
        },
      }),
      buildPrevData: () => ({
        item: prevCard,
      }),
      user,
      ...values,
    });
  };

  before(() => {
    eventBus = sails.hooks['event-bus'];
  });

  beforeEach(() => {
    unsubscribes = [];
  });

  afterEach(() => {
    unsubscribes.forEach((unsubscribe) => unsubscribe());
  });

  it('delivers events with data, prevData, user and scope when no webhook matches', async () => {
    const received = [];
    subscribe((event) => received.push(event));

    sendCardUpdate();
    await flush();

    expect(received).to.have.lengthOf(1);
    expect(received[0]).to.deep.equal({
      event: Webhook.Events.CARD_UPDATE,
      data: {
        item: card,
        included: {
          projects: [project],
          boards: [board],
        },
      },
      prevData: {
        item: prevCard,
      },
      user,
      scope: {
        projectId: project.id,
        boardId: board.id,
      },
      origin: null,
    });
  });

  it('uses the scope override passed to sendWebhooks', async () => {
    const received = [];
    subscribe((event) => received.push(event));

    sendCardUpdate({
      buildData: () => ({ item: card }),
      scope: { projectId: '11' },
    });
    await flush();

    expect(received[0].scope).to.deep.equal({
      projectId: '11',
      boardId: board.id,
    });
  });

  it('tags events with the origin they were emitted under', async () => {
    const received = [];
    subscribe((event) => received.push(event));

    await eventBus.runWithOrigin('automation', async () => {
      await flush();
      sendCardUpdate();
    });
    sendCardUpdate();
    await flush();

    expect(received.map(({ origin }) => origin)).to.deep.equal(['automation', null]);
  });

  it('keeps delivering to other subscribers when one fails', async () => {
    const received = [];
    subscribe(() => {
      throw new Error('subscriber failure');
    });
    subscribe((event) => received.push(event));

    sendCardUpdate();
    await flush();

    expect(received).to.have.lengthOf(1);
  });

  it('stops delivering after unsubscribe', async () => {
    const received = [];
    const unsubscribe = eventBus.subscribe((event) => received.push(event));
    unsubscribe();

    sendCardUpdate();
    await flush();

    expect(received).to.have.lengthOf(0);
  });

  it('does not build data when there are no subscribers and no webhooks', () => {
    let isBuilt = false;

    // The automation hook subscribes for as long as the app is lifted
    sails.hooks.automation.stop();

    sendCardUpdate({
      buildData: () => {
        isBuilt = true;
        return { item: card };
      },
    });

    const hasSubscribers = eventBus.hasSubscribers();
    sails.hooks.automation.start();

    expect(hasSubscribers).to.equal(false);
    expect(isBuilt).to.equal(false);
  });
});
