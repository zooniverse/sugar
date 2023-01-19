var Panoptes, Presence, Primus, PubSub, basicAuth, bodyParser, cors, express, http, morgan;

http = require('http');

express = require('express');

bodyParser = require('body-parser');

morgan = require('morgan');

Primus = require('primus');

Panoptes = require('./panoptes');

PubSub = require('./pub_sub');

Presence = require('./presence');

basicAuth = require('./basic_auth');

cors = require('./cors');

class Server {
  constructor() {
    this.close = this.close.bind(this);
    this.authenticate = this.authenticate.bind(this);
    this.authorize = this.authorize.bind(this);
    this.listen = this.listen.bind(this);
    this.primusAction = this.primusAction.bind(this);
    this.presenceAction = this.presenceAction.bind(this);
    this.activeUsersAction = this.activeUsersAction.bind(this);
    this.notifyAction = this.notifyAction.bind(this);
    this.announceAction = this.announceAction.bind(this);
    this.experimentAction = this.experimentAction.bind(this);
    this._sendMessage = this._sendMessage.bind(this);
    this.extendSpark = this.extendSpark.bind(this);
    this._dispatchAction = this._dispatchAction.bind(this);
    this.clientSubscribe = this.clientSubscribe.bind(this);
    this.clientUnsubscribe = this.clientUnsubscribe.bind(this);
    this.clientEvent = this.clientEvent.bind(this);
    this.pubSub = new PubSub();
    this.presence = new Presence();
    this._initializeApp();
    this._initializePrimus();
    this.app.get('/primus.js', this.primusAction);
    this.app.get('/presence', this.presenceAction);
    this.app.get('/active_users', this.activeUsersAction);
    this.app.post('/notify', basicAuth, this.notifyAction);
    this.app.post('/announce', basicAuth, this.announceAction);
    this.app.post('/experiment', basicAuth, this.experimentAction);
    this.listen = this.listen;
  }

  close() {
    return this.server.close();
  }

