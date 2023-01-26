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
    this.subscriber.connect();
  }

  emitMessage(pattern, channel, message) {
    return this.emitter.emit(pattern, JSON.parse(message || channel));
  }

  async subscribe(pattern, fn) {
    const isPattern = pattern.match(/\*|\[|\]|\?/);
    const handler = (message, channel) => this.emitMessage(pattern, channel, message);
    if (isPattern) {
      await this.subscriber.pSubscribe(pattern, handler);
    } else {
      await this.subscriber.subscribe(pattern, handler);
    }
    this.emitter.on(pattern, fn);
  }

  unsubscribe(pattern, fn) {
    this.emitter.removeListener(pattern, fn);
    const listeners = this.emitter.listenerCount(pattern);
    if (listeners === 0) {
      const isPattern = pattern.match(/\*|\[|\]|\?/);
      if (isPattern) {
        return this.subscriber.pUnsubscribe(pattern);
      }
      return this.subscriber.unsubscribe(pattern);
    }
  }

  async publish(channel, message) {
    return this.publisher.publish(channel, JSON.stringify(message));
  }

};

module.exports = PubSub;
