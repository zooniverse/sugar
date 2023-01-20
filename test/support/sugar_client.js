class SugarClient {
  constructor(sugar, query) {
    var binding, client, connection, i, len, method, methods, primus;
    connection = `http://localhost:${sugar.port}`;
    if (query) {
      connection += `?${query}`;
    }
    primus = sugar.primus;
    client = primus.Socket(connection);
    binding = {sugar, primus, client};
    methods = ['spark', 'pong', 'subscribeTo', 'unsubscribeFrom', 'sendEvent', 'keepAliveTimer', 'hasResponse'];
    for (i = 0, len = methods.length; i < len; i++) {
      method = methods[i];
      client[method] = this[method].bind(binding);
    }
    this.listenTo(client);
    return client;
  }

  listenTo(client) {
    return client.on('data', client.hasResponse);
  }

  spark() {
    const client = this.client;
    const primus = this.primus;
    return new Promise(function (resolve, reject) {
      client.id((id) => {
        resolve(primus.spark(id));
      });
    });
  }

  pong() {
    this.client.write(`primus::pong::${+new Date()}`);
    return new Promise(function (resolve, reject) {
      setTimeout(function() {
        resolve();
      }, 100);
    });
  }

  subscribeTo(channel) {
    this.client.write({
      action: 'Subscribe',
      params: {
        channel: channel
      }
    });
    const client = this.client;
    return new Promise(function (resolve, reject) {
      client.once(`subscribedTo::${channel}`, function() {
        resolve();
      });
    });
  }

  unsubscribeFrom(channel) {
    this.client.write({
      action: 'Unsubscribe',
      params: {
        channel: channel
      }
    });
    const client = this.client;
    return new Promise(function (resolve, reject) {
      client.once(`unsubscribedFrom::${channel}`, function() {
        resolve();
      });
    });
  }

  sendEvent(opts = {}) {
    var base;
    (base = this.client).eventId || (base.eventId = 0);
    this.client.eventId += 1;
    opts.data || (opts.data = {});
    opts.data.id = this.client.eventId;
    this.client.write({
      action: 'Event',
      params: opts
    });
    const client = this.client;
    return new Promise(function (resolve, reject) {
      client.once(`sentEvent::${opts.data.id}`, function(payload) {
        resolve(payload);
      });
    });
  }

  keepAliveTimer() {
    return this.client.spark().then(function(spark) {
      var ref;
      return (ref = spark.keepAliveTimer) != null ? ref._monotonicStartTime : void 0;
    });
  }

  hasResponse(data) {
    var key;
    key = data.type === 'response' ? data.action : data.type;
    switch (key) {
      case 'connection':
        this.client.connection = data;
        return this.client.emit('connected', data);
      case 'Subscribe':
        return this.client.emit(`subscribedTo::${data.params.channel}`, data);
      case 'Unsubscribe':
        return this.client.emit(`unsubscribedFrom::${data.params.channel}`, data);
      case 'Event':
        return this.client.emit(`sentEvent::${data.params.data.id}`, data.params);
    }
  }

};

module.exports = SugarClient;
