var RedisClient;

RedisClient = require('./redis_client');

class Presence {
  constructor() {
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
    this.redis = new RedisClient();
    this.redis.connect();
    setInterval(this.clearInactive, 1 * 60 * 1000); // Clear inactive every minute
  }

  userActiveOn(channel, userKey) {
    if (this._isUserChannel(channel)) {
      return Promise.resolve();
    }
    return this.redis.zAdd(`presence:${channel}`, { score: +new Date(), value: userKey });
  }

  userInactiveOn(channel, userKey) {
    if (this._isUserChannel(channel)) {
      return Promise.resolve();
    }
    return this.redis.zRem(`presence:${channel}`, userKey);
  }

  async clearInactive() {
    const twoMinutesAgo = (+new Date()) - 120000;
    const channels = await this.channels();
    const promises = channels.map(channel => this.redis.zRemRangeByScore(`presence:${channel}`, '-inf', twoMinutesAgo));
    return Promise.all(promises);
  }

  async channelCounts() {
    const channels = await this.channels();
    const countingPromises = channels.map(async (channel) => {
      const count = await this.countOn(channel);
      return {
        channel: channel,
        count: count
      };
    });
    return Promise.all(countingPromises);
  }

  async channels() {
    const keys = await this._scan({
      pattern: 'presence:*'
    });
    return keys.map(key => key.match(/presence:(.*$)/)[1]);
  }

  countOn(channel) {
    return this.redis.zCard(`presence:${channel}`);
  }

  async usersOn(channel) {
    const values = await this._scan({
      key: `presence:${channel}`,
      pattern: 'user:*'
    });
    return values.map(function({ value, score }) {
      return value.replace(/^user:/, '');
    });
  }

  _scan(opts = {}) {
    return this.__scan({
      cursor: '0',
      results: [],
      ...opts
    });
  }

  async __scan(opts) {
    const values = await this._scanner(opts);
    const results = values.keys || values.members;
    opts.results = opts.results.concat(results);
    if (values.cursor === 0) {
      return Promise.resolve(opts.results);
    } else {
      opts.cursor = values.cursor;
      return this.__scan(opts);
    }
  }

  _scanner(opts) {
    if (opts.key) {
      return this.redis.zScan(opts.key, opts.cursor, { MATCH: opts.pattern });
    }
    return this.redis.scan(opts.cursor, { MATCH: opts.pattern });
  }

  _isUserChannel(channel) {
    return !!channel.match(/(session|user):/);
  }

};

module.exports = Presence;
