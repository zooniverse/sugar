var Redis = require('redis');

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
      tls: true,
      servername: host
    };
    client = Redis.createClient({
      database: db,
      socket: {
        host,
        port
      },
      password: auth,
      ...auth_opts
    });
    client.connect();
    return client;
  }

};

module.exports = RedisClient;
