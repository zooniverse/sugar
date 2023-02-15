var Redis = require('redis');
var Sentry = require('@sentry/node');

class RedisClient {
  constructor() {
    const port = process.env.SUGAR_REDIS_PORT || 6379;
    const host = process.env.SUGAR_REDIS_HOST || '127.0.0.1';
    const auth = process.env.SUGAR_REDIS_AUTH;
    const db = process.env.SUGAR_REDIS_DB || 1;
    // redis in test / dev doesn't have a TLS proxy in front of it
    const tls_opts = process.env.SUGAR_REDIS_NO_TLS ? {} : {
      tls: true,
      servername: host
    };
    const client = Redis.createClient({
      database: db,
      socket: {
        host,
        port,
        ...tls_opts
      },
      password: auth
    });
    client.on('error', function (error) {
      Sentry.captureException(error);
    });
    return client;
  }

};

module.exports = RedisClient;
