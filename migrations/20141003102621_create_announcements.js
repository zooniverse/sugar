'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.createTable('announcements', function(table) {
    table.increments();
    table.string('message', 2048).notNullable();
    table.string('scope').notNullable();
    table.string('category').notNullable();
    table.timestamp('created_at').notNullable();
    table.timestamp('expires_at').notNullable();
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('announcements');
};
