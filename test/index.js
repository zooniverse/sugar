var PanoptesServer, RedisClient, chai, nock, redis;

process.env.NEW_RELIC_ENABLED = false;

process.env.NEW_RELIC_NO_CONFIG_FILE = true;

process.env.NEW_RELIC_LOG = '/dev/null';

process.env.SUGAR_TEST = true;

process.env.SUGAR_REDIS_DB = 9;

process.env.SUGAR_TALK_USERNAME = 'testUser';

process.env.SUGAR_TALK_PASSWORD = 'testPass';

process.env.PANOPTES_HOST = 'http://sugar_test.panoptes';

RedisClient = require('../lib/redis_client');

redis = new RedisClient();
redis.connect();

PanoptesServer = require('./support/panoptes_server');

PanoptesServer.mock({
  persist: true
});

chai = require('chai');

chai.use(require('chai-as-promised'));

chai.use(require('chai-http'));

chai.use(require('chai-spies'));

chai.use(require('chai-changes'));

nock = require('nock');

nock.disableNetConnect();

nock.enableNetConnect('localhost');

beforeEach(function() {
  return redis.flushAll();
});
