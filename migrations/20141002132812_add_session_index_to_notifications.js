'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.raw('\
    CREATE INDEX "idx_session_notifications" ON notifications USING btree(session_id ASC, is_delivered ASC, created_at DESC, expires_at ASC); \
  ');
};

exports.down = function(knex, Promise) {
  return knex.schema.raw('DROP INDEX idx_session_notifications;');
};
