'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.raw('\
    CREATE INDEX "idx_scoped_announcements" ON announcements USING btree(scope ASC, created_at DESC, expires_at ASC); \
  ');
};

exports.down = function(knex, Promise) {
  return knex.schema.raw('DROP INDEX idx_scoped_announcements;');
};
