/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports.up = (knex) =>
  knex.schema.alterTable('user_account', (table) => {
    table.string('color_scheme').notNullable().defaultTo('tangerine');
  });

module.exports.down = (knex) =>
  knex.schema.alterTable('user_account', (table) => {
    table.dropColumn('color_scheme');
  });