  _initializeApp() {
    this.app = express();
    if (!process.env.SUGAR_TEST) {
      this.app.use(morgan('dev'));
    }
    this.app.use(cors);
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({
      extended: true
    }));
    this.app.use(express.static('public'));
    return this.server = http.createServer(this.app);
  }

  _initializePrimus() {
    this.primus = new Primus(this.server, {
      pathname: '/sugar',
      transformer: 'engine.io',
      origins: '*',
      transport: {
        allowEIO3: true
      }
    });
    this.primus.on('connection', (spark) => {
      if (spark.keepAliveTimer) {
        clearTimeout(spark.keepAliveTimer);
      }
      spark.keepAliveTimer = null;
      if (spark.query.user_id === 'null') {
        delete spark.query.user_id;
      }
      if (spark.query.auth_token === 'null') {
        delete spark.query.auth_token;
      }
      return this.authenticate(spark).then(() => {
        var loggedIn, userKey, userName;
        this.extendSpark(spark);
        ({userName, loggedIn, userKey} = spark);
        spark.on('data', (data) => {
          if (data && data.action) {
            return this._dispatchAction(spark, data);
          }
        });
        return spark.write({
          type: 'connection',
          userName: spark.userName,
          loggedIn: spark.loggedIn,
          userKey: spark.userKey
        });
      });
    });
    return this.primus.on('disconnection', function(spark) {
      return typeof spark.isGone === "function" ? spark.isGone() : void 0;
    });
  }

  authenticate(spark) {
    return Panoptes.authenticator(spark.query.user_id, spark.query.auth_token).then(function(result) {
      spark.loggedIn = result.loggedIn || false;
      if (result.loggedIn && result.user) {
        spark.userName = result.user;
      }
      return result;
    }).catch(function(e) {
      return e;
    });
  }

  authorize(spark, channel) {
    if (!channel.match(/^(user|session)/)) {
      return true;
    }
    return channel === spark.userKey;
  }

  listen(port) {
    return this.server.listen(port);
  }

  renderJSON(res, json, status = 200) {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = status;
    return res.end(JSON.stringify(json));
  }

  primusAction(req, res) {
    return res.send(this.primus.library());
  }

  presenceAction(req, res) {
    return this.presence.channelCounts().then((counts) => {
      return this.renderJSON(res, counts);
    }).catch((ex) => {
      console.error(ex);
      res.status(500);
      return this.renderJSON(res, {
        success: false
      });
    });
  }

  activeUsersAction(req, res) {
    var params;
    params = req.query;
    return this.presence.usersOn(params.channel).then((users) => {
      var id;
      return this.renderJSON(res, {
        users: (function() {
          var i, len, results;
          results = [];
          for (i = 0, len = users.length; i < len; i++) {
            id = users[i];
            results.push({
              id: id
            });
          }
          return results;
        })()
      });
    }).catch((ex) => {
      console.error(ex);
      res.status(500);
      return this.renderJSON(res, {
        success: false
      });
    });
  }

  notifyAction(req, res) {
    return this._sendMessage(req, res, 'notifications', 'notification', function(message) {
      return `user:${message.user_id}`;
    });
  }

  announceAction(req, res) {
    return this._sendMessage(req, res, 'announcements', 'announcement', function(message) {
      return message.section;
    });
  }

  experimentAction(req, res) {
    return this._sendMessage(req, res, 'experiments', 'experiment', function(message) {
      return `user:${message.user_id}`;
    });
  }

  _sendMessage(req, res, key, type, channelFor) {
    var i, len, message, params, ref;
    params = req.body;
    ref = params[key];
    for (i = 0, len = ref.length; i < len; i++) {
      message = ref[i];
      message.type = type;
      this.pubSub.publish(channelFor(message), message);
    }
    return this.renderJSON(res, params[key]);
  }

  extendSpark(spark) {
    var ref;
    spark.subscriptions = {};
    spark.pubSub = this.pubSub;
    spark.presence = this.presence;
    spark.sessionId = spark.id;
    if (spark.loggedIn && ((ref = spark.query) != null ? ref.user_id : void 0)) {
      spark.userKey = `user:${spark.query.user_id}`;
    } else {
      spark.userKey = `session:${spark.id}`;
    }
    spark.isGone = (function() {
      var channel, ref1, results, subscription;
      if (this.keepAliveTimer) {
        clearTimeout(this.keepAliveTimer);
      }
      this.keepAliveTimer = null;
      ref1 = this.subscriptions;
      results = [];
      for (channel in ref1) {
        subscription = ref1[channel];
        this.pubSub.unsubscribe(channel, subscription);
        results.push(this.presence.userInactiveOn(channel, this.userKey));
      }
      return results;
    }).bind(spark);
    return spark.on('incoming::ping', (function() {
      var channel, ref1, results, subscription;
      if (this.keepAliveTimer) {
        clearTimeout(this.keepAliveTimer);
      }
      this.keepAliveTimer = setTimeout(this.isGone, 30000);
      ref1 = this.subscriptions;
      results = [];
      for (channel in ref1) {
        subscription = ref1[channel];
        results.push(this.presence.userActiveOn(channel, this.userKey));
      }
      return results;
    }).bind(spark));
  }

  _dispatchAction(spark, call) {
    call.params || (call.params = {});
    call.params.spark = spark;
    return this[`client${call.action}`](call.params);
  }

  clientSubscribe(params) {
    var callback;
    if (!params.channel) {
      return;
    }
    if (params.spark.subscriptions[params.channel]) {
      return;
    }
    if (!this.authorize(params.spark, params.channel)) {
      return;
    }
    callback = (function(data) {
      return this.spark.write({
        channel: this.channel,
        type: data.type,
        data: data
      });
    }).bind({
      spark: params.spark,
      channel: params.channel
    });
    callback.channel = params.channel;
    params.spark.subscriptions[params.channel] = callback;
    this.pubSub.subscribe(params.channel, callback);
    this.presence.userActiveOn(params.channel, params.spark.userKey);
    return params.spark.write({
      type: 'response',
      action: 'Subscribe',
      params: {
        channel: params.channel
      }
    });
  }

  clientUnsubscribe(params) {
    var subscription;
    if (!params.channel) {
      return;
    }
    subscription = params.spark.subscriptions[params.channel];
    if (!subscription) {
      return;
    }
    delete params.spark.subscriptions[params.channel];
    this.pubSub.unsubscribe(subscription.channel, subscription);
    this.presence.userInactiveOn(subscription.channel, params.spark.userKey);
    return params.spark.write({
      type: 'response',
      action: 'Unsubscribe',
      params: {
        channel: params.channel
      }
    });
  }

  clientEvent(params) {
    var payload;
    payload = {
      channel: params.channel,
      userKey: params.spark.userKey,
      type: params.type,
      data: params.data || {}
    };
    this.pubSub.publish(`outgoing:${params.channel}`, payload);
    return params.spark.write({
      type: 'response',
      action: 'Event',
      params: payload
    });
  }

};

module.exports = Server;
