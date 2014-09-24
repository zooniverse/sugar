'use strict';

var http = require('http');
var express = require('express');
var ejs = require('ejs');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var Primus = require('primus');
var Panoptes = require('./panoptes');

var Server = (function() {
  function Server() {
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
      spark.on('data', function(data) {
        
      });
    });
    
    this.primus.on('disconnection', function(spark) {
      
    });
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
  
  Server.prototype.fn = function() {
    
  };
  
  Server.prototype.fn = function() {
    
  };
  
  Server.prototype.fn = function() {
    
  };
  
  return Server;
})();

module.exports = Server;
