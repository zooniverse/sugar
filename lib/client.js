class SugarClient {
  constructor(userId, authToken) {
    this.primusUrl = this.primusUrl.bind(this);
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.receiveData = this.receiveData.bind(this);
    this.subscribeTo = this.subscribeTo.bind(this);
    this.unsubscribeFrom = this.unsubscribeFrom.bind(this);
    this.on = this.on.bind(this);
    this.off = this.off.bind(this);
    this.emit = this.emit.bind(this);
    this.__subscribeToChannels = this.__subscribeToChannels.bind(this);
    this.__subscribeTo = this.__subscribeTo.bind(this);
    this.createEvent = this.createEvent.bind(this);
    this.userId = userId;
    this.authToken = authToken;
    this.events = {};
    this.subscriptions = {};
    this.initializePrimus();
  }

  initializePrimus() {
    var primusKlass;
    primusKlass = typeof Primus !== 'undefined' ? Primus : SugarClient.prototype.Primus;
    this.primus = primusKlass.connect(void 0, {
      websockets: true,
      network: true,
      manual: true
    });
    this.primus.on('outgoing::url', this.primusUrl);
    return this.primus.on('data', this.receiveData);
  }

  primusUrl(baseUrl) {
    if (this.userId && this.authToken) {
      return baseUrl.query = `user_id=${this.userId}&auth_token=${this.authToken}`;
    }
  }

  connect() {
    this.disconnect();
    return this.primus.open();
  }

  disconnect() {
    var _, i, key, len, userKeys;
    userKeys = (function() {
      var ref, results;
      ref = this.subscriptions;
      results = [];
      for (key in ref) {
        _ = ref[key];
        if (key.match(/^(session|user):/i)) {
          results.push(key);
        }
      }
      return results;
    }).call(this);
    for (i = 0, len = userKeys.length; i < len; i++) {
      key = userKeys[i];
      delete this.subscriptions[key];
    }
    this.userKey = this.loggedIn = null;
    return this.primus.end();
  }

  receiveData(data) {
    if (data.type === 'connection') {
      if (typeof console !== "undefined" && console !== null) {
        if (typeof console.info === "function") {
          console.info('[CONNECTED] ', data);
        }
      }
      this.loggedIn = data.loggedIn;
      this.userKey = data.userKey;
      this.subscriptions[this.userKey] = true;
      return setTimeout(this.__subscribeToChannels, 100);
    } else {
      return this.emit(data);
    }
  }

  subscribeTo(channel) {
    if (this.subscriptions[channel]) {
      return false;
    }
    this.subscriptions[channel] = true;
    return this.__subscribeTo(channel);
  }

  unsubscribeFrom(channel) {
    if (!this.subscriptions[channel]) {
      return;
    }
    delete this.subscriptions[channel];
    return this.primus.write({
      action: 'Unsubscribe',
      params: {channel}
    });
  }

  on(type, callback) {
    var base;
    (base = this.events)[type] || (base[type] = []);
    return this.events[type].push(callback);
  }

  off(type, callback) {
    if (callback && this.events[type]) {
      return this.events[type] = this.events[type].filter(function(cb) {
        return cb !== callback;
      });
    } else {
      return delete this.events[type];
    }
  }

  emit(data) {
    var callback, callbacks, i, len, results;
    callbacks = this.events[data.type] || [];
    results = [];
    for (i = 0, len = callbacks.length; i < len; i++) {
      callback = callbacks[i];
      results.push(callback(data));
    }
    return results;
  }

  __subscribeToChannels() {
    var _, channel, ref, results;
    ref = this.subscriptions;
    results = [];
    for (channel in ref) {
      _ = ref[channel];
      results.push(this.__subscribeTo(channel));
    }
    return results;
  }

  __subscribeTo(channel) {
    return this.primus.write({
      action: 'Subscribe',
      params: {channel}
    });
  }

  createEvent(type, channel, data) {
    return this.primus.write({
      action: 'Event',
      params: {type, channel, data}
    });
  }

};

if (typeof module !== "undefined" && module !== null) {
  module.exports = SugarClient;
}
