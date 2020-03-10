Bluebird = require 'bluebird'
Redis = Bluebird.promisifyAll require('redis')

class RedisClient
  constructor: ->
    port = process.env.SUGAR_REDIS_PORT_6379_TCP_PORT
    port or= process.env.SUGAR_REDIS_PORT
    port or= 6379

    host = process.env.SUGAR_REDIS_PORT_6379_TCP_ADDR
    host or= process.env.SUGAR_REDIS_HOST
    host or= '127.0.0.1'

    auth = process.env.SUGAR_REDIS_AUTH
    db = process.env.SUGAR_REDIS_DB or 1

    client = Redis.createClient(port, host, {auth_pass: auth, tls: {servername: host}})
    client.select db
    return client

module.exports = RedisClient
