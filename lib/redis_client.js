'use strict';

var Promise = require('bluebird');
var Redis = Promise.promisifyAll(require('redis'));

var RedisClient = (function() {
  function RedisClient() {
    var port = process.env.SUGAR_REDIS_PORT || 6379;
    var host = process.env.SUGAR_REDIS_HOST || '127.0.0.1';
    var auth = process.env.SUGAR_REDIS_AUTH;
    
    var client = Redis.createClient(port, host);
    if (auth) client.auth(auth);
    return client;
  };
  
  return RedisClient;
})();

module.exports = RedisClient
