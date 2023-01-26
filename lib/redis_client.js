var Redis = require('redis');

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
    return Redis.createClient({
      database: db,
      socket: {
        host,
        port,
        ...tls_opts
      },
      password: auth,
    });
  }

};

module.exports = RedisClient;
