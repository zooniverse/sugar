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
    setInterval(this.clearInactive, 1 * 60 * 1000); // Clear inactive every minute
  }

  userActiveOn(channel, userKey) {
    if (this._isUserChannel(channel)) {
      return Promise.resolve();
    }
    return this.redis.zaddAsync(`presence:${channel}`, +new Date(), userKey);
  }

  userInactiveOn(channel, userKey) {
    if (this._isUserChannel(channel)) {
      return Promise.resolve();
    }
    return this.redis.zremAsync(`presence:${channel}`, userKey);
  }

  async clearInactive() {
    const twoMinutesAgo = (+new Date()) - 120000;
    const channels = await this.channels();
    const promises = channels.map(channel => this.redis.zremrangebyscoreAsync(`presence:${channel}`, '-inf', twoMinutesAgo));
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
    return keys.map(function(key) {
      return key.match(/presence:(.*$)/)[1];
    });
  }

  countOn(channel) {
    return this.redis.zcardAsync(`presence:${channel}`);
  }

  async usersOn(channel) {
    const values = await this._scan({
      key: `presence:${channel}`,
      pattern: 'user:*'
    });
    return values
      .filter((key, i) => i % 2 === 0)
      .map(key => key.replace(/^user:/, ''));
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
    opts.results = opts.results.concat(values[1]);
    if (values[0] === '0') {
      return Promise.resolve(opts.results);
    } else {
      opts.cursor = values[0];
      return this.__scan(opts);
    }
  }

  _scanner(opts) {
    if (opts.key) {
      return this.redis.zscanAsync(opts.key, opts.cursor, 'match', opts.pattern);
    } else {
      return this.redis.scanAsync(opts.cursor, 'match', opts.pattern);
    }
  }

  _isUserChannel(channel) {
    return !!channel.match(/(session|user):/);
  }

};

module.exports = Presence;
