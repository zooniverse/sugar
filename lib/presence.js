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
    const twoMinutesAgo = -2 * 60 * 1000 + (+new Date());
    const channels = await this.channels()
    const promises = channels.map(channel => this.redis.zRemRangeByScore(`presence:${channel}`, '-inf', twoMinutesAgo));
    return Promise.all(promises);
  }

  channelCounts() {
    return this.channels().then((channels) => {
      var countingPromises;
      countingPromises = channels.map((channel) => {
        return this.countOn(channel).then(function(count) {
          return {
            channel: channel,
            count: count
          };
        });
      });
      return Promise.all(countingPromises);
    });
  }

  async channels() {
    const keys = await this._scan({
      method: 'scan',
      pattern: 'presence:*'
    });
    return keys.map(key => key.match(/presence:(.*$)/)[1]);
  }

  countOn(channel) {
    return this.redis.zCard(`presence:${channel}`);
  }

  async usersOn(channel) {
    const values = await this._scan({
      method: 'zScan',
      key: `presence:${channel}`,
      pattern: 'user:*'
    });
    return values.map(function({ value, score }) {
      return value.replace(/^user:/, '');
    });
  }

  _scan(opts) {
    opts.cursor = 0;
    opts.results = [];
    return this.__scan(opts);
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
    if (opts.method === 'scan') {
      return this.redis.scan(opts.cursor, { MATCH: opts.pattern });
    } else {
      return this.redis[opts.method](opts.key, opts.cursor, { MATCH: opts.pattern });
    }
  }

  _isUserChannel(channel) {
    return !!channel.match(/(session|user):/);
  }

};

module.exports = Presence;
