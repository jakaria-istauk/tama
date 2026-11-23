/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

// Card templates are ordinary cards with this flag set: they stay in their list but are
// hidden from board views, and new cards are made from them by duplicating.
exports.up = (knex) =>
  knex.schema.alterTable('card', (table) => {
    /* Columns */

    table.boolean('is_template').notNullable().defaultTo(false);
  });

exports.down = (knex) =>
  knex.schema.table('card', (table) => {
    table.dropColumn('is_template');
  });
