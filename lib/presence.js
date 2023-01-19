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

  clearInactive() {
    var twoMinutesAgo;
    twoMinutesAgo = -2 * 60 * 1000 + (+new Date());
    return this.channels().then((channels) => {
      var channel, j, len, promises;
      promises = [];
      for (j = 0, len = channels.length; j < len; j++) {
        channel = channels[j];
        promises.push(this.redis.zremrangebyscoreAsync(`presence:${channel}`, '-inf', twoMinutesAgo));
      }
      return Promise.all(promises);
    });
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

  channels() {
    return this._scan({
      method: 'scan',
      pattern: 'presence:*'
    }).then(function(keys) {
      return keys.map(function(key) {
        return key.match(/presence:(.*$)/)[1];
      });
    });
  }

  countOn(channel) {
    return this.redis.zcardAsync(`presence:${channel}`);
  }

  usersOn(channel) {
    return this._scan({
      method: 'zscan',
      key: `presence:${channel}`,
      pattern: 'user:*'
    }).then(function(values) {
      return values.filter(function(key, i) {
        return i % 2 === 0;
      }).map(function(key) {
        return key.replace(/^user:/, '');
      });
    });
  }

  _scan(opts) {
    var k, ref, v;
    ref = {
      cursor: '0',
      results: [],
    };
    for (k in ref) {
      v = ref[k];
      opts[k] = v;
    }
    return this.__scan(opts);
  }

  __scan(opts) {
    return this._scanner(opts).then((values) => {
      opts.results = opts.results.concat(values[1]);
      if (values[0] === '0') {
        return Promise.resolve(opts.results);
      } else {
        opts.cursor = values[0];
        return this.__scan(opts);
      }
    });
  }

  _scanner(opts) {
    if (opts.method === 'scan') {
      return this.redis.scanAsync(opts.cursor, 'match', opts.pattern);
    } else {
      return this.redis[`${opts.method}Async`](opts.key, opts.cursor, 'match', opts.pattern);
    }
  }

  _isUserChannel(channel) {
    return !!channel.match(/(session|user):/);
  }

};

module.exports = Presence;