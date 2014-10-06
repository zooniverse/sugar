'use strict';

var http = require('http');
var express = require('express');
var ejs = require('ejs');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var Primus = require('primus');
var Panoptes = require('./panoptes');
var PubSub = require('./pub_sub');
var Notifications = require('./notifications');
var Announcements = require('./announcements');

var Server = (function() {
  function Server() {
    this.pubSub = new PubSub();
    this.notifications = new Notifications();
    this.announcements = new Announcements();
    this._initializeApp();
    this._initializePrimus();
    
    this.app.get('/', this.indexAction);
    this.app.get('/primus.js', this.primusAction.bind(this));
    this.app.post('/notify', this.notifyAction.bind(this));
    this.app.post('/announce', this.announceAction.bind(this));
    this.listen = this.listen.bind(this);
  };
  
  Server.prototype._initializeApp = function() {
    this.app = express();
    this.app.use(morgan('dev'));
    this.app.use(bodyParser.urlencoded({ extended: true }));
    this.app.engine('html', ejs.renderFile);
    this.server = http.createServer(this.app, { views: 'views' });
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
          success ? done() : done({
            statusCode: 403,
            message: 'Invalid credentials'
          });
        })
      } else {
        done({
          statusCode: 401,
          message: 'Authentication required'
        });
      }
    });
    
    this.primus.on('connection', function(spark) {
      if(spark.query.user_id == 'null') delete spark.query.user_id;
      if(spark.query.auth_token == 'null') delete spark.query.auth_token;
      if(spark.query.session_id == 'null') delete spark.query.session_id;
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
  
  Server.prototype.indexAction = function(req, res) {
    res.render('index.html');
  };
  
  Server.prototype.primusAction = function(req, res) {
    res.send(this.primus.library());
  };
  
  Server.prototype.notifyAction = function(req, res) {
    // TO-DO: Authorize notifying user
    var params = req.body;
    this.notifications.create(params).then(function(notification) {
      this.renderJSON(res, notification);
      var channel = params.user_id ? 'users:' + params.user_id : 'sessions:' + params.session_id;
      this.pubSub.publish(channel, notification);
    }.bind(this)).catch(function(ex) {
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
      res.status(400);
      this.renderJSON(res, { success: false });
    }.bind(this));
  };
  
  Server.prototype.extendSpark = function(spark) {
    spark.subscriptions = [];
    spark.pubSub = this.pubSub;
    spark.isGone = function() {
      this.subscriptions.forEach(function(subscription) {
        this.pubSub.unsubscribe(subscription.channel, subscription);
      }.bind(this));
    }.bind(spark);
    
    spark.on('incoming::ping', function() {
      if(spark.keepAliveTimer) clearTimeout(spark.keepAliveTimer);
      spark.keepAliveTimer = setTimeout(spark.isGone, 30000);
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
