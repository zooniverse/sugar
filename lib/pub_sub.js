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
    this.publisher = new RedisClient();
    this.publisher.connect();
    this.subscriber = new RedisClient();
    this.channelSubscribers = {};
  }

  emitMessage(pattern, channel, message) {
    return this.emitter.emit(pattern, JSON.parse(message || channel));
  }

  async subscribe(pattern, fn) {
    let subscriber = this.channelSubscribers[pattern];
    if (!subscriber) {
      subscriber = this.subscriber.duplicate();
      await subscriber.connect();
      this.channelSubscribers[pattern] = subscriber;
    }
    const method = pattern.match(/\*|\[|\]|\?/) ? 'pSubscribe' : 'subscribe';
    await subscriber[method](pattern, (message, channel) => {
      this.emitMessage(pattern, channel, message);
    });
    this.emitter.on(pattern, fn);
  }

  unsubscribe(pattern, fn) {
    this.emitter.removeListener(pattern, fn);
    const listeners = this.emitter.listenerCount(pattern);
    const subscriber = this.channelSubscribers[pattern];
    if (subscriber && listeners === 0) {
      const method = pattern.match(/\*|\[|\]|\?/) ? 'pUnsubscribe' : 'unsubscribe';
      return subscriber[method](pattern);
    }
  }

  async publish(channel, message) {
    return this.publisher.publish(channel, JSON.stringify(message));
  }

};

module.exports = PubSub;
