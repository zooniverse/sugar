const RedisClient = require('./redis_client');
const Events = require('events');

Events.EventEmitter.defaultMaxListeners = 0;

class PubSub {
  constructor() {
    this.emitMessage = this.emitMessage.bind(this);
    this.subscribe = this.subscribe.bind(this);
    this.unsubscribe = this.unsubscribe.bind(this);
    this.publish = this.publish.bind(this);
    this.emitter = new Events.EventEmitter();
    this.redis = {
      pub: new RedisClient(),
      sub: new RedisClient()
    };
    this.redis.sub.on('message', this.emitMessage);
    this.redis.sub.on('pmessage', this.emitMessage);
  }

  emitMessage(pattern, channel, message) {
    this.emitter.emit(pattern, JSON.parse(message || channel));
  }

  async subscribe(pattern, fn) {
    const isPattern = pattern.match(/\*|\[|\]|\?/);
    if (isPattern) {
      await this.redis.sub.psubscribeAsync(pattern);
    } else {
      await this.redis.sub.subscribeAsync(pattern);
    }
    this.emitter.on(pattern, fn);
  }

  unsubscribe(pattern, fn) {
    this.emitter.removeListener(pattern, fn);
    const listeners = this.emitter.listenerCount(pattern);
    if (listeners === 0) {
      const isPattern = pattern.match(/\*|\[|\]|\?/);
      if (isPattern) {
        return this.redis.sub.punsubscribeAsync(pattern);
      }
      return this.redis.sub.unsubscribeAsync(pattern);
    }
  }

  publish(channel, message) {
    return this.redis.pub.publishAsync(channel, JSON.stringify(message));
  }

};

module.exports = PubSub;
