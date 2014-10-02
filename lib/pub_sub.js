'use strict';

var RedisClient = require('./redis_client');
var Events = require('events');

var PubSub = (function() {
  function PubSub() {
    this.emitter = new Events.EventEmitter();
    
    this.redis = {
      pub: new RedisClient(),
      sub: new RedisClient(),
    };
    
    this.emitMessage = this.emitMessage.bind(this);
    this.redis.sub.on('message', this.emitMessage);
    this.redis.sub.on('pmessage', this.emitMessage);
    
    this.subscribe = this.subscribe.bind(this);
    this.unsubscribe = this.unsubscribe.bind(this);
    this.publish = this.publish.bind(this);
  };
  
  PubSub.prototype.emitMessage = function(pattern, channel, message) {
    message = JSON.parse(message || channel);
    return this.emitter.emit(pattern, message);
  };
  
  PubSub.prototype.subscribe = function(pattern, fn) {
    var method = pattern.match(/\*|\[|\]|\?/) ? 'psubscribe' : 'subscribe';
    return this.redis.sub[method + 'Async'](pattern).then(function() {
      this.emitter.on(pattern, fn);
    }.bind(this));
  };
  
  PubSub.prototype.unsubscribe = function(pattern, fn) {
    var method = pattern.match(/\*|\[|\]|\?/) ? 'punsubscribe' : 'unsubscribe';
    return this.redis.sub[method + 'Async'](pattern).then(function() {
      this.emitter.removeListener(pattern, fn);
    }.bind(this));
  };
  
  PubSub.prototype.publish = function(channel, message) {
    return this.redis.pub.publishAsync(channel, JSON.stringify(message));
  };
  
  return PubSub;
})();

module.exports = PubSub;
