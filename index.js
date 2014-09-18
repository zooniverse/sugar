'use strict';

var http = require('http');
var express = require('express');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var Primus = require('primus');

var Panoptes = require('./lib/panoptes');

var port = parseInt(process.env.SUGAR_PORT) || 3000;

var app = express();
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: true }));
app.engine('html', require('ejs').renderFile);

var renderJSON = function(res, json) {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(json));
};

var server = http.createServer(app, { views: 'views' });
var primus = new Primus(server, {
  pathname: '/sugar',
  transformer: 'engine.io',
  origins: '*'
});

app.get('/', function(req, res) {
  res.render('index.html');
});

app.get('/primus.js', function(req, res) {
  res.send(primus.library());
});

primus.on('connection', function(spark) {
  spark.on('data', function(data) {
    
  });
});

primus.on('disconnection', function(spark) {
   
});

server.listen(port);
