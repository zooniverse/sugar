var Promise = require('bluebird');
var Redis = Promise.promisifyAll(require('redis'));
var Events = require('events');

var PubSub = (function() {
  function PubSub() {
    this.emitter = new Events.EventEmitter();
    
    this.redisConfig = {
      port: process.env.SUGAR_REDIS_PORT || 6379,
      host: process.env.SUGAR_REDIS_HOST || '127.0.0.1',
      auth: process.env.SUGAR_REDIS_AUTH
    };
    
    this.redis = {
      pub: this.redisClient(),
      sub: this.redisClient(),
      default: this.redisClient()
    };
    
    this.emitMessage = this.emitMessage.bind(this);
    this.redis.sub.on('message', this.emitMessage);
    this.redis.sub.on('pmessage', this.emitMessage);
    
    this.subscribe = this.subscribe.bind(this);
    this.unsubscribe = this.unsubscribe.bind(this);
    this.publish = this.publish.bind(this);
  };
  
  PubSub.prototype.redisClient = function() {
    var client = Redis.createClient(this.redisConfig.port, this.redisConfig.host);
    if (this.redisConfig.auth) client.auth(this.redisConfig.auth);
    return client;
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
