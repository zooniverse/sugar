Bluebird = require 'bluebird'
Redis = Bluebird.promisifyAll require('redis')

class RedisClient
  constructor: ->
    port = process.env.SUGAR_REDIS_PORT or 6379
    host = process.env.SUGAR_REDIS_HOST or '127.0.0.1'
    auth = process.env.SUGAR_REDIS_AUTH
    client = Redis.createClient port, host
    client.auth(auth) if auth
    return client

module.exports = RedisClient
