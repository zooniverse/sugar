'use strict';

var http = require('http');
var express = require('express');
var ejs = require('ejs');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var Primus = require('primus');
var Panoptes = require('./panoptes');
var PubSub = require('./pub_sub');

var Server = (function() {
  function Server() {
    this.pubSub = new PubSub();
    this._initializeApp();
    this._initializePrimus();
    
    this.app.get('/', this.indexAction);
    this.app.get('/primus.js', this.primusAction.bind(this));
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
    
    this.primus.on('connection', function(spark) {
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
  
  return Server;
})();

module.exports = Server;
