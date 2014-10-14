config = require('../knexfile').test
conn = config.connection
process.env.SUGAR_DB = "postgres://#{ conn.user }:#{ conn.password }@#{ conn.host }/#{ conn.database }"
process.env.SUGAR_REDIS_DB = 9

RedisClient = require '../lib/redis_client'
redis = new RedisClient()

Knex = require 'knex'
knex = new Knex config

chai = require 'chai'
chai.use require 'chai-as-promised'
chai.use require 'chai-http'
chai.use require 'chai-spies'

beforeEach ->
  knex('notifications').del().then ->
    knex('announcements').del().then ->
      redis.flushallAsync()
