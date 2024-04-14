import RedisClient from '../lib/redis_client.js';
import * as baseChai from 'chai';
import chaiSpies from 'chai-spies';
import chaiChanges from 'chai-changes';

process.env.NEW_RELIC_ENABLED = false;

process.env.NEW_RELIC_NO_CONFIG_FILE = true;

process.env.NEW_RELIC_LOG = '/dev/null';

process.env.SUGAR_TEST = true;

process.env.SUGAR_REDIS_DB = 9;

process.env.SUGAR_TALK_USERNAME = 'testUser';

process.env.SUGAR_TALK_PASSWORD = 'testPass';

process.env.PANOPTES_HOST = 'http://sugar_test.panoptes';

const redis = new RedisClient();
redis.connect();

const chai = {
  ...baseChai,
  ...baseChai.use(chaiSpies),
  ...baseChai.use(chaiChanges)
};

global.chai = chai;
global.expect = chai.expect;

beforeEach(function() {
  return redis.flushAll();
});
