'use strict';

var PostgresClient = require('./postgres_client');

var Notifications = (function() {
  function Notifications() {
    this.pg = new PostgresClient();
    this.create = this.create.bind(this);
    this.get = this.get.bind(this);
    this.markRead = this.markRead.bind(this);
    this.clearExpired = this.clearExpired.bind(this);
    
    setInterval(this.clearExpired, 60 * 60 * 1000); // Clear expired once per hour
  };
  
  Notifications.prototype.create = function(notification) {
    notification.created_at = this.pg.now();
    notification.expires_at = this.pg.fromNow(60, 'day');
    return this.pg.insert(notification).into('notifications').returning('*');
  };
  
  Notifications.prototype.get = function(opts) {
    opts.limit = opts.limit || 20;
    opts.offset = opts.offset || this.pg.now();
    var selector = { };
    
    if(opts.unread) {
      selector.is_delivered = false;
    }
    
    if(opts.userId) {
      selector.user_id = opts.userId;
    } else if(opts.sessionId) {
      selector.session_id = opts.sessionId;
    } else {
      return this.pg.raw('select 1 where false');
    }
    
    return this.pg.select('*').from('notifications')
      .where(selector)
      .where('expires_at', '>', this.pg.now())
      .where('created_at', '<', opts.offset)
      .orderBy('created_at', 'desc')
      .limit(opts.limit);
  };
  
  Notifications.prototype.markRead = function(ids) {
    if(!ids || ids.length == 0) return;
    return this.pg('notifications')
      .whereIn('id', ids)
      .update('is_delivered', true)
      .exec();
  }
  
  Notifications.prototype.clearExpired = function() {
    return this.pg('notifications')
      .where('expires_at', '<', this.pg.now())
      .del()
      .exec();
  }
  
  return Notifications
})();

module.exports = Notifications;
