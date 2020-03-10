Bluebird = require 'bluebird'
Redis = Bluebird.promisifyAll require('redis')

class RedisClient
  constructor: ->
    port = process.env.SUGAR_REDIS_PORT
    port or= 6379

    host = process.env.SUGAR_REDIS_HOST
    host or= '127.0.0.1'

    auth = process.env.SUGAR_REDIS_AUTH
    db = process.env.SUGAR_REDIS_DB or 1

    # redis in test / dev doesn't have a TLS proxy in front of it
    auth_opts = if process.env.SUGAR_REDIS_NO_TLS
      {}
    else
      { auth_pass: auth, tls: { servername: host } }

    client = Redis.createClient(port, host, auth_opts)
    client.select db
    return client

module.exports = RedisClient
