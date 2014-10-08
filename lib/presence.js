'use strict';

var Bluebird = require('bluebird');
var RedisClient = require('./redis_client');

var Presence = (function() {
  function Presence() {
    this.redis = new RedisClient();
    
    this.userActiveOn = this.userActiveOn.bind(this);
    this.userInactiveOn = this.userInactiveOn.bind(this);
    this.clearInactive = this.clearInactive.bind(this);
    this.channelCounts = this.channelCounts.bind(this);
    this.channels = this.channels.bind(this);
    this.countOn = this.countOn.bind(this);
    this.usersOn = this.usersOn.bind(this);
    this._scan = this._scan.bind(this);
    this.__scan = this.__scan.bind(this);
    this._scanner = this._scanner.bind(this);
    
    setInterval(this.clearInactive, 1 * 60 * 1000); // Clear inactive every minute
  }
  
  Presence.prototype.userActiveOn = function(channel, userKey) {
    this.redis.zaddAsync('presence:' + channel, +new Date(), userKey);
  };
  
  Presence.prototype.userInactiveOn = function(channel, userKey) {
    this.redis.zremAsync('presence:' + channel, userKey);
  };
  
  Presence.prototype.clearInactive = function() {
    var redis = this.redis;
    var fiveMinutesAgo = -5 * 60 * 1000 + (+new Date());
    
    this.channels().then(function(channels) {
      channels.forEach(function(channel) {
        redis.zremrangebyscoreAsync('presence:' + channel, '-inf', fiveMinutesAgo);
      });
    });
  };
  
  Presence.prototype.channelCounts = function() {
    var deferred = Bluebird.defer();
    var countOn = this.countOn;
    
    this.channels().then(function(channels) {
      var countingPromises = channels.map(function(channel) {
        return countOn(channel).then(function(count) {
          return { channel: channel, count: count };
        });
      });
      
      Bluebird.all(countingPromises).then(function(allCounts) {
        deferred.resolve(allCounts);
      });
    });
    
    return deferred.promise;
  };
  
  Presence.prototype.channels = function() {
    return this._scan({ method: 'scan', pattern: 'presence:*' }).then(function(keys) {
      return keys.map(function(key) {
        return key.match(/presence:(.*$)/)[1];
      });
    });
  };
  
  Presence.prototype.countOn = function(channel) {
    return this.redis.zcardAsync('presence:' + channel);
  };
  
  Presence.prototype.usersOn = function(channel) {
    return this._scan({ method: 'zscan', key: 'presence:' + channel, pattern: 'users:*' }).then(function(values) {
      return values.filter(function(key, i) {
        return i % 2 == 0;
      }).map(function(key) {
        return key.replace(/^users:/, '');
      });
    });
  };
  
  Presence.prototype._scan = function(opts) {
    var deferred = Bluebird.defer();
    opts.cursor = '0';
    opts.results = [];
    opts.deferred = deferred;
    
    this.__scan(opts);
    return deferred.promise;
  };
  
  Presence.prototype.__scan = function(opts) {
    this._scanner(opts).then(function(values) {
      opts.results = opts.results.concat(values[1]);
      
      if(values[0] === '0') {
        opts.deferred.resolve(opts.results);
      } else {
        this.__scan({
          key: opts.key,
          method: opts.method,
          cursor: values[0],
          pattern: opts.pattern,
          results: opts.results,
          deferred: opts.deferred
        });
      }
    }.bind(this));
  };
  
  Presence.prototype._scanner = function(opts) {
    if(opts.method === 'scan') {
      return this.redis.scanAsync(opts.cursor, 'match', opts.pattern);
    }
    
    return this.redis[opts.method + 'Async'](opts.key, opts.cursor, 'match', opts.pattern);
  };
  
  return Presence;
})();

module.exports = Presence;
