'use strict';

var Promise = require('bluebird');
var RedisClient = require('./redis_client');
var PostgresClient = require('./postgres_client');

var Announcements = (function() {
  function Announcements() {
    this.redis = new RedisClient();
    this.pg = new PostgresClient();
    
    this.create = this.create.bind(this);
    this.get = this.get.bind(this);
    this.markRead = this.markRead.bind(this);
  };
  
  Announcements.prototype.create = function(params) {
    params.created_at = this.pg.now();
    params.expires_at = params.expires_at || this.pg.fromNow(30, 'day');
    return this.pg.insert(params)
      .into('announcements')
      .returning('*')
      .then(function(data) {
        var record = data[0];
        var redisKey = 'announcements:' + record.scope + ':' + record.id;
        
        this.redis.multi()
          .hset(redisKey, 'created_at', record.created_at)
          .pexpireat(redisKey, +record.expires_at)
          .exec();
        
        return record;
      }.bind(this));
  };
  
  Announcements.prototype.get = function(opts) {
    var userKey = this._userKeyOf(opts.spark);
    var deferred = Promise.defer();
    this._getRecords(opts).filter(function(announcement) {
      return this._hasSeen(userKey, announcement);
    }.bind(this)).then(function(filtered) {
      deferred.resolve(filtered);
    });
    
    return deferred.promise;
  };
  
  Announcements.prototype.markRead = function(params) {
    if(!params.keys || params.keys.length == 0) return;
    var userKey = this._userKeyOf(params.spark);
    var multi = this.redis.multi();
    
    params.keys.forEach(function(key) {
      multi = multi.hset('announcements:' + key, userKey, true);
    });
    
    return multi.execAsync();
  };
  
  Announcements.prototype._getRecords = function(opts) {
    var channels = opts.channels || [];
    if(typeof channels == 'string') channels = [channels];
    if(channels.length == 0) return this.pg.emptySet();
    var deferred = Promise.defer();
    this.pg.select('*').from('announcements')
      .whereIn('scope', channels)
      .where('expires_at', '>', this.pg.now())
      .orderBy('created_at', 'desc')
      .then(function(announcements) {
        return deferred.resolve(announcements);
      });
    
    return deferred.promise;
  };
  
  Announcements.prototype._hasSeen = function(userKey, announcement) {
    var redisKey = 'announcements:' + announcement.scope + ':' + announcement.id;
    return this.redis.hexistsAsync(redisKey, userKey).then(function(result) {
      return result === 0;
    });
  };
  
  Announcements.prototype._userKeyOf = function(spark) {
    return 'user:' + (spark.query.user_id || spark.query.session_id);
  };
  
  return Announcements;
})();

module.exports = Announcements
