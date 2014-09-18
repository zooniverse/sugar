'use strict';

var Server = require('./lib/server');

var port = parseInt(process.env.SUGAR_PORT) || 3000;
var server = new Server();
server.listen(port);
