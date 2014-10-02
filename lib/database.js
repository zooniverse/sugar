'use strict';

var Knex = require('knex');

var Database = (function() {
  function Database() {
    this.knex = Knex({
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
    
    this.now = this.now.bind(this);
    this.ago = this.ago.bind(this);
    this.fromNow = this.fromNow.bind(this);
    this.createNotification = this.createNotification.bind(this);
    this.getNotifications = this.getNotifications.bind(this);
  };
  
  Database.prototype.now = function() {
    return this.knex.raw("now() at time zone 'utc'");
  };
  
  Database.prototype.nowInterval = function(sign, amount, unit) {
    return this.knex.raw(this.now() + ' ' + sign + " interval '" + amount + "' " + unit);
  };
  
  Database.prototype.ago = function(amount, unit) {
    return this.nowInterval('-', amount, unit);
  };
  
  Database.prototype.fromNow = function(amount, unit) {
    return this.nowInterval('+', amount, unit);
  };
  
  Database.prototype.createNotification = function(notification) {
    notification.created_at = this.now();
    notification.expires_at = this.fromNow(60, 'day');
    return this.knex.insert(notification).into('notifications').returning('*');
  };
  
  Database.prototype.getNotifications = function(opts) {
    opts.limit = opts.limit || 20;
    opts.offset = opts.offset || this.now();
    var selector = { };
    
    if(opts.unread) {
      selector.is_delivered = false;
    }
    
    if(opts.userId) {
      selector.user_id = opts.userId;
    } else if(opts.sessionId) {
      selector.session_id = opts.sessionId;
    } else {
      return this.knex.raw('select 1 where false');
    }
    
    return this.knex.select('*').from('notifications')
      .where(selector)
      .where('expires_at', '>', this.now())
      .where('created_at', '<', opts.offset)
      .orderBy('created_at', 'desc')
      .limit(opts.limit);
  };
  
  return Database
})();

module.exports = Database;
