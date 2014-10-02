'use strict';

var Knex = require('knex');

var Notifications = (function() {
  function Notifications() {
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
    this.create = this.create.bind(this);
    this.get = this.get.bind(this);
    this.markRead = this.markRead.bind(this);
    this.clearExpired = this.clearExpired.bind(this);
    
    setInterval(this.clearExpired, 60 * 60 * 1000); // Clear expired once per hour
  };
  
  Notifications.prototype.now = function() {
    return this.knex.raw("now() at time zone 'utc'");
  };
  
  Notifications.prototype.nowInterval = function(sign, amount, unit) {
    return this.knex.raw(this.now() + ' ' + sign + " interval '" + amount + "' " + unit);
  };
  
  Notifications.prototype.ago = function(amount, unit) {
    return this.nowInterval('-', amount, unit);
  };
  
  Notifications.prototype.fromNow = function(amount, unit) {
    return this.nowInterval('+', amount, unit);
  };
  
  Notifications.prototype.create = function(notification) {
    notification.created_at = this.now();
    notification.expires_at = this.fromNow(60, 'day');
    return this.knex.insert(notification).into('notifications').returning('*');
  };
  
  Notifications.prototype.get = function(opts) {
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
  
  Notifications.prototype.markRead = function(ids) {
    if(!ids || ids.length == 0) return;
    return this.knex('notifications')
      .whereIn('id', ids)
      .update('is_delivered', true)
      .exec();
  }
  
  Notifications.prototype.clearExpired = function() {
    return this.knex('notifications')
      .where('expires_at', '<', this.now())
      .del()
      .exec();
  }
  
  return Notifications
})();

module.exports = Notifications;
