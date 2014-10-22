config = require('../knexfile').test
conn = config.connection
process.env.SUGAR_TEST = true
process.env.SUGAR_DB = "postgres://#{ conn.user }:#{ conn.password }@#{ conn.host }/#{ conn.database }"
process.env.SUGAR_REDIS_DB = 9
process.env.PANOPTES_HOST = 'http://sugar_test.panoptes'
Bluebird = require 'bluebird'

RedisClient = require '../lib/redis_client'
redis = new RedisClient()

Knex = require 'knex'
knex = new Knex config

PanoptesServer = require './support/panoptes_server'
PanoptesServer.mock persist: true

chai = require 'chai'
chai.use require 'chai-as-promised'
chai.use require 'chai-http'
chai.use require 'chai-spies'
chai.use require 'chai-changes'

beforeEach ->
  Bluebird.all [
    knex('notifications').del()
    knex('announcements').del()
    redis.flushallAsync()
  ]
