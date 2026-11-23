/*!
 * Copyright (c) 2026 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

// A schedule that makes a card from a template card. The rule is an RFC 5545 RRULE read
// in the stored time zone; next_run_at is when the recurrence hook makes the next card.
module.exports.up = async (knex) => {
  await knex.schema.createTable('card_recurrence', (table) => {
    /* Columns */

    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));

    table.bigInteger('board_id').notNullable();
    table.bigInteger('template_card_id').notNullable();
    table.bigInteger('list_id').notNullable();
    table.bigInteger('creator_user_id').notNullable();

    table.text('rule').notNullable();
    table.text('time_zone').notNullable();
    table.timestamp('next_run_at', true);

    table.timestamp('created_at', true);
    table.timestamp('updated_at', true);

    /* Indexes */

    table.unique('template_card_id');
    table.index('board_id');
    table.index('list_id');
    table.index('creator_user_id');
    table.index('next_run_at');
  });
};

module.exports.down = (knex) => knex.schema.dropTable('card_recurrence');
