'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.createTable('notifications', function(table) {
    table.increments();
    table.integer('user_id').notNullable();
    table.string('message', 2048).notNullable();
    table.string('url', 2048).notNullable();
    table.string('category').notNullable();
    table.boolean('is_delivered').notNullable().defaultTo(false);
    table.timestamp('created_at').notNullable();
    table.timestamp('expires_at').notNullable();
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('notifications');
};
