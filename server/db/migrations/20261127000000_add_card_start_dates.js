/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

// A start date lets a card span a range of days on the timeline view. It is optional and,
// when both are set, never after the due date.
exports.up = (knex) =>
  knex.schema.alterTable('card', (table) => {
    /* Columns */

    table.timestamp('start_date', true);
  });

exports.down = (knex) =>
  knex.schema.table('card', (table) => {
    table.dropColumn('start_date');
  });
