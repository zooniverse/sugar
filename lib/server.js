const Sentry = require('@sentry/node');
const http = require('http');
const express = require('express');
const rateLimit = require('express-rate-limit')
const bodyParser = require('body-parser');
const morgan = require('morgan');
const Primus = require('primus');
const Panoptes = require('./panoptes');
const PubSub = require('./pub_sub');
const Presence = require('./presence');
const basicAuth = require('./basic_auth');
const cors = require('./cors');
const cacheHeaders = require('./cacheHeaders')

class Server {
  constructor() {
    const limiter = rateLimit({
    	windowMs: 15 * 60 * 1000, // 15 minutes
    	max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    })
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
    this.app.get('/presence', cacheHeaders, this.presenceAction);
    this.app.get('/active_users', cacheHeaders, this.activeUsersAction);
    this.app.post('/notify', limiter, basicAuth, this.notifyAction);
    this.app.post('/announce', limiter, basicAuth, this.announceAction);
    this.app.post('/experiment', limiter, basicAuth, this.experimentAction);
    this.app.use(Sentry.Handlers.errorHandler());
    this.app.use(function onError(error, req, res, next) {
      console.error(error);
      res.statusCode=500;
      res.end(res.sentry + "\n");
    });
  }

  close() {
    return this.server.close();
  }

  _initializeApp() {
    this.app = express();
    this.app.use(Sentry.Handlers.requestHandler());
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

  async presenceAction(req, res) {
    try {
      const counts = await this.presence.channelCounts();
      return this.renderJSON(res, counts);
    } catch (ex) {
      Sentry.captureException(ex);
      console.error(ex);
      res.status(500);
      return this.renderJSON(res, {
        success: false
      });
    }
  }

  async activeUsersAction(req, res) {
    try {
      const params = req.query;
      const userIDs = await this.presence.usersOn(params.channel);
      const users = userIDs.map(id => ({ id }));
      return this.renderJSON(res, { users });
    } catch (ex) {
      Sentry.captureException(ex);
      console.error(ex);
      res.status(500);
      return this.renderJSON(res, {
        success: false
      });
    }
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
    const params = req.body;
    params[key].forEach(message => {
      message.type = type;
      this.pubSub.publish(channelFor(message), message);
    });
    return this.renderJSON(res, params[key]);
  }

  extendSpark(spark) {
    const pubSub = this.pubSub;
    const presence = this.presence;
    spark.subscriptions = {};
    spark.sessionId = spark.id;
    const user_id = spark.query != null ? spark.query.user_id : void 0;
    if (spark.loggedIn && user_id) {
      spark.userKey = `user:${user_id}`;
    } else {
      spark.userKey = `session:${spark.id}`;
    }

    spark.isGone = function isGone() {
      var channel;
      if (spark.keepAliveTimer) {
        clearTimeout(spark.keepAliveTimer);
      }
      spark.keepAliveTimer = null;
      for (channel in spark.subscriptions) {
        var subscription = spark.subscriptions[channel];
        pubSub.unsubscribe(channel, subscription);
        presence.userInactiveOn(channel, spark.userKey);
      }
    }

    function onPong() {
      var channel;
      if (spark.keepAliveTimer) {
        clearTimeout(spark.keepAliveTimer);
      }
      spark.keepAliveTimer = setTimeout(spark.isGone, 30000);
      for (channel in spark.subscriptions) {
        presence.userActiveOn(channel, spark.userKey);
      }
    }
    spark.on('incoming::pong', onPong);
  }

  _dispatchAction(spark, call) {
    call.params || (call.params = {});
    call.params.spark = spark;
    return this[`client${call.action}`](call.params);
  }

  clientSubscribe({ spark, channel }) {
    var callback;
    if (!channel) {
      return;
    }
    if (spark.subscriptions[channel]) {
      return;
    }
    if (!this.authorize(spark, channel)) {
      return;
    }

    function callback(data) {
      spark.write({
        channel,
        type: data.type,
        data
      });
    }
    callback.channel = channel;
    spark.subscriptions[channel] = callback;
    this.pubSub.subscribe(channel, callback);
    this.presence.userActiveOn(channel, spark.userKey);
    spark.write({
      type: 'response',
      action: 'Subscribe',
      params: {
        channel
      }
    });
  }

  clientUnsubscribe({ spark, channel }) {
    var subscription;
    if (!channel) {
      return;
    }
    subscription = spark.subscriptions[channel];
    if (!subscription) {
      return;
    }
    delete spark.subscriptions[channel];
    this.pubSub.unsubscribe(subscription.channel, subscription);
    this.presence.userInactiveOn(subscription.channel, spark.userKey);
    spark.write({
      type: 'response',
      action: 'Unsubscribe',
      params: {
        channel
      }
    });
  }

  clientEvent({ spark, channel, type, data = {} }) {
    const payload = {
      channel,
      userKey: spark.userKey,
      type,
      data
    };
    this.pubSub.publish(`outgoing:${channel}`, payload);
    spark.write({
      type: 'response',
      action: 'Event',
      params: payload
    });
  }

};

module.exports = Server;
