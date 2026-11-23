/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

// Named board filters, kept per user so they follow the user to any browser.
// The filter itself is stored as JSON: its shape is checked by the API and
// read only by the client, so new filter dimensions need no migration.
module.exports.up = async (knex) => {
  await knex.schema.createTable('saved_filter', (table) => {
    /* Columns */

    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));

    table.bigInteger('board_id').notNullable();
    table.bigInteger('user_id').notNullable();

    table.text('name').notNullable();
    table.jsonb('filter').notNullable();

    table.timestamp('created_at', true);
    table.timestamp('updated_at', true);

    /* Indexes */

    table.index(['user_id', 'board_id']);
    table.index('board_id');
  });
};

module.exports.down = (knex) => knex.schema.dropTable('saved_filter');
