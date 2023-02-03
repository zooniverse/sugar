require('./lib/env');
var new_relic = require('newrelic');
var Sentry = require('@sentry/node');
var Server = require('./lib/server');

Sentry.init({
  dsn: "https://4f4918f78b224ac19e4d32e99a165805@o274434.ingest.sentry.io/4504616446984192"
});
var port = parseInt(process.env.SUGAR_PORT) || 2999;
var server = new Server();
server.listen(port);
