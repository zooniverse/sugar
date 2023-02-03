var Redis = require('redis');
var Sentry = require('@sentry/node');

const { promisify } = require('util');

const redisCommands = [
  'exists',
  'flushall',
  'publish',
  'subscribe',
  'psubscribe',
  'unsubscribe',
  'punsubscribe',
  'zadd',
  'zrem',
  'zrangebyscore',
  'zremrangebyscore',
  'zcard',
  'scan',
  'zscan'
];

class RedisClient {
  constructor() {
    var auth, auth_opts, client, db, host, port;
    port = process.env.SUGAR_REDIS_PORT;
    port || (port = 6379);
    host = process.env.SUGAR_REDIS_HOST;
    host || (host = '127.0.0.1');
    auth = process.env.SUGAR_REDIS_AUTH;
    db = process.env.SUGAR_REDIS_DB || 1;
    // redis in test / dev doesn't have a TLS proxy in front of it
    auth_opts = process.env.SUGAR_REDIS_NO_TLS ? {} : {
      auth_pass: auth,
      tls: {
        servername: host
      }
    };
    client = Redis.createClient(port, host, auth_opts);
    client.on('error', function (error) {
      Sentry.captureException(error);
    });
    client.select(db);
    redisCommands.forEach(command => {
      client[`${command}Async`] = promisify(client[command]);
    });
    return client;
  }

};

module.exports = RedisClient;
