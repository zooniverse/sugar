require('./lib/env');
var new_relic = require('newrelic');
var Server = require('./lib/server');
var port = parseInt(process.env.SUGAR_PORT) || 2999;
var server = new Server();
server.listen(port);
