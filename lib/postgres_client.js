'use strict';

var Knex = require('knex');

var PostgresClient = (function() {
  function PostgresClient() {
    var knex = new Knex({
      client: 'pg',
      connection: process.env.SUGAR_DB,
      pool: { min: 2, max: 20 },
      migrations: {
        extension: 'js',
        tableName: 'migrations',
        directory: '/migrations'
      },
      debug: true
    });
    
    knex.now = now.bind(knex);
    knex.nowInterval = nowInterval.bind(knex);
    knex.ago = ago.bind(knex);
    knex.fromNow = fromNow.bind(knex);
    knex.emptySet = emptySet.bind(knex);
    return knex;
  }
  
  var now = function() {
    return this.raw('now() at time zone \'utc\'');
  };
  
  var nowInterval = function(sign, amount, unit) {
    return this.raw(this.now() + ' ' + sign + ' interval \'' + amount + '\' ' + unit);
  };
  
  var ago = function(amount, unit) {
    return this.nowInterval('-', amount, unit);
  };
  
  var fromNow = function(amount, unit) {
    return this.nowInterval('+', amount, unit);
  };
  
  var emptySet = function() {
    return this.pg.raw('select 1 where false');
  };
  
  return PostgresClient;
})();

module.exports = PostgresClient;
