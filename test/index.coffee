process.env.SUGAR_TEST = true
process.env.SUGAR_REDIS_DB = 9
process.env.PANOPTES_HOST = 'http://sugar_test.panoptes'
Bluebird = require 'bluebird'

RedisClient = require '../lib/redis_client'
redis = new RedisClient()

PanoptesServer = require './support/panoptes_server'
PanoptesServer.mock persist: true

chai = require 'chai'
chai.use require 'chai-as-promised'
chai.use require 'chai-http'
chai.use require 'chai-spies'
chai.use require 'chai-changes'

nock = require 'nock'
nock.disableNetConnect()
nock.enableNetConnect 'localhost'

beforeEach ->
  redis.flushallAsync()
