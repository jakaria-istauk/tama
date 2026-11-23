/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

// A per-board rule: when its trigger happens to a card, its actions run on that card on
// behalf of its creator. due_checked_at is how far the automation hook has looked for passed
// due dates, for rules triggered by them.
module.exports.up = async (knex) => {
  await knex.schema.createTable('board_automation', (table) => {
    /* Columns */

    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));

    table.bigInteger('board_id').notNullable();
    table.bigInteger('creator_user_id').notNullable();

    table.text('name').notNullable();
    table.jsonb('trigger').notNullable();
    table.jsonb('actions').notNullable();
    table.boolean('is_enabled').notNullable();
    table.timestamp('due_checked_at', true);

    table.timestamp('created_at', true);
    table.timestamp('updated_at', true);

    /* Indexes */

    table.index('board_id');
    table.index('creator_user_id');
  });
};

module.exports.down = (knex) => knex.schema.dropTable('board_automation');
