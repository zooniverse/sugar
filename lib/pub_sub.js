var Events, RedisClient;

RedisClient = require('./redis_client');

Events = require('events');

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
    this.subscribers = {};
  }

  emitMessage(pattern, channel, message) {
    return this.emitter.emit(pattern, JSON.parse(message || channel));
  }

  subscribe(pattern, fn) {
    let subscriber = this.subscribers[pattern];
    if (!subscriber) {
      subscriber = this.redis.sub;
      this.subscribers[pattern] = subscriber;
    }
    const method = pattern.match(/\*|\[|\]|\?/) ? 'pSubscribe' : 'subscribe';
    this.emitter.on(pattern, fn);
    return subscriber[method](pattern, (message, channel) => {
      this.emitMessage(pattern, channel, message);
    });
  }

  unsubscribe(pattern, fn) {
    var listeners, method;
    method = pattern.match(/\*|\[|\]|\?/) ? 'pUnsubscribe' : 'unsubscribe';
    this.emitter.removeListener(pattern, fn);
    listeners = this.emitter.listenerCount(pattern);
    const subscriber = this.subscribers[pattern];
    if (subscriber && listeners === 0) {
      return subscriber[method](pattern);
    }
  }

  publish(channel, message) {
    return this.redis.pub.publish(channel, JSON.stringify(message));
  }

};

module.exports = PubSub;
