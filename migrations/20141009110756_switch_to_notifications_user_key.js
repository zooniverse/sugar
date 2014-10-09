'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.table('notifications', function(table) {
    table.dropColumn('user_id');
    table.dropColumn('session_id');
    table.string('user_key').notNullable();
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.table('notifications', function(table) {
    table.dropColumn('user_key');
    table.integer('user_id').nullable();
    table.string('session_id').nullable();
  });
};
