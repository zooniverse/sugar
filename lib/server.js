'use strict';

var http = require('http');
var express = require('express');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var Primus = require('primus');
var Panoptes = require('./panoptes');
var PubSub = require('./pub_sub');
var Notifications = require('./notifications');
var Announcements = require('./announcements');
var Presence = require('./presence');

var Server = (function() {
  function Server() {
    this.pubSub = new PubSub();
    this.notifications = new Notifications();
    this.announcements = new Announcements();
    this.presence = new Presence();
    this._initializeApp();
    this._initializePrimus();
    
    this.app.get('/primus.js', this.primusAction.bind(this));
    this.app.post('/notify', this.notifyAction.bind(this));
    this.app.post('/announce', this.announceAction.bind(this));
    this.app.get('/presence', this.presenceAction.bind(this));
    this.app.get('/active_users', this.activeUsersAction.bind(this));
    this.listen = this.listen.bind(this);
  }
  
  Server.prototype._initializeApp = function() {
    this.app = express();
    this.app.use(morgan('dev'));
    this.app.use(bodyParser.urlencoded({ extended: true }));
    this.app.use(express.static('public'));
    this.server = http.createServer(this.app);
  };
  
  Server.prototype._initializePrimus = function() {
    this.primus = new Primus(this.server, {
      pathname: '/sugar',
      transformer: 'engine.io',
      origins: '*'
    });
    
    this.primus.authorize(function(req, done) {
      // TO-DO: Store Panoptes authentication success, check for user:* channels
      return done();
      if(req.query.user_id && req.query.auth_token) {
        Panoptes.authenticator(req.query.user_id, req.query.auth_token).then(function(success) {
          return success ? done() : done({
            statusCode: 403,
            message: 'Invalid credentials'
          });
        });
      } else {
        return done({
          statusCode: 401,
          message: 'Authentication required'
        });
      }
    });
    
    this.primus.on('connection', function(spark) {
      if(spark.query.user_id === 'null') delete spark.query.user_id;
      if(spark.query.auth_token === 'null') delete spark.query.auth_token;
      if(spark.query.session_id === 'null') delete spark.query.session_id;
      this.extendSpark(spark);
      
      spark.on('data', function(data) {
        if(data && data.action) this._dispatchAction(spark, data);
      }.bind(this));
    }.bind(this));
    
    this.primus.on('disconnection', function(spark) {
      spark.isGone();
    }.bind(this));
  };
  
  Server.prototype.listen = function(port) {
    this.server.listen(port);
  };
  
  Server.prototype.renderJSON = function(res, json) {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(json));
  };
  
  Server.prototype.primusAction = function(req, res) {
    res.send(this.primus.library());
  };
  
  Server.prototype.notifyAction = function(req, res) {
    // TO-DO: Authorize notifying user
    var params = req.body;
    this.notifications.create(params).then(function(notification) {
      this.renderJSON(res, notification);
      var channel = params.user_id ? 'user:' + params.user_id : 'session:' + params.session_id;
      this.pubSub.publish(channel, notification);
    }.bind(this)).catch(function(ex) {
      console.error(ex);
      res.status(400);
      this.renderJSON(res, { success: false });
    }.bind(this));
  };
  
  Server.prototype.announceAction = function(req, res) {
    // TO-DO: Authorize announcing user
    var params = req.body;
    this.announcements.create(params).then(function(announcement) {
      this.renderJSON(res, announcement);
      this.pubSub.publish(announcement.scope, announcement);
    }.bind(this)).catch(function(ex) {
      console.error(ex);
      res.status(400);
      this.renderJSON(res, { success: false });
    }.bind(this));
  };
  
  Server.prototype.presenceAction = function(req, res) {
    this.presence.channelCounts().then(function(counts) {
      this.renderJSON(res, counts);
    }.bind(this)).catch(function(ex) {
      console.error(ex);
      res.status(500);
      this.renderJSON(res, { success: false });
    });
  };
  
  Server.prototype.activeUsersAction = function(req, res) {
    var params = req.query;
    this.presence.usersOn(params.channel).then(function(users) {
      this.renderJSON(res, users);
    }.bind(this)).catch(function(ex) {
      console.error(ex);
      res.status(500);
      this.renderJSON(res, { success: false });
    });
  };
  
  Server.prototype.extendSpark = function(spark) {
    spark.subscriptions = [];
    spark.pubSub = this.pubSub;
    spark.presence = this.presence;
    if(spark.query.user_id) {
      spark.userKey = 'user:' + spark.query.user_id;
    } else if(spark.query.session_id) {
      spark.userKey = 'session:' + spark.query.session_id;
    } else {
      spark.userKey = 'session:' + spark.id;
    }
    
    spark.isGone = function() {
      this.subscriptions.forEach(function(subscription) {
        this.pubSub.unsubscribe(subscription.channel, subscription);
        this.presence.userInactiveOn(subscription.channel, this.userKey);
      }.bind(this));
    }.bind(spark);
    
    spark.on('incoming::ping', function() {
      if(spark.keepAliveTimer) clearTimeout(spark.keepAliveTimer);
      spark.keepAliveTimer = setTimeout(spark.isGone, 30000);
      this.subscriptions.forEach(function(subscription) {
        this.presence.userActiveOn(subscription.channel, this.userKey);
      }.bind(spark));
    });
  };
  
  Server.prototype._dispatchAction = function(spark, call) {
    call.params = call.params || { };
    call.params.spark = spark;
    this['client' + call.action](call.params);
  };
  
  Server.prototype.clientSubscribe = function(params) {
    if(!params.channel) return;
    
    var callback = function(data) {
      this.spark.write({ channel: this.channel, data: data });
    }.bind({ spark: params.spark, channel: params.channel });
    
    callback.channel = params.channel;
    params.spark.subscriptions.push(callback);
    this.pubSub.subscribe(params.channel, callback);
    this.presence.userActiveOn(params.channel, params.spark.userKey);
  };
  
  Server.prototype.clientGetNotifications = function(params) {
    this.notifications.get(params).then(function(notifications) {
      params.spark.write({ type: 'notifications', notifications: notifications });
    });
  };
  
  Server.prototype.clientReadNotifications = function(params) {
    this.notifications.markRead(params.ids);
  };
  
  Server.prototype.clientGetAnnouncements = function(params) {
    this.announcements.get(params).then(function(announcements) {
      params.spark.write({ type: 'announcements', announcements: announcements });
    });
  };
  
  Server.prototype.clientReadAnnouncements = function(params) {
    this.announcements.markRead(params);
  };
  
  return Server;
})();

module.exports = Server;
