Bluebird = require 'bluebird'
Redis = Bluebird.promisifyAll require('redis')

class RedisClient
  constructor: ->
    port = process.env.SUGAR_REDIS_PORT or 6379
    host = process.env.SUGAR_REDIS_HOST or '127.0.0.1'
    auth = process.env.SUGAR_REDIS_AUTH
    db = process.env.SUGAR_REDIS_DB or 1
    
    client = Redis.createClient port, host
    client.auth(auth) if auth
    client.select db
    return client

module.exports = RedisClient
