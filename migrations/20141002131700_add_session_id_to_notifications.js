'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.raw('ALTER TABLE notifications ALTER COLUMN user_id DROP NOT NULL, ADD COLUMN session_id varchar;');
};

exports.down = function(knex, Promise) {
  return knex.schema.raw('ALTER TABLE notifications ALTER COLUMN user_id SET NOT NULL, DROP COLUMN session_id;');
};
