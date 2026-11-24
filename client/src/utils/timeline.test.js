import { DragModes, getCardSpan, getDraggedValues, layoutBars } from './timeline';

const day = (date, hours = 12) => new Date(`${date}T${String(hours).padStart(2, '0')}:00:00`);

const makeCard = (id, startDate, dueDate) => ({
  id,
  name: `Card ${id}`,
  startDate: startDate ? day(startDate) : null,
  dueDate: dueDate ? day(dueDate) : null,
});

describe('timeline', () => {
  test('spans a card from its start date to its due date', () => {
    const card = makeCard('1', '2026-01-05', '2026-01-09');

    expect(getCardSpan(card)).toEqual({ start: card.startDate, end: card.dueDate });
    expect(getCardSpan(makeCard('2', null, '2026-01-09')).start).toEqual(day('2026-01-09'));
    expect(getCardSpan(makeCard('3', '2026-01-05', null)).end).toEqual(day('2026-01-05'));
    expect(getCardSpan(makeCard('4', null, null))).toBe(null);
  });

  test('stacks overlapping cards in lanes', () => {
    const { bars, lanesTotal } = layoutBars(
      [
        makeCard('1', '2026-01-05', '2026-01-07'),
        makeCard('2', '2026-01-06', '2026-01-08'),
        makeCard('3', '2026-01-08', '2026-01-09'),
        makeCard('4', null, null),
      ],
      day('2026-01-01', 0),
      14,
    );

    const laneById = Object.fromEntries(bars.map((bar) => [bar.card.id, bar.lane]));

    expect(bars).toHaveLength(3);
    expect(lanesTotal).toBe(2);
    expect(laneById).toEqual({ 1: 0, 2: 1, 3: 0 });
  });

  test('clips cards to the visible days and leaves out the rest', () => {
    const { bars } = layoutBars(
      [
        makeCard('1', '2025-12-20', '2026-01-03'),
        makeCard('2', '2026-01-10', '2026-02-20'),
        makeCard('3', '2025-11-01', '2025-11-02'),
      ],
      day('2026-01-01', 0),
      14,
    );

    expect(bars.map((bar) => bar.card.id)).toEqual(['1', '2']);
    expect(bars[0]).toMatchObject({ startIndex: 0, endIndex: 2, isClippedStart: true });
    expect(bars[1]).toMatchObject({ startIndex: 9, endIndex: 13, isClippedEnd: true });
  });

  test('moves every date a card has', () => {
    expect(getDraggedValues(makeCard('1', '2026-01-05', '2026-01-09'), DragModes.MOVE, 2)).toEqual({
      startDate: day('2026-01-07'),
      dueDate: day('2026-01-11'),
    });

    expect(getDraggedValues(makeCard('2', null, '2026-01-09'), DragModes.MOVE, -1)).toEqual({
      dueDate: day('2026-01-08'),
    });

    expect(getDraggedValues(makeCard('3', '2026-01-05', '2026-01-09'), DragModes.MOVE, 0)).toBe(
      null,
    );
  });

  test('changes one date when an edge is dragged', () => {
    const card = makeCard('1', '2026-01-05', '2026-01-09');

    expect(getDraggedValues(card, DragModes.START, -2)).toEqual({ startDate: day('2026-01-03') });
    expect(getDraggedValues(card, DragModes.END, 3)).toEqual({ dueDate: day('2026-01-12') });
  });

  test('never lets a start date pass the due date', () => {
    const card = makeCard('1', '2026-01-05', '2026-01-09');

    expect(getDraggedValues(card, DragModes.START, 10)).toEqual({ startDate: card.dueDate });
    expect(getDraggedValues(card, DragModes.END, -10)).toEqual({ dueDate: card.startDate });
  });

  test('adds the missing date when a single-day card is stretched', () => {
    expect(getDraggedValues(makeCard('1', null, '2026-01-09'), DragModes.START, -3)).toEqual({
      startDate: day('2026-01-06'),
    });

    expect(getDraggedValues(makeCard('2', '2026-01-05', null), DragModes.END, 2)).toEqual({
      dueDate: day('2026-01-07'),
    });

    expect(getDraggedValues(makeCard('3', '2026-01-05', null), DragModes.START, -1)).toEqual({
      startDate: day('2026-01-04'),
      dueDate: day('2026-01-05'),
    });
  });
});
